/**
 * Fase 24 — Resolução de KPIs a partir do snapshot (server-side).
 */

import { getCrmKpiDefinition, CRM_KPI_CATALOG } from "./kpi-catalog.ts";
import type {
  CrmDrillDown,
  CrmDrillDownItem,
  CrmEnterpriseSnapshot,
  CrmKpiId,
  CrmKpiResult,
} from "./types.ts";

function finite(n: number | null | undefined): number | null {
  if (n == null) return null;
  return Number.isFinite(n) ? n : null;
}

function formatValue(
  value: number | null,
  unit: CrmKpiResult["unit"],
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
  return String(Math.round(value * 100) / 100);
}

const EXTRACTORS: Record<
  CrmKpiId,
  (s: CrmEnterpriseSnapshot) => number | null | undefined
> = {
  "crm.novos": (s) => s.kpisRaw.novos,
  "crm.ativos": (s) => s.kpisRaw.ativos,
  "crm.inativos": (s) => s.kpisRaw.inativos,
  "crm.conversao": (s) => s.kpisRaw.conversao,
  "crm.ticket_medio": (s) => s.kpisRaw.ticketMedio,
  "crm.faturamento_cliente": (s) => s.kpisRaw.faturamentoPorCliente,
  "crm.recorrencia": (s) => s.kpisRaw.recorrentes,
  "crm.retencao": (s) => s.kpisRaw.retencao,
  "crm.perda": (s) => s.kpisRaw.perdidos,
  "crm.tempo_fechamento": (s) => s.kpisRaw.tempoMedioFechamentoDias,
  "crm.oportunidades_abertas": (s) => s.kpisRaw.oportunidadesAbertas,
  "crm.valor_negociacao": (s) => s.kpisRaw.valorNegociacao,
};

export function resolveCrmKpi(
  snap: CrmEnterpriseSnapshot,
  definitionId: CrmKpiId,
): CrmKpiResult {
  const def = getCrmKpiDefinition(definitionId);
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

export function resolveCrmCatalogKpis(
  snap: CrmEnterpriseSnapshot,
): CrmKpiResult[] {
  return CRM_KPI_CATALOG.map((d) => resolveCrmKpi(snap, d.id));
}

export function buildCrmDrillDown(args: {
  definitionId: string;
  items: CrmDrillDownItem[];
  methodology: string;
}): CrmDrillDown {
  const total = args.items.reduce((a, i) => a + (Number.isFinite(i.value) ? i.value : 0), 0);
  return {
    definitionId: args.definitionId,
    total,
    items: args.items,
    traceable: args.items.every((i) => Boolean(i.origin)),
    methodology: args.methodology,
  };
}

export function buildCrmKpiDrillDownFromSnapshot(
  snap: CrmEnterpriseSnapshot,
  definitionId: CrmKpiId,
): CrmDrillDown {
  if (definitionId === "crm.valor_negociacao" || definitionId === "crm.oportunidades_abertas") {
    const items = snap.funil
      .filter((f) => f.estagio === "proposta" || f.estagio === "negociacao")
      .map((f) => ({
        id: f.estagio,
        label: f.estagio,
        value:
          definitionId === "crm.valor_negociacao" ? f.valor_total : f.total,
        origin: "crm-funil",
      }));
    return buildCrmDrillDown({
      definitionId,
      items,
      methodology: "Agregado do funil por estágio (sem inventar).",
    });
  }

  if (snap.ranking?.length) {
    return buildCrmDrillDown({
      definitionId,
      items: snap.ranking.slice(0, 50).map((r) => ({
        id: r.id,
        label: r.nome,
        value: r.valor,
        origin: "crm-executivo-ranking",
      })),
      methodology: "Ranking executivo existente — detalhe fecha com origem.",
    });
  }

  return buildCrmDrillDown({
    definitionId,
    items: [],
    methodology:
      "Drill-down sem itens rastreáveis no snapshot — Dados indisponíveis para detalhe.",
  });
}
