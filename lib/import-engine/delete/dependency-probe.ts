/**
 * Sprint 25.4.2/25.4.3 — Sondagem de dependências (tenant-scoped) para desfazer.
 * Regra 25.4.3: dependência não verificável → NÃO liberar exclusão destrutiva.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type DependencyProbeResult = {
  usedInSale: boolean;
  usedInOs: boolean;
  usedInBudget: boolean;
  laterMovements: boolean;
  currentQty: number;
  reserved: boolean;
  inInventory: boolean;
  fiscalOrFinanceLink: boolean;
  alreadySoftDeleted: boolean;
  tipo: string | null;
  nome: string | null;
  tenantOk: boolean;
  /** true = alguma dependência opcional não pôde ser verificada */
  dependenciesUnverified: boolean;
  unverifiedTables: string[];
};

async function probeOptionalCount(
  client: SupabaseClient,
  table: string,
  filter: { column: string; value: string },
  tenantId?: string,
): Promise<{ count: number; unverified: boolean }> {
  try {
    let q = client
      .from(table as never)
      .select("id", { count: "exact", head: true })
      .eq(filter.column, filter.value);
    if (tenantId) {
      q = q.eq("tenant_id", tenantId);
    }
    const { count, error } = await q;
    if (error) {
      return { count: 0, unverified: true };
    }
    return { count: count ?? 0, unverified: false };
  } catch {
    return { count: 0, unverified: true };
  }
}

export async function probeProductDependencies(
  client: SupabaseClient,
  tenantId: string,
  productId: string,
  importCreatedAt: string,
): Promise<DependencyProbeResult> {
  const { data: product } = await client
    .from("produtos")
    .select("id, tenant_id, estoque_atual, deleted_at, ativo, tipo, nome")
    .eq("id", productId)
    .maybeSingle();

  if (!product || product.tenant_id !== tenantId) {
    return {
      usedInSale: false,
      usedInOs: false,
      usedInBudget: false,
      laterMovements: false,
      currentQty: 0,
      reserved: false,
      inInventory: false,
      fiscalOrFinanceLink: false,
      alreadySoftDeleted: true,
      tipo: null,
      nome: null,
      tenantOk: false,
      dependenciesUnverified: false,
      unverifiedTables: [],
    };
  }

  const [{ count: saleCount }, { count: osCount }, { count: laterMov }] =
    await Promise.all([
      client
        .from("venda_itens")
        .select("id", { count: "exact", head: true })
        .eq("produto_id", productId),
      client
        .from("ordem_servico_itens")
        .select("id", { count: "exact", head: true })
        .eq("produto_id", productId),
      client
        .from("estoque_movimentacoes")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("produto_id", productId)
        .gt("created_at", importCreatedAt),
    ]);

  const unverifiedTables: string[] = [];
  const budget = await probeOptionalCount(client, "orcamento_itens", {
    column: "produto_id",
    value: productId,
  });
  if (budget.unverified) unverifiedTables.push("orcamento_itens");

  const reserved = await probeOptionalCount(
    client,
    "estoque_reservas",
    { column: "produto_id", value: productId },
    tenantId,
  );
  if (reserved.unverified) unverifiedTables.push("estoque_reservas");

  const inv = await probeOptionalCount(
    client,
    "estoque_inventario_itens",
    { column: "produto_id", value: productId },
    tenantId,
  );
  if (inv.unverified) unverifiedTables.push("estoque_inventario_itens");

  return {
    usedInSale: (saleCount ?? 0) > 0,
    usedInOs: (osCount ?? 0) > 0,
    usedInBudget: budget.count > 0,
    laterMovements: (laterMov ?? 0) > 0,
    currentQty: Number(product.estoque_atual ?? 0),
    reserved: reserved.count > 0,
    inInventory: inv.count > 0,
    fiscalOrFinanceLink: false,
    alreadySoftDeleted: Boolean(product.deleted_at),
    tipo: product.tipo ?? null,
    nome: product.nome ?? null,
    tenantOk: true,
    dependenciesUnverified: unverifiedTables.length > 0,
    unverifiedTables,
  };
}

export async function probeMovementDependencies(
  client: SupabaseClient,
  tenantId: string,
  movementId: string,
  importCreatedAt: string,
): Promise<{
  tenantOk: boolean;
  produtoId: string | null;
  quantidade: number;
  alreadyReversed: boolean;
  laterMovementsOnProduct: boolean;
  observacoes: string | null;
  dependenciesUnverified: boolean;
}> {
  const { data: mov } = await client
    .from("estoque_movimentacoes")
    .select("id, tenant_id, produto_id, quantidade, observacoes, created_at")
    .eq("id", movementId)
    .maybeSingle();

  if (!mov || mov.tenant_id !== tenantId) {
    return {
      tenantOk: false,
      produtoId: null,
      quantidade: 0,
      alreadyReversed: false,
      laterMovementsOnProduct: false,
      observacoes: null,
      dependenciesUnverified: false,
    };
  }

  const idemKey = `import-undo:`;
  const { count: reverseCount } = await client
    .from("estoque_movimentacoes")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("produto_id", mov.produto_id)
    .ilike("observacoes", `%${idemKey}%${movementId}%`);

  const { count: later } = await client
    .from("estoque_movimentacoes")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("produto_id", mov.produto_id)
    .gt("created_at", importCreatedAt)
    .neq("id", movementId);

  return {
    tenantOk: true,
    produtoId: mov.produto_id,
    quantidade: Number(mov.quantidade ?? 0),
    alreadyReversed: (reverseCount ?? 0) > 0,
    laterMovementsOnProduct: (later ?? 0) > 0,
    observacoes: mov.observacoes ?? null,
    dependenciesUnverified: false,
  };
}

/** Bloqueia exclusão destrutiva se dependências não puderam ser verificadas. */
export function blockDestructiveIfUnverified(input: {
  dependenciesUnverified: boolean;
  unverifiedTables?: string[];
}): void {
  if (input.dependenciesUnverified) {
    const tables = input.unverifiedTables?.join(", ") || "desconhecidas";
    throw new Error(
      `Não foi possível verificar todas as dependências (${tables}). Exclusão destrutiva bloqueada.`,
    );
  }
}
