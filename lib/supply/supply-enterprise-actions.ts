"use server";

/**
 * Fase 25 — Server actions Supply Chain Enterprise (RBAC + tenant isolation).
 */

import { getCurrentProfile } from "@/lib/auth/session";
import {
  createEnterpriseContext,
  createRbacSupabaseAdapter,
} from "@/lib/enterprise";
import {
  buildExecutiveSupplyBundle,
  buildSupplyEnterpriseSnapshotFromSources,
  emptySupplyEnterpriseSnapshot,
  isSupplyEnterpriseEnabled,
  sanitizeSupplyFilter,
  supplyEnterpriseDrillDown,
  type SupplyFilterInput,
  type SupplyKpiId,
  type SupplyProductBalance,
} from "@/lib/supply";
import type { InventoryCycleKind } from "@/lib/supply/enterprise/inventory-model";
import {
  createInventoryCycle,
  listInventoryCycles,
  probeInventorySchema,
  summarizeOpenInventoryDivergences,
} from "@/lib/supply/enterprise/inventory-service";
import {
  createPurchaseOrder,
  listPurchaseOrders,
  probePurchaseSchema,
  summarizePurchasesMonth,
  transitionPurchaseOrder,
} from "@/lib/supply/enterprise/purchase-service";
import type { PurchaseWorkflowStatus } from "@/lib/supply/enterprise/types";
import {
  createDeposito,
  listDepositos,
} from "@/lib/supply/enterprise/warehouse-service";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

async function resolveSupplyAuth(
  tenantSlug: string,
  needed: readonly string[],
) {
  if (!isSupplyEnterpriseEnabled()) {
    throw new Error("Supply Enterprise desabilitado por feature flag.");
  }
  const tenant = await requireTenant(tenantSlug);
  const profile = await getCurrentProfile();
  if (!profile?.id) throw new Error("Sessão ausente.");

  const client = await createClient();
  const rbac = createRbacSupabaseAdapter(client);
  const snap = await rbac.resolveAuthorizationSnapshot(tenant.id, profile.id);
  const permissions = snap.permissions ?? [];

  const ok = needed.some((p) => permissions.includes(p));
  if (!ok) {
    throw new Error(`Sem permissão (${needed.join(" | ")}).`);
  }

  const context = createEnterpriseContext({
    tenantId: tenant.id,
    userId: profile.id,
    roles: snap.roles ?? [],
    permissions,
    source: "server_action",
  });

  return { tenant, profile, client, context, permissions, tenantSlug };
}

function assertNoClientTenantId(options?: Record<string, unknown>) {
  if (!options) return;
  if ("tenantId" in options || "tenant_id" in options) {
    if (options.tenantId != null || options.tenant_id != null) {
      throw new Error(
        "tenantId do client é rejeitado — isolamento server-side.",
      );
    }
  }
}

function monthStartIso(d = new Date()): string {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1),
  ).toISOString();
}

