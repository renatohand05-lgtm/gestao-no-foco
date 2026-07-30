/**
 * Fase 23 — Drill-down com rastreabilidade.
 * Não inventa linhas — só projeta o que o snapshot fornece.
 */

import type {
  MetricDimension,
  MetricDrillDown,
  MetricDrillDownItem,
} from "./metric-types.ts";

export function buildDrillDown(args: {
  definitionId: string;
  level: MetricDrillDown["level"];
  items: MetricDrillDownItem[];
  methodology: string;
}): MetricDrillDown {
  const items = args.items.filter((i) => Number.isFinite(i.value));
  const total = items.reduce((s, i) => s + i.value, 0);
  const traceable = items.every(
    (i) => Boolean(i.origin || i.documentRef || i.id),
  );
  return {
    definitionId: args.definitionId,
    level: args.level,
    items,
    total: Math.round((total + Number.EPSILON) * 100) / 100,
    methodology: args.methodology,
    traceable,
  };
}

export function emptyDrillDown(
  definitionId: string,
  level: MetricDimension = "periodo",
  reason: string,
): MetricDrillDown {
  return {
    definitionId,
    level,
    items: [],
    total: 0,
    methodology: reason,
    traceable: false,
  };
}
