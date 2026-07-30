/**
 * Fase 25 — Snapshot builder Supply (sem inventar números).
 */

import type {
  SupplyEnterpriseSnapshot,
  SupplyFilter,
  SupplyProductBalance,
  SupplyPurchaseSummary,
  SupplyInventorySummary,
} from "./types.ts";

export function emptySupplyFilter(): SupplyFilter {
  return {
    periodoDe: null,
    periodoAte: null,
    empresaId: null,
    filialId: null,
    depositoId: null,
    almoxarifadoId: null,
    fornecedorId: null,
    categoria: null,
    status: null,
    responsavelId: null,
  };
}

export function emptySupplyEnterpriseSnapshot(
  tenantId: string,
  tenantSlug: string,
  asOf = new Date().toISOString(),
): SupplyEnterpriseSnapshot {
  return {
    tenantId,
    tenantSlug,
    asOf,
    filter: emptySupplyFilter(),
    products: [],
    kpisRaw: {
      giro: null,
      coberturaDias: null,
      rupturaCount: null,
      excessoCount: null,
      abcACount: null,
      paradoCount: null,
      comprasMesValor: null,
      fornecedoresAtivos: null,
      consumoPeriodo: null,
      margemMedia: null,
      custoMedio: null,
      valorizacao: null,
      perdasValor: null,
      inventarioDivergencias: null,
    },
    purchases: {
      solicitacoesAbertas: null,
      pedidosAbertos: null,
      pedidosMes: null,
      valorPedidosMes: null,
      recebimentosPendentes: null,
    },
    inventory: {
      ciclosAbertos: null,
      divergencias: null,
      ajustesPendentes: null,
    },
    warehouseReady: false,
    purchaseWorkflowReady: false,
    health: {},
  };
}

function finite(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  return n;
}

function classifyAbcA(products: SupplyProductBalance[]): number {
  const valued = products
    .filter((p) => p.valorEstoque != null && p.valorEstoque > 0)
    .sort((a, b) => (b.valorEstoque ?? 0) - (a.valorEstoque ?? 0));
  const total = valued.reduce((s, p) => s + (p.valorEstoque ?? 0), 0);
  if (total <= 0) return 0;
  let acc = 0;
  let count = 0;
  for (const p of valued) {
    acc += p.valorEstoque ?? 0;
    count += 1;
    if (acc / total > 0.8) break;
  }
  return count;
}

export function buildSupplyEnterpriseSnapshotFromSources(args: {
  tenantId: string;
  tenantSlug: string;
  asOf?: string;
  filter?: SupplyFilter;
  products?: SupplyProductBalance[];
  purchases?: Partial<SupplyPurchaseSummary>;
  inventory?: Partial<SupplyInventorySummary>;
  fornecedoresAtivos?: number | null;
  perdasValor?: number | null;
  warehouseReady?: boolean;
  purchaseWorkflowReady?: boolean;
  health?: SupplyEnterpriseSnapshot["health"];
  /** Quando giro/cobertura já vierem do executive-stock */
  overrides?: Partial<SupplyEnterpriseSnapshot["kpisRaw"]>;
}): SupplyEnterpriseSnapshot {
  const products = args.products ?? [];
  const stockProducts = products.filter((p) => p.tipo !== "servico");

  let ruptura = 0;
  let excesso = 0;
  let parado = 0;
  let valorizacao = 0;
  let valorizacaoAny = false;
  let custoPonderadoNum = 0;
  let custoPonderadoDen = 0;
  let margemSum = 0;
  let margemCount = 0;
  let consumo = 0;
  let saldoTotal = 0;

  for (const p of stockProducts) {
    saldoTotal += Math.max(0, p.saldo);
    consumo += Math.max(0, p.saidasPeriodo);

    if (p.saldo <= 0 || (p.minimo != null && p.saldo < p.minimo)) ruptura += 1;
    if (p.maximo != null && p.saldo > p.maximo) excesso += 1;
    if (
      p.saldo > 0 &&
      p.diasSemMovimentacao != null &&
      p.diasSemMovimentacao >= 90
    ) {
      parado += 1;
    }
    if (p.valorEstoque != null && Number.isFinite(p.valorEstoque)) {
      valorizacao += p.valorEstoque;
      valorizacaoAny = true;
    }
    if (p.custo != null && p.saldo > 0 && Number.isFinite(p.custo)) {
      custoPonderadoNum += p.custo * p.saldo;
      custoPonderadoDen += p.saldo;
    }
    if (
      p.custo != null &&
      p.precoVenda != null &&
      p.precoVenda > 0 &&
      Number.isFinite(p.custo) &&
      Number.isFinite(p.precoVenda)
    ) {
      margemSum += (p.precoVenda - p.custo) / p.precoVenda;
      margemCount += 1;
    }
  }

  const coberturaDias =
    consumo > 0 && saldoTotal > 0 ? (saldoTotal / (consumo / 90)) : null;
  const giro =
    saldoTotal > 0 && consumo > 0 ? consumo / saldoTotal : null;

  const purchases: SupplyPurchaseSummary = {
    solicitacoesAbertas: args.purchases?.solicitacoesAbertas ?? null,
    pedidosAbertos: args.purchases?.pedidosAbertos ?? null,
    pedidosMes: args.purchases?.pedidosMes ?? null,
    valorPedidosMes: args.purchases?.valorPedidosMes ?? null,
    recebimentosPendentes: args.purchases?.recebimentosPendentes ?? null,
  };

  const inventory: SupplyInventorySummary = {
    ciclosAbertos: args.inventory?.ciclosAbertos ?? null,
    divergencias: args.inventory?.divergencias ?? null,
    ajustesPendentes: args.inventory?.ajustesPendentes ?? null,
  };

  const kpisRaw: SupplyEnterpriseSnapshot["kpisRaw"] = {
    giro: finite(giro),
    coberturaDias: finite(coberturaDias),
    rupturaCount: stockProducts.length ? ruptura : null,
    excessoCount: stockProducts.length ? excesso : null,
    abcACount: stockProducts.length ? classifyAbcA(stockProducts) : null,
    paradoCount: stockProducts.length ? parado : null,
    comprasMesValor: finite(purchases.valorPedidosMes),
    fornecedoresAtivos: finite(args.fornecedoresAtivos),
    consumoPeriodo: stockProducts.length ? consumo : null,
    margemMedia: margemCount > 0 ? margemSum / margemCount : null,
    custoMedio:
      custoPonderadoDen > 0 ? custoPonderadoNum / custoPonderadoDen : null,
    valorizacao: valorizacaoAny ? valorizacao : null,
    perdasValor: finite(args.perdasValor),
    inventarioDivergencias: finite(inventory.divergencias),
    ...args.overrides,
  };

  return {
    tenantId: args.tenantId,
    tenantSlug: args.tenantSlug,
    asOf: args.asOf ?? new Date().toISOString(),
    empresaId: args.filter?.empresaId ?? null,
    filialId: args.filter?.filialId ?? null,
    filter: args.filter ?? emptySupplyFilter(),
    products,
    kpisRaw,
    purchases,
    inventory,
    warehouseReady: args.warehouseReady ?? false,
    purchaseWorkflowReady: args.purchaseWorkflowReady ?? false,
    health: args.health ?? {},
  };
}