async function loadSupplyProducts(
  client: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
): Promise<{
  products: SupplyProductBalance[];
  perdasValor: number | null;
  fornecedoresAtivos: number | null;
}> {
  let prodRows: Array<Record<string, unknown>> | null = null;
  {
    const first = await client
      .from("produtos")
      .select(
        "id, nome, sku, categoria, tipo, estoque_atual, estoque_minimo, estoque_maximo, estoque_seguranca, custo, preco_venda, fornecedor_principal, ativo",
      )
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .eq("ativo", true)
      .limit(2000);

    if (first.error) {
      const msg = first.error.message.toLowerCase();
      if (msg.includes("estoque_seguranca") || msg.includes("column")) {
        const fallback = await client
          .from("produtos")
          .select(
            "id, nome, sku, categoria, tipo, estoque_atual, estoque_minimo, estoque_maximo, custo, preco_venda, fornecedor_principal, ativo",
          )
          .eq("tenant_id", tenantId)
          .is("deleted_at", null)
          .eq("ativo", true)
          .limit(2000);
        if (fallback.error) throw new Error(fallback.error.message);
        prodRows = (fallback.data ?? []) as Array<Record<string, unknown>>;
      } else {
        throw new Error(first.error.message);
      }
    } else {
      prodRows = (first.data ?? []) as Array<Record<string, unknown>>;
    }
  }

  const limiar = new Date();
  limiar.setUTCDate(limiar.getUTCDate() - 90);
  const { data: movRows, error: movErr } = await client
    .from("estoque_movimentacoes")
    .select("produto_id, tipo, quantidade, created_at, motivo, origem")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .gte("created_at", limiar.toISOString())
    .limit(8000);

  if (movErr) throw new Error(movErr.message);

  const now = Date.now();
  const lastMov = new Map<string, number>();
  const saidas = new Map<string, number>();
  let perdasQty = 0;
  let perdasAny = false;

  for (const m of movRows ?? []) {
    const ts = new Date(m.created_at).getTime();
    const prev = lastMov.get(m.produto_id) ?? 0;
    if (ts > prev) lastMov.set(m.produto_id, ts);
    if (m.tipo === "saida") {
      saidas.set(
        m.produto_id,
        (saidas.get(m.produto_id) ?? 0) + Number(m.quantidade),
      );
    }
    const motivo = (m.motivo ?? "").toLowerCase();
    const origem = (m.origem ?? "").toLowerCase();
    if (motivo.includes("perda") || origem.includes("perda")) {
      perdasAny = true;
      perdasQty += Number(m.quantidade) || 0;
    }
  }

  const costById = new Map<string, number | null>();
  const products: SupplyProductBalance[] = (prodRows ?? []).map((raw) => {
    const p = raw as {
      id: string;
      nome: string;
      sku: string | null;
      categoria: string | null;
      tipo: string;
      estoque_atual: number;
      estoque_minimo: number | null;
      estoque_maximo: number | null;
      estoque_seguranca?: number | null;
      custo: number | null;
      preco_venda: number | null;
      fornecedor_principal: string | null;
    };
    const custo = p.custo == null ? null : Number(p.custo);
    costById.set(p.id, custo);
    const saldo = Number(p.estoque_atual);
    const last = lastMov.get(p.id);
    const dias =
      last != null ? Math.floor((now - last) / (24 * 60 * 60 * 1000)) : null;
    return {
      produtoId: p.id,
      nome: p.nome,
      sku: p.sku,
      categoria: p.categoria,
      tipo: p.tipo,
      saldo,
      minimo: p.estoque_minimo == null ? null : Number(p.estoque_minimo),
      maximo: p.estoque_maximo == null ? null : Number(p.estoque_maximo),
      seguranca:
        p.estoque_seguranca != null ? Number(p.estoque_seguranca) : null,
      custo,
      precoVenda: p.preco_venda == null ? null : Number(p.preco_venda),
      fornecedorPrincipal: p.fornecedor_principal,
      diasSemMovimentacao: dias,
      saidasPeriodo: saidas.get(p.id) ?? 0,
      valorEstoque:
        custo != null && Number.isFinite(custo) ? custo * saldo : null,
    };
  });

  let perdasValor: number | null = null;
  if (perdasAny) {
    let v = 0;
    let any = false;
    for (const m of movRows ?? []) {
      const motivo = (m.motivo ?? "").toLowerCase();
      const origem = (m.origem ?? "").toLowerCase();
      if (!(motivo.includes("perda") || origem.includes("perda"))) continue;
      const c = costById.get(m.produto_id);
      if (c != null && Number.isFinite(c)) {
        v += c * Number(m.quantidade);
        any = true;
      }
    }
    perdasValor = any ? v : null;
    void perdasQty;
  }

  const { count } = await client
    .from("fornecedores")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("ativo", true)
    .is("deleted_at", null);

  return {
    products,
    perdasValor,
    fornecedoresAtivos: count ?? null,
  };
}

