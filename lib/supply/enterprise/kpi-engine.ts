/**
 * Fase 25 — Resolução de KPIs Supply a partir do snapshot.
 */

import { getSupplyKpiDefinition, SUPPLY_KPI_CATALOG } from "./kpi-catalog.ts";
import type {
  SupplyDrillDown,
  SupplyDrillDownItem,
  SupplyEnterpriseSnapshot,
  SupplyKpiId,
  SupplyKpiResult,
} from "./types.ts";

function finite(n: number | null | undefined): number | null {
  if (n == null) return null;
  return Number.isFinite(n) ? n : null;
}

function formatValue(
  value: number | null,
  unit: SupplyKpiResult["unit"],
): string {
  if (value == null || !Number.isFinite(value)) return "Dados indisponíveis";
  if (unit === "percent") return `${(value * 100).toFixed(1)}%`;
  if (unit === "currency") {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }
  if (unit === "days") return `${Math.round(value)} d`;
  if (unit === "ratio") return (Math.round(value * 100) / 100).toFixed(2);
  return String(Math.round(value * 100) / 100);
}

const EXTRACTORS: Record<
  SupplyKpiId,
  (s: SupplyEnterpriseSnapshot) => number | null | undefined
> = {
  "supply.giro": (s) => s.kpisRaw.giro,
  "supply.cobertura": (s) => s.kpisRaw.coberturaDias,
  "supply.ruptura": (s) => s.kpisRaw.rupturaCount,
  "supply.excesso": (s) => s.kpisRaw.excessoCount,
  "supply.curva_abc": (s) => s.kpisRaw.abcACount,
  "supply.parado": (s) => s.kpisRaw.paradoCount,
  "supply.compras_mes": (s) => s.kpisRaw.comprasMesValor,
  "supply.fornecedores": (s) => s.kpisRaw.fornecedoresAtivos,
  "supply.consumo": (s) => s.kpisRaw.consumoPeriodo,
  "supply.margem": (s) => s.kpisRaw.margemMedia,
  "supply.custo_medio": (s) => s.kpisRaw.custoMedio,
  "supply.valorizacao": (s) => s.kpisRaw.valorizacao,
  "supply.perdas": (s) => s.kpisRaw.perdasValor,
  "supply.inventario": (s) => s.kpisRaw.inventarioDivergencias,
};

export function resolveSupplyKpi(
  snap: SupplyEnterpriseSnapshot,
  definitionId: SupplyKpiId,
): SupplyKpiResult {
  const def = getSupplyKpiDefinition(definitionId);
  if (!def) {
    return {
      definitionId,
      name: definitionId,
      value: null,
      formatted: "Dados indisponíveis",
      unit: "count",
      availability: "unavailable",
      unavailableReason: "KPI fora do catálogo.",
      confidence: "none",
      source: "unknown",
      tenantId: snap.tenantId,
      drillDownAvailable: false,
    };
  }

  if (def.availability === "unavailable") {
    return {
      definitionId: def.id,
      name: def.name,
      value: null,
      formatted: "Dados indisponíveis",
      unit: def.unit,
      availability: "unavailable",
      unavailableReason: def.unavailableReason,
      confidence: "none",
      source: def.source,
      tenantId: snap.tenantId,
      drillDownAvailable: false,
    };
  }

  const raw = finite(EXTRACTORS[def.id]?.(snap) ?? null);
  if (raw == null) {
    return {
      definitionId: def.id,
      name: def.name,
      value: null,
      formatted: "Dados indisponíveis",
      unit: def.unit,
      availability: "unavailable",
      unavailableReason: `Fonte ${def.source} sem valor no período.`,
      confidence: "none",
      source: def.source,
      tenantId: snap.tenantId,
      drillDownAvailable: def.drillDownAvailable,
    };
  }

  return {
    definitionId: def.id,
    name: def.name,
    value: raw,
    formatted: formatValue(raw, def.unit),
    unit: def.unit,
    availability: "available",
    confidence: "high",
    source: def.source,
    tenantId: snap.tenantId,
    drillDownAvailable: def.drillDownAvailable,
  };
}

export function resolveSupplyCatalogKpis(
  snap: SupplyEnterpriseSnapshot,
): SupplyKpiResult[] {
  return SUPPLY_KPI_CATALOG.map((d) => resolveSupplyKpi(snap, d.id));
}

export function buildSupplyDrillDown(
  snap: SupplyEnterpriseSnapshot,
  definitionId: SupplyKpiId,
): SupplyDrillDown {
  const def = getSupplyKpiDefinition(definitionId);
  const title = def?.name ?? definitionId;
  const items: SupplyDrillDownItem[] = [];

  const products = snap.products;

  switch (definitionId) {
    case "supply.ruptura":
      for (const p of products) {
        const belowMin =
          p.minimo != null && p.saldo < p.minimo && p.saldo >= 0;
        if (p.saldo <= 0 || belowMin) {
          items.push({
            id: p.produtoId,
            label: p.nome,
            value: p.saldo,
            meta: { minimo: p.minimo },
          });
        }
      }
      break;
    case "supply.excesso":
      for (const p of products) {
        if (p.maximo != null && p.saldo > p.maximo) {
          items.push({
            id: p.produtoId,
            label: p.nome,
            value: p.saldo,
            meta: { maximo: p.maximo },
          });
        }
      }
      break;
    case "supply.parado":
      for (const p of products) {
        if (
          p.saldo > 0 &&
          p.diasSemMovimentacao != null &&
          p.diasSemMovimentacao >= 90
        ) {
          items.push({
            id: p.produtoId,
            label: p.nome,
            value: p.diasSemMovimentacao,
            meta: { saldo: p.saldo },
          });
        }
      }
      break;
    case "supply.valorizacao":
      for (const p of products) {
        if (p.valorEstoque != null && p.valorEstoque > 0) {
          items.push({
            id: p.produtoId,
            label: p.nome,
            value: p.valorEstoque,
          });
        }
      }
      items.sort((a, b) => b.value - a.value);
      break;
    case "supply.curva_abc": {
      const valued = products
        .filter((p) => p.valorEstoque != null && p.valorEstoque > 0)
        .sort((a, b) => (b.valorEstoque ?? 0) - (a.valorEstoque ?? 0));
      const total = valued.reduce((s, p) => s + (p.valorEstoque ?? 0), 0);
      let acc = 0;
      for (const p of valued) {
        acc += p.valorEstoque ?? 0;
        const share = total > 0 ? acc / total : 1;
        if (share <= 0.8) {
          items.push({
            id: p.produtoId,
            label: p.nome,
            value: p.valorEstoque ?? 0,
            meta: { classe: "A" },
          });
        } else break;
      }
      break;
    }
    default:
      break;
  }

  return {
    definitionId,
    title,
    items: items.slice(0, 100),
    total: items.length,
    source: def?.source ?? "snapshot",
  };
}

export function buildSupplyKpiDrillDownFromSnapshot(
  snap: SupplyEnterpriseSnapshot,
  definitionId: SupplyKpiId,
): SupplyDrillDown {
  return buildSupplyDrillDown(snap, definitionId);
}
