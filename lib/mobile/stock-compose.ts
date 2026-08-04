import "server-only";

/**
 * Sprint 31.5 — Compose Estoque / Compras Mobile.
 * Orquestra EstoqueDashboardService, EstoqueService, ProdutoService,
 * listPurchaseOrders, inventário supply, FornecedorService, suggestReposicao.
 * Sem novas fórmulas de estoque/compras.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { formatCurrencyCompact } from "@/lib/dashboard/format";
import { suggestReposicao } from "@/lib/estoque/abc/abc-curve";
import { EstoqueDashboardService } from "@/lib/estoque/estoque-dashboard-service";
import { EstoqueService } from "@/lib/estoque/estoque-service";
import { FornecedorService } from "@/lib/financeiro/fornecedor-service";
import { ProdutoService } from "@/lib/produtos/produto-service";
import {
  listInventoryCycles,
  summarizeOpenInventoryDivergences,
} from "@/lib/supply/enterprise/inventory-service";
import { listPurchaseOrders } from "@/lib/supply/enterprise/purchase-service";
import { supplyClient } from "@/lib/supply/enterprise/supabase-table";
import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import type { MovimentacaoTipo } from "@/types/estoque";

export function resolveStockDataClient(
  userClient: SupabaseClient<Database>,
): SupabaseClient<Database> {
  if (isAdminClientAvailable()) return createAdminClient();
  return userClient;
}

async function soft<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

function hasPerm(permissions: readonly string[], key: string): boolean {
  return permissions.includes("*") || permissions.includes(key);
}

export function canViewStock(permissions: readonly string[]): boolean {
  return (
    hasPerm(permissions, "estoque.visualizar") ||
    hasPerm(permissions, "produtos.visualizar") ||
    hasPerm(permissions, "compras.visualizar") ||
    hasPerm(permissions, "fornecedores.visualizar") ||
    hasPerm(permissions, "supply.dashboard.visualizar") ||
    hasPerm(permissions, "dashboard.estoque")
  );
}

function assertStockView(permissions: readonly string[]) {
  if (!canViewStock(permissions)) throw new Error("FORBIDDEN_STOCK");
}

function money(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  return formatCurrencyCompact(n);
}

function qty(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return String(n);
}

export type MobileStockQuickAction = {
  id: string;
  label: string;
  href: string;
  permission: string | null;
  enabled: boolean;
  opensWeb: boolean;
};

export type MobileStockAlert = {
  id: string;
  title: string;
  description: string;
  priority: string;
  category: string;
  href: string | null;
};

export type MobileStockDashboard = {
  generatedAt: string;
  updatedAtLabel: string;
  kpis: {
    produtosCadastrados: number | null;
    valorEstoque: string | null;
    produtosCriticos: number | null;
    semEstoque: number | null;
    reposicaoUrgente: number | null;
    comprasAbertas: number | null;
  };
  recentMovements: Array<{
    id: string;
    tipo: string;
    produtoNome: string;
    quantidade: string;
    at: string;
  }>;
  alerts: MobileStockAlert[];
  quickActions: MobileStockQuickAction[];
  unavailable: string[];
};

export type MobileStockProductListItem = {
  id: string;
  nome: string;
  sku: string | null;
  categoria: string | null;
  marca: string | null;
  fornecedor: string | null;
  status: string;
  estoque: string;
  preco: string | null;
  critico: boolean;
};

export type MobileStockProductList = {
  items: MobileStockProductListItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export type MobileStockProductDetail = {
  id: string;
  nome: string;
  fields: Array<{ label: string; value: string }>;
  tags: string[];
};

export type MobileStockCategory = {
  label: string;
  valor: string | null;
  countHint: string | null;
};

export type MobileStockMovementItem = {
  id: string;
  tipo: string;
  produtoNome: string;
  sku: string | null;
  quantidade: string;
  motivo: string | null;
  origem: string;
  at: string;
};

export type MobileStockMovements = {
  items: MobileStockMovementItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export type MobileStockInventory = {
  ready: boolean;
  ciclosAbertos: number | null;
  divergencias: number | null;
  ultimaConferencia: string | null;
  cycles: Array<{
    id: string;
    kind: string;
    status: string;
    createdAt: string;
  }>;
  criticalHints: string[];
  unavailable: boolean;
};

export type MobileStockPurchaseItem = {
  id: string;
  numero: string;
  status: string;
  fornecedorId: string | null;
  valor: string | null;
  dataNecessidade: string | null;
  createdAt: string;
};

export type MobileStockPurchases = {
  ready: boolean;
  items: MobileStockPurchaseItem[];
  unavailable: boolean;
};

export type MobileStockPurchaseDetail = {
  id: string;
  numero: string;
  status: string;
  valor: string | null;
  dataNecessidade: string | null;
  createdAt: string;
  fornecedorId: string | null;
  items: Array<{ label: string; qty: string; valor: string | null }>;
  fields: Array<{ label: string; value: string }>;
};

export type MobileStockSupplierItem = {
  id: string;
  nome: string;
  contato: string | null;
  cidade: string | null;
  categoria: string | null;
  ativo: boolean;
  comprasRecentes: number | null;
  valorComprado: string | null;
};

export type MobileStockSuppliers = {
  items: MobileStockSupplierItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export type MobileStockReposicaoItem = {
  produtoId: string;
  label: string;
  estoqueAtual: string;
  estoqueMinimo: string;
  quantidadeSugerida: string;
  pontoReposicao: string;
};

function buildQuickActions(
  slug: string,
  permissions: readonly string[],
): MobileStockQuickAction[] {
  const web = (path: string) => `/${slug}${path}`;
  const actions: MobileStockQuickAction[] = [
    {
      id: "produtos",
      label: "Produtos",
      href: "/estoque/produtos",
      permission: "produtos.visualizar",
      enabled:
        hasPerm(permissions, "produtos.visualizar") ||
        hasPerm(permissions, "estoque.visualizar"),
      opensWeb: false,
    },
    {
      id: "compras",
      label: "Compras",
      href: "/estoque/compras",
      permission: "compras.visualizar",
      enabled: hasPerm(permissions, "compras.visualizar"),
      opensWeb: false,
    },
    {
      id: "inventario",
      label: "Inventário",
      href: "/estoque/inventario",
      permission: "estoque.inventariar",
      enabled:
        hasPerm(permissions, "estoque.inventariar") ||
        hasPerm(permissions, "estoque.visualizar"),
      opensWeb: false,
    },
    {
      id: "fornecedores",
      label: "Fornecedores",
      href: "/estoque/fornecedores",
      permission: "fornecedores.visualizar",
      enabled: hasPerm(permissions, "fornecedores.visualizar"),
      opensWeb: false,
    },
    {
      id: "movimentacoes",
      label: "Movimentações",
      href: "/estoque/movimentacoes",
      permission: "estoque.movimentar",
      enabled:
        hasPerm(permissions, "estoque.movimentar") ||
        hasPerm(permissions, "estoque.visualizar"),
      opensWeb: false,
    },
    {
      id: "web-estoque",
      label: "Abrir Estoque web",
      href: web("/estoque"),
      permission: "estoque.visualizar",
      enabled: hasPerm(permissions, "estoque.visualizar"),
      opensWeb: true,
    },
    {
      id: "web-compras",
      label: "Abrir Compras web",
      href: web("/compras"),
      permission: "compras.visualizar",
      enabled: hasPerm(permissions, "compras.visualizar"),
      opensWeb: true,
    },
  ];
  return actions;
}

export async function composeStockDashboard(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  tenantSlug: string;
  permissions: readonly string[];
}): Promise<MobileStockDashboard> {
  assertStockView(input.permissions);
  const client = resolveStockDataClient(input.client);
  const dashSvc = new EstoqueDashboardService(client, input.tenantId);
  const estSvc = new EstoqueService(client, input.tenantId);

  const [dash, movs, purchases, alertasBaixo] = await Promise.all([
    soft(() =>
      dashSvc.getData({ tenantSlug: input.tenantSlug }),
    ),
    soft(() =>
      estSvc.listMovimentacoes({ page: 1, perPage: 8, sort: "created_at", order: "desc" }),
    ),
    soft(() => listPurchaseOrders(client, input.tenantId, { limit: 80 })),
    soft(() => estSvc.listAlertasEstoqueBaixo()),
  ]);

  const unavailable: string[] = [];
  if (!dash) unavailable.push("dashboard");
  if (!movs) unavailable.push("movimentacoes");
  if (!purchases) unavailable.push("compras");

  const openStatuses = new Set([
    "solicitacao",
    "rascunho",
    "aprovacao",
    "aprovado",
    "pedido",
    "parcial",
    "em_transito",
  ]);
  const comprasAbertas =
    purchases?.rows.filter((r) => openStatuses.has(String(r.status))).length ??
    null;

  const reposicaoUrgente = alertasBaixo?.length ?? dash?.kpis.abaixoMinimo ?? null;

  const alerts: MobileStockAlert[] = [];
  for (const a of dash?.alertas?.slice(0, 20) ?? []) {
    alerts.push({
      id: `${a.tipo}-${a.titulo}`.slice(0, 80),
      title: a.titulo,
      description:
        a.tipo === "zerado"
          ? "Produto sem estoque"
          : a.tipo === "critico"
            ? "Abaixo do mínimo"
            : a.tipo,
      priority:
        a.tipo === "zerado" || a.tipo === "critico" ? "alta" : "media",
      category: a.tipo,
      href: a.href ?? null,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    updatedAtLabel: dash?.syncedAt
      ? new Date(dash.syncedAt).toLocaleString("pt-BR")
      : new Date().toLocaleString("pt-BR"),
    kpis: {
      produtosCadastrados: dash?.kpis.quantidadeProdutos ?? null,
      valorEstoque: money(dash?.kpis.valorTotal),
      produtosCriticos: dash?.kpis.abaixoMinimo ?? null,
      semEstoque: dash?.kpis.zerados ?? null,
      reposicaoUrgente,
      comprasAbertas: purchases?.ready === false ? null : comprasAbertas,
    },
    recentMovements: (movs?.data ?? []).map((m) => ({
      id: m.id,
      tipo: m.tipo,
      produtoNome: m.produto?.nome ?? "Produto",
      quantidade: qty(m.quantidade),
      at: m.created_at,
    })),
    alerts,
    quickActions: buildQuickActions(input.tenantSlug, input.permissions),
    unavailable,
  };
}

export async function composeStockProducts(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
  search?: string;
  categoria?: string;
  marca?: string;
  fornecedor?: string;
  status?: "all" | "ativo" | "inativo";
  page?: number;
}): Promise<MobileStockProductList> {
  assertStockView(input.permissions);
  if (
    !hasPerm(input.permissions, "produtos.visualizar") &&
    !hasPerm(input.permissions, "estoque.visualizar") &&
    !hasPerm(input.permissions, "*")
  ) {
    throw new Error("FORBIDDEN_STOCK");
  }

  const client = resolveStockDataClient(input.client);
  const svc = new ProdutoService(client, input.tenantId);
  const estSvc = new EstoqueService(client, input.tenantId);
  const ativo =
    input.status === "ativo"
      ? true
      : input.status === "inativo"
        ? false
        : "all";

  const searchParts = [
    input.search?.trim(),
    input.marca?.trim(),
    input.fornecedor?.trim(),
  ].filter(Boolean);
  const search = searchParts.length ? searchParts.join(" ") : undefined;

  const [result, alertas] = await Promise.all([
    svc.list({
      page: input.page ?? 1,
      perPage: 40,
      search,
      categoria: input.categoria,
      ativo,
      tipo: "produto",
    }),
    soft(() => estSvc.listAlertasEstoqueBaixo()),
  ]);

  const criticoIds = new Set((alertas ?? []).map((a) => a.id));

  let items = result.data.map((p) => ({
    id: p.id,
    nome: p.nome,
    sku: p.sku,
    categoria: p.categoria,
    marca: p.marca,
    fornecedor: null as string | null,
    status: p.ativo ? "ativo" : "inativo",
    estoque: qty(p.estoque_atual),
    preco: money(p.preco_venda),
    critico: criticoIds.has(p.id) || Number(p.estoque_atual) <= 0,
  }));

  if (input.marca?.trim()) {
    const m = input.marca.trim().toLowerCase();
    items = items.filter((i) => (i.marca ?? "").toLowerCase().includes(m));
  }

  return {
    items,
    total: result.total,
    page: result.page,
    perPage: result.perPage,
    totalPages: result.totalPages,
  };
}

export async function composeStockProductDetail(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
  id: string;
}): Promise<MobileStockProductDetail> {
  assertStockView(input.permissions);
  const client = resolveStockDataClient(input.client);
  const svc = new ProdutoService(client, input.tenantId);
  const p = await svc.getById(input.id);
  if (!p) throw new Error("NOT_FOUND");

  const canCost =
    hasPerm(input.permissions, "estoque.ver_custo") ||
    hasPerm(input.permissions, "*");

  const fields: Array<{ label: string; value: string }> = [
    { label: "SKU", value: p.sku ?? "—" },
    { label: "Código interno", value: p.codigo_interno ?? "—" },
    { label: "Categoria", value: p.categoria ?? "—" },
    { label: "Marca", value: p.marca ?? "—" },
    { label: "Fornecedor", value: p.fornecedor_principal ?? "—" },
    { label: "Estoque atual", value: qty(p.estoque_atual) },
    { label: "Mínimo", value: qty(p.estoque_minimo) },
    { label: "Máximo", value: qty(p.estoque_maximo) },
    { label: "Unidade", value: p.unidade_medida || "—" },
    { label: "Preço venda", value: money(p.preco_venda) ?? "—" },
    {
      label: "Custo",
      value: canCost ? money(p.custo) ?? "—" : "Restrito",
    },
    { label: "Status", value: p.ativo ? "Ativo" : "Inativo" },
    { label: "Localização", value: p.localizacao ?? "—" },
  ];

  const tags: string[] = [];
  if (p.tipo) tags.push(p.tipo);
  if (
    p.estoque_minimo != null &&
    Number(p.estoque_atual) < Number(p.estoque_minimo)
  ) {
    tags.push("crítico");
  }
  if (Number(p.estoque_atual) <= 0) tags.push("zerado");

  return { id: p.id, nome: p.nome, fields, tags };
}

export async function composeStockCategories(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  tenantSlug: string;
  permissions: readonly string[];
}): Promise<{ items: MobileStockCategory[] }> {
  assertStockView(input.permissions);
  const client = resolveStockDataClient(input.client);
  const dash = await soft(() =>
    new EstoqueDashboardService(client, input.tenantId).getData({
      tenantSlug: input.tenantSlug,
    }),
  );
  return {
    items: (dash?.porCategoria ?? []).map((c) => ({
      label: c.label,
      valor: money(c.valor),
      countHint: null,
    })),
  };
}

export async function composeStockMovements(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
  search?: string;
  tipo?: MovimentacaoTipo | "all";
  page?: number;
}): Promise<MobileStockMovements> {
  assertStockView(input.permissions);
  const client = resolveStockDataClient(input.client);
  const svc = new EstoqueService(client, input.tenantId);
  const result = await svc.listMovimentacoes({
    page: input.page ?? 1,
    perPage: 40,
    search: input.search,
    tipo: input.tipo ?? "all",
    sort: "created_at",
    order: "desc",
  });

  return {
    items: result.data.map((m) => ({
      id: m.id,
      tipo: m.tipo,
      produtoNome: m.produto?.nome ?? "Produto",
      sku: m.produto?.sku ?? null,
      quantidade: qty(m.quantidade),
      motivo: m.motivo,
      origem: m.origem,
      at: m.created_at,
    })),
    total: result.total,
    page: result.page,
    perPage: result.perPage,
    totalPages: result.totalPages,
  };
}

export async function composeStockInventory(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
}): Promise<MobileStockInventory> {
  assertStockView(input.permissions);
  const client = resolveStockDataClient(input.client);

  const [cycles, summary, alertas] = await Promise.all([
    soft(() => listInventoryCycles(client, input.tenantId)),
    soft(() => summarizeOpenInventoryDivergences(client, input.tenantId)),
    soft(() =>
      new EstoqueService(client, input.tenantId).listAlertasEstoqueBaixo(),
    ),
  ]);

  const unavailable = !cycles || cycles.ready === false;
  const last = cycles?.rows?.[0]?.created_at ?? null;

  return {
    ready: cycles?.ready !== false && summary?.ready !== false,
    ciclosAbertos: summary?.ciclosAbertos ?? null,
    divergencias: summary?.divergencias ?? null,
    ultimaConferencia: last,
    cycles: (cycles?.rows ?? []).slice(0, 20).map((c) => ({
      id: c.id,
      kind: c.kind,
      status: c.status,
      createdAt: c.created_at,
    })),
    criticalHints: (alertas ?? [])
      .slice(0, 8)
      .map((a) => `${a.nome}: estoque ${a.estoque_atual} (mín. ${a.estoque_minimo})`),
    unavailable,
  };
}

export async function composeStockPurchases(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
  status?: string;
}): Promise<MobileStockPurchases> {
  assertStockView(input.permissions);
  if (
    !hasPerm(input.permissions, "compras.visualizar") &&
    !hasPerm(input.permissions, "estoque.visualizar") &&
    !hasPerm(input.permissions, "*")
  ) {
    throw new Error("FORBIDDEN_STOCK");
  }

  const client = resolveStockDataClient(input.client);
  const result = await soft(() =>
    listPurchaseOrders(client, input.tenantId, {
      status: input.status,
      limit: 80,
    }),
  );

  if (!result) {
    return { ready: false, items: [], unavailable: true };
  }

  return {
    ready: result.ready,
    unavailable: !result.ready,
    items: result.rows.map((r) => ({
      id: r.id,
      numero: r.numero != null ? String(r.numero) : r.id.slice(0, 8),
      status: r.status,
      fornecedorId: r.fornecedor_id,
      valor: money(r.valor_total == null ? null : Number(r.valor_total)),
      dataNecessidade: r.data_necessidade,
      createdAt: r.created_at,
    })),
  };
}

export async function composeStockPurchaseDetail(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
  id: string;
}): Promise<MobileStockPurchaseDetail> {
  assertStockView(input.permissions);
  const client = resolveStockDataClient(input.client);
  const db = supplyClient(client);

  const { data: pedido, error } = await db
    .from("compras_pedidos")
    .select(
      "id, status, fornecedor_id, valor_total, data_necessidade, created_at, numero, observacoes",
    )
    .eq("tenant_id", input.tenantId)
    .eq("id", input.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!pedido) throw new Error("NOT_FOUND");

  const { data: lines } = await db
    .from("compras_pedido_itens")
    .select("id, produto_id, quantidade, preco_unitario")
    .eq("tenant_id", input.tenantId)
    .eq("pedido_id", input.id)
    .limit(100);

  const produtoIds = [
    ...new Set(
      (lines ?? [])
        .map((l) => (l as { produto_id?: string | null }).produto_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const nomes = new Map<string, string>();
  if (produtoIds.length) {
    const { data: prods } = await client
      .from("produtos")
      .select("id, nome")
      .eq("tenant_id", input.tenantId)
      .in("id", produtoIds.slice(0, 100));
    for (const p of prods ?? []) nomes.set(p.id, p.nome);
  }

  return {
    id: pedido.id,
    numero:
      pedido.numero != null ? String(pedido.numero) : pedido.id.slice(0, 8),
    status: pedido.status,
    valor: money(
      pedido.valor_total == null ? null : Number(pedido.valor_total),
    ),
    dataNecessidade: pedido.data_necessidade,
    createdAt: pedido.created_at,
    fornecedorId: pedido.fornecedor_id,
    items: (lines ?? []).map((l) => {
      const row = l as {
        produto_id?: string | null;
        quantidade?: number | null;
        preco_unitario?: number | null;
      };
      return {
        label: nomes.get(row.produto_id ?? "") ?? "Item",
        qty: qty(row.quantidade),
        valor: money(
          row.preco_unitario == null ? null : Number(row.preco_unitario),
        ),
      };
    }),
    fields: [
      { label: "Status", value: pedido.status },
      {
        label: "Valor total",
        value:
          money(
            pedido.valor_total == null ? null : Number(pedido.valor_total),
          ) ?? "—",
      },
      {
        label: "Necessidade",
        value: pedido.data_necessidade ?? "—",
      },
      {
        label: "Observações",
        value: (pedido as { observacoes?: string | null }).observacoes ?? "—",
      },
    ],
  };
}

export async function composeStockSuppliers(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
  search?: string;
  page?: number;
}): Promise<MobileStockSuppliers> {
  assertStockView(input.permissions);
  if (
    !hasPerm(input.permissions, "fornecedores.visualizar") &&
    !hasPerm(input.permissions, "*")
  ) {
    throw new Error("FORBIDDEN_STOCK");
  }

  const client = resolveStockDataClient(input.client);
  const svc = new FornecedorService(client, input.tenantId);
  const [result, purchases] = await Promise.all([
    svc.list({
      page: input.page ?? 1,
      perPage: 40,
      search: input.search,
    }),
    soft(() => listPurchaseOrders(client, input.tenantId, { limit: 100 })),
  ]);

  const byFornecedor = new Map<string, { count: number; valor: number }>();
  for (const r of purchases?.rows ?? []) {
    if (!r.fornecedor_id) continue;
    const cur = byFornecedor.get(r.fornecedor_id) ?? { count: 0, valor: 0 };
    cur.count += 1;
    cur.valor += Number(r.valor_total ?? 0);
    byFornecedor.set(r.fornecedor_id, cur);
  }

  return {
    items: result.data.map((f) => {
      const stats = byFornecedor.get(f.id);
      return {
        id: f.id,
        nome: f.nome,
        contato: f.telefone || f.email || null,
        cidade: f.cidade
          ? `${f.cidade}${f.estado ? `/${f.estado}` : ""}`
          : null,
        categoria: null,
        ativo: f.ativo,
        comprasRecentes: stats?.count ?? null,
        valorComprado: stats ? money(stats.valor) : null,
      };
    }),
    total: result.total,
    page: result.page,
    perPage: result.perPage,
    totalPages: result.totalPages,
  };
}

export async function composeStockAlerts(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  tenantSlug: string;
  permissions: readonly string[];
}): Promise<{ alerts: MobileStockAlert[] }> {
  assertStockView(input.permissions);
  const client = resolveStockDataClient(input.client);
  const dashSvc = new EstoqueDashboardService(client, input.tenantId);
  const estSvc = new EstoqueService(client, input.tenantId);

  const [dash, baixo, inventory, purchases] = await Promise.all([
    soft(() => dashSvc.getData({ tenantSlug: input.tenantSlug })),
    soft(() => estSvc.listAlertasEstoqueBaixo()),
    soft(() => summarizeOpenInventoryDivergences(client, input.tenantId)),
    soft(() => listPurchaseOrders(client, input.tenantId, { limit: 50 })),
  ]);

  const alerts: MobileStockAlert[] = [];

  for (const a of dash?.alertas?.slice(0, 25) ?? []) {
    alerts.push({
      id: `dash-${a.tipo}-${a.titulo}`.slice(0, 100),
      title: a.titulo,
      description: a.tipo,
      priority: a.tipo === "zerado" ? "critica" : "alta",
      category: a.tipo,
      href: a.href ?? null,
    });
  }

  for (const p of baixo?.slice(0, 15) ?? []) {
    alerts.push({
      id: `repo-${p.id}`,
      title: `Reposição: ${p.nome}`,
      description: `Estoque ${p.estoque_atual} · mín. ${p.estoque_minimo}`,
      priority: "alta",
      category: "reposicao",
      href: `/${input.tenantSlug}/produtos/${p.id}`,
    });
  }

  if (inventory?.ready && (inventory.divergencias ?? 0) > 0) {
    alerts.push({
      id: "inv-div",
      title: "Inventário com divergências",
      description: `${inventory.divergencias} divergência(s) · ${inventory.ciclosAbertos} ciclo(s) aberto(s)`,
      priority: "media",
      category: "inventario",
      href: `/${input.tenantSlug}/compras/inventario`,
    });
  }

  const overdue = (purchases?.rows ?? []).filter((r) => {
    if (!r.data_necessidade) return false;
    const open = !["recebido", "cancelado", "concluido"].includes(r.status);
    return open && r.data_necessidade < new Date().toISOString().slice(0, 10);
  });
  for (const o of overdue.slice(0, 8)) {
    alerts.push({
      id: `compra-atraso-${o.id}`,
      title: `Compra atrasada #${o.numero ?? o.id.slice(0, 6)}`,
      description: `Necessidade ${o.data_necessidade} · status ${o.status}`,
      priority: "alta",
      category: "compra_atrasada",
      href: `/${input.tenantSlug}/compras/pedidos`,
    });
  }

  return { alerts };
}

export async function composeStockReposicao(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
}): Promise<{ items: MobileStockReposicaoItem[] }> {
  assertStockView(input.permissions);
  const client = resolveStockDataClient(input.client);
  const baixo = await soft(() =>
    new EstoqueService(client, input.tenantId).listAlertasEstoqueBaixo(),
  );

  const items: MobileStockReposicaoItem[] = [];
  for (const p of baixo ?? []) {
    const sug = suggestReposicao({
      produtoId: p.id,
      label: p.nome,
      estoqueAtual: Number(p.estoque_atual),
      estoqueMinimo: Number(p.estoque_minimo ?? 0),
      estoqueMaximo: p.estoque_maximo,
    });
    if (!sug) continue;
    items.push({
      produtoId: sug.produtoId,
      label: sug.label,
      estoqueAtual: qty(sug.estoqueAtual),
      estoqueMinimo: qty(sug.estoqueMinimo),
      quantidadeSugerida: qty(sug.quantidadeSugerida),
      pontoReposicao: qty(sug.pontoReposicao),
    });
  }

  return { items: items.slice(0, 40) };
}