export async function getExecutiveSupplyDashboard(
  tenantSlug: string,
  filters?: SupplyFilterInput,
) {
  assertNoClientTenantId(filters as Record<string, unknown> | undefined);
  const auth = await resolveSupplyAuth(tenantSlug, [
    "estoque.visualizar",
    "compras.visualizar",
    "dashboard.estoque",
    "supply.dashboard.visualizar",
  ]);

  const filter = sanitizeSupplyFilter(filters);
  const health: Record<
    string,
    { status: "ok" | "error" | "empty"; message: string }
  > = {};

  let products: SupplyProductBalance[] = [];
  let fornecedoresAtivos: number | null = null;
  let perdasValor: number | null = null;

  try {
    const loaded = await loadSupplyProducts(auth.client, auth.tenant.id);
    products = loaded.products;
    if (filter.categoria) {
      products = products.filter((p) => p.categoria === filter.categoria);
    }
    if (filter.fornecedorId) {
      // fornecedor_principal ainda é texto no schema legado — filtro UUID só pós-migration FK
      products = products;
    }
    fornecedoresAtivos = loaded.fornecedoresAtivos;
    perdasValor = loaded.perdasValor;
    health.estoque = {
      status: products.length ? "ok" : "empty",
      message: "produtos + estoque_movimentacoes",
    };
  } catch (e) {
    health.estoque = {
      status: "error",
      message: e instanceof Error ? e.message : "Falha estoque",
    };
  }

  let purchaseReady = false;
  let warehouseReady = false;
  let purchases = {
    solicitacoesAbertas: null as number | null,
    pedidosAbertos: null as number | null,
    pedidosMes: null as number | null,
    valorPedidosMes: null as number | null,
    recebimentosPendentes: null as number | null,
  };
  let inventory = {
    ciclosAbertos: null as number | null,
    divergencias: null as number | null,
    ajustesPendentes: null as number | null,
  };

  try {
    const probe = await probePurchaseSchema(auth.client, auth.tenant.id);
    purchaseReady = probe.ready;
    health.compras = {
      status: probe.ready ? "ok" : "empty",
      message: probe.ready
        ? "compras_pedidos"
        : "Migration 20260813 pendente",
    };
    if (probe.ready) {
      const sum = await summarizePurchasesMonth(
        auth.client,
        auth.tenant.id,
        monthStartIso(),
      );
      purchases = {
        solicitacoesAbertas: null,
        pedidosAbertos: sum.pedidosAbertos,
        pedidosMes: sum.pedidosMes,
        valorPedidosMes: sum.valorPedidosMes,
        recebimentosPendentes: null,
      };
    }
  } catch (e) {
    health.compras = {
      status: "error",
      message: e instanceof Error ? e.message : "Falha compras",
    };
  }

  try {
    const dep = await listDepositos(auth.client, auth.tenant.id);
    warehouseReady = dep.ready;
    health.almoxarifado = {
      status: dep.ready ? "ok" : "empty",
      message: dep.ready ? "estoque_depositos" : "Migration 20260813 pendente",
    };
  } catch (e) {
    health.almoxarifado = {
      status: "error",
      message: e instanceof Error ? e.message : "Falha almoxarifado",
    };
  }

  try {
    const probe = await probeInventorySchema(auth.client, auth.tenant.id);
    health.inventario = {
      status: probe.ready ? "ok" : "empty",
      message: probe.ready
        ? "estoque_inventarios"
        : "Migration 20260813 pendente",
    };
    if (probe.ready) {
      const inv = await summarizeOpenInventoryDivergences(
        auth.client,
        auth.tenant.id,
      );
      inventory = {
        ciclosAbertos: inv.ciclosAbertos,
        divergencias: inv.divergencias,
        ajustesPendentes: inv.divergencias,
      };
    }
  } catch (e) {
    health.inventario = {
      status: "error",
      message: e instanceof Error ? e.message : "Falha inventário",
    };
  }

  const snap =
    health.estoque?.status === "error" && products.length === 0
      ? {
          ...emptySupplyEnterpriseSnapshot(auth.tenant.id, tenantSlug),
          filter,
          health,
          warehouseReady,
          purchaseWorkflowReady: purchaseReady,
        }
      : buildSupplyEnterpriseSnapshotFromSources({
          tenantId: auth.tenant.id,
          tenantSlug,
          filter,
          products,
          purchases,
          inventory,
          fornecedoresAtivos,
          perdasValor,
          warehouseReady,
          purchaseWorkflowReady: purchaseReady,
          health,
        });

  return buildExecutiveSupplyBundle({
    snap,
    permissions: auth.permissions,
  });
}

export async function getSupplyKpiDrillDown(
  tenantSlug: string,
  definitionId: SupplyKpiId,
) {
  const auth = await resolveSupplyAuth(tenantSlug, [
    "estoque.visualizar",
    "compras.visualizar",
  ]);
  const loaded = await loadSupplyProducts(auth.client, auth.tenant.id);
  const snap = buildSupplyEnterpriseSnapshotFromSources({
    tenantId: auth.tenant.id,
    tenantSlug,
    products: loaded.products,
    fornecedoresAtivos: loaded.fornecedoresAtivos,
    perdasValor: loaded.perdasValor,
  });
  return supplyEnterpriseDrillDown(snap, definitionId);
}

export async function listSupplyPurchaseOrdersAction(tenantSlug: string) {
  const auth = await resolveSupplyAuth(tenantSlug, [
    "compras.visualizar",
    "estoque.visualizar",
  ]);
  return listPurchaseOrders(auth.client, auth.tenant.id);
}

export async function createSupplyPurchaseOrderAction(
  tenantSlug: string,
  input: {
    fornecedorId?: string | null;
    lines: Array<{
      produtoId: string;
      quantidade: number;
      precoUnitario: number | null;
      fornecedorId: string | null;
    }>;
    observacoes?: string | null;
  },
) {
  assertNoClientTenantId(input as unknown as Record<string, unknown>);
  const auth = await resolveSupplyAuth(tenantSlug, ["compras.criar"]);
  return createPurchaseOrder(auth.client, {
    tenantId: auth.tenant.id,
    userId: auth.profile.id,
    fornecedorId: input.fornecedorId,
    lines: input.lines,
    observacoes: input.observacoes,
  });
}

export async function transitionSupplyPurchaseOrderAction(
  tenantSlug: string,
  pedidoId: string,
  toStatus: PurchaseWorkflowStatus,
  nota?: string | null,
) {
  const neededByStatus: Record<string, readonly string[]> = {
    solicitacao: ["compras.criar", "compras.editar"],
    aprovacao: ["compras.aprovar"],
    cotacao: ["compras.editar"],
    comparacao: ["compras.editar"],
    pedido: ["compras.editar", "compras.aprovar"],
    recebimento: ["compras.receber"],
    conferencia: ["compras.receber"],
    integrado: ["compras.receber", "compras.aprovar"],
    cancelado: ["compras.cancelar", "compras.editar"],
  };
  const needed = neededByStatus[toStatus] ?? ["compras.editar"];
  const auth = await resolveSupplyAuth(tenantSlug, needed);
  return transitionPurchaseOrder(auth.client, {
    tenantId: auth.tenant.id,
    userId: auth.profile.id,
    pedidoId,
    toStatus,
    nota,
  });
}

export async function listSupplyDepositosAction(tenantSlug: string) {
  const auth = await resolveSupplyAuth(tenantSlug, ["estoque.visualizar"]);
  return listDepositos(auth.client, auth.tenant.id);
}

export async function createSupplyDepositoAction(
  tenantSlug: string,
  input: { nome: string; codigo: string },
) {
  const auth = await resolveSupplyAuth(tenantSlug, [
    "estoque.criar",
    "estoque.editar",
    "supply.configurar",
  ]);
  return createDeposito(auth.client, {
    tenantId: auth.tenant.id,
    userId: auth.profile.id,
    nome: input.nome,
    codigo: input.codigo,
  });
}

export async function listSupplyInventoryCyclesAction(tenantSlug: string) {
  const auth = await resolveSupplyAuth(tenantSlug, [
    "estoque.inventariar",
    "estoque.visualizar",
  ]);
  return listInventoryCycles(auth.client, auth.tenant.id);
}

export async function createSupplyInventoryCycleAction(
  tenantSlug: string,
  kind: InventoryCycleKind,
) {
  const auth = await resolveSupplyAuth(tenantSlug, ["estoque.inventariar"]);
  return createInventoryCycle(auth.client, {
    tenantId: auth.tenant.id,
    userId: auth.profile.id,
    kind,
  });
}
