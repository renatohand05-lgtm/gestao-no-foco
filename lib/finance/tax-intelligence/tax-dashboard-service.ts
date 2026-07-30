/**
 * Sprint 26.7 — Dashboard tributário executivo + drill-down.
 */

import { createTaxEngine, type TaxEngine } from "./tax-engine.ts";
import { periodKey, roundMoney, safeRatio, todayUtc } from "./money-utils.ts";
import type {
  ExecutiveTaxDashboard,
  TaxComputationResult,
  TaxDrillDownDimension,
  TaxDrillDownItem,
  TaxDrillDownRequest,
  TaxDrillDownResult,
  TaxEntity,
  TaxIntelligenceSnapshot,
  TaxOpportunity,
  TaxReformImpact,
} from "./types.ts";

function shareItems(
  rows: Array<{ id: string; label: string; amount: number; meta?: TaxDrillDownItem["meta"] }>,
): TaxDrillDownItem[] {
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return rows.map((r) => ({
    ...r,
    share: total === 0 ? 0 : roundMoney(r.amount / total),
  }));
}

export function computeAssessments(
  snap: TaxIntelligenceSnapshot,
  engine: TaxEngine = createTaxEngine(),
): TaxComputationResult[] {
  const results: TaxComputationResult[] = [];
  for (const entity of snap.entities.filter((e) => e.active)) {
    const entityBases = snap.bases.filter((b) => b.entityId === entity.id);
    if (entityBases.length === 0) continue;
    try {
      results.push(
        engine.computeForEntity({
          tenantId: snap.tenantId,
          asOf: snap.asOf,
          entity,
          bases: snap.bases,
          ruleVersions: snap.ruleVersions,
        }),
      );
    } catch {
      // Entidade sem regra ativa — omitida do consolidado (sem inventar alíquota).
    }
  }
  return results;
}

function groupByEntityKind(
  assessments: TaxComputationResult[],
  entities: TaxEntity[],
  kind: TaxEntity["kind"],
): TaxDrillDownItem[] {
  const map = new Map<string, { label: string; amount: number }>();
  for (const a of assessments) {
    const ent = entities.find((e) => e.id === a.entityId);
    if (!ent || ent.kind !== kind) continue;
    const prev = map.get(ent.id) ?? { label: ent.name, amount: 0 };
    prev.amount = roundMoney(prev.amount + a.totalTax);
    map.set(ent.id, prev);
  }
  return shareItems(
    [...map.entries()].map(([id, v]) => ({ id, label: v.label, amount: v.amount })),
  );
}

function groupByPeriod(assessments: TaxComputationResult[]): TaxDrillDownItem[] {
  const map = new Map<string, number>();
  for (const a of assessments) {
    map.set(a.period, roundMoney((map.get(a.period) ?? 0) + a.totalTax));
  }
  return shareItems(
    [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, amount]) => ({ id: period, label: period, amount })),
  );
}

function groupByCostCenter(
  assessments: TaxComputationResult[],
  snap: TaxIntelligenceSnapshot,
): TaxDrillDownItem[] {
  const map = new Map<string, number>();
  for (const a of assessments) {
    const bases = snap.bases.filter((b) => b.entityId === a.entityId);
    const totalBase = bases.reduce((s, b) => s + Math.abs(b.amount), 0) || 1;
    for (const b of bases) {
      const cc = b.costCenterId ?? "sem-centro";
      const portion = a.totalTax * (Math.abs(b.amount) / totalBase);
      map.set(cc, roundMoney((map.get(cc) ?? 0) + portion));
    }
  }
  return shareItems(
    [...map.entries()].map(([id, amount]) => ({
      id,
      label: id === "sem-centro" ? "Sem centro de custo" : id,
      amount,
    })),
  );
}

function buildReformImpact(
  snap: TaxIntelligenceSnapshot,
  realized: number,
): TaxReformImpact {
  const reformRules = snap.ruleVersions.filter(
    (v) =>
      (v.regimeCode === "cbs" || v.regimeCode === "ibs") &&
      v.status === "active",
  );
  if (reformRules.length === 0) {
    return {
      summary:
        "Impacto da Reforma Tributária indisponível — configure versões CBS/IBS ativas.",
      projectedDelta: 0,
      regimesInScope: [],
      confidence: "low",
      explanation:
        "Sem parâmetros versionados de CBS/IBS não há projeção. Nenhuma alíquota implícita.",
      parameterSources: [],
    };
  }

  const engine = createTaxEngine();
  let reformTotal = 0;
  const sources: string[] = [];
  for (const entity of snap.entities.filter((e) => e.active)) {
    if (snap.bases.every((b) => b.entityId !== entity.id)) continue;
    for (const regime of ["cbs", "ibs"] as const) {
      const rule = reformRules.find((r) => r.regimeCode === regime);
      if (!rule) continue;
      try {
        const r = engine.computeForEntity({
          tenantId: snap.tenantId,
          asOf: snap.asOf,
          entity: { ...entity, regimeCode: regime },
          bases: snap.bases,
          ruleVersions: snap.ruleVersions,
          regimeOverride: regime,
          ruleOverride: rule,
        });
        reformTotal = roundMoney(reformTotal + r.totalTax);
        sources.push(rule.versionLabel);
      } catch {
        /* skip */
      }
    }
  }

  const delta = roundMoney(reformTotal - realized);
  return {
    summary:
      delta === 0
        ? "Projeção Reforma alinhada ao realizado (com regras CBS/IBS configuradas)."
        : `Delta estimado Reforma vs realizado: ${delta}.`,
    projectedDelta: delta,
    regimesInScope: reformRules.map((r) => r.regimeCode),
    confidence: sources.length > 0 ? "medium" : "low",
    explanation:
      "Comparativo usa apenas tax_rule_versions CBS/IBS ativas aplicadas às mesmas bases.",
    parameterSources: [...new Set(sources)],
  };
}

function buildOpportunities(
  assessments: TaxComputationResult[],
  reform: TaxReformImpact,
): TaxOpportunity[] {
  const out: TaxOpportunity[] = [];
  if (reform.projectedDelta < 0) {
    out.push({
      id: "opp-reform-savings",
      title: "Possível redução sob parâmetros da Reforma",
      estimatedImpact: Math.abs(reform.projectedDelta),
      confidence: reform.confidence,
      origin: "tax-dashboard/reform-impact",
      requiresHumanReview: true,
      explanation: reform.explanation,
    });
  }
  const highLoad = assessments.filter(
    (a) => a.effectiveRate != null && a.effectiveRate > 0.25,
  );
  for (const a of highLoad.slice(0, 3)) {
    out.push({
      id: `opp-review-${a.entityId}`,
      title: `Revisar carga efetiva da entidade ${a.entityId}`,
      estimatedImpact: a.totalTax,
      confidence: "medium",
      origin: `assessment:${a.ruleVersionId}`,
      requiresHumanReview: true,
      explanation: `Carga efetiva ${(a.effectiveRate! * 100).toFixed(1)}% com regra ${a.ruleVersionLabel}.`,
    });
  }
  return out;
}

export function buildExecutiveTaxDashboard(
  snap: TaxIntelligenceSnapshot,
  options?: { projectedAssessments?: TaxComputationResult[] },
): ExecutiveTaxDashboard {
  const asOf = snap.asOf || todayUtc();
  const assessments = computeAssessments({ ...snap, asOf });
  const consolidated = roundMoney(
    assessments.reduce((s, a) => s + a.totalTax, 0),
  );
  const projectedList =
    options?.projectedAssessments ?? snap.projectedAssessments ?? [];
  const projected = roundMoney(
    projectedList.reduce((s, a) => s + a.totalTax, 0),
  );

  const emptyReason =
    snap.ruleVersions.length === 0
      ? "Nenhuma regra tributária versionada configurada."
      : assessments.length === 0
        ? "Sem bases tributáveis ou regras ativas aplicáveis às entidades."
        : null;

  const byPeriod = groupByPeriod(assessments);
  const reformImpact = buildReformImpact(snap, consolidated);
  const opportunities = buildOpportunities(assessments, reformImpact);

  const periods = [...new Set(assessments.map((a) => a.period))].sort();
  const monthlyTrend = periods.map((period) => {
    const realized = roundMoney(
      assessments
        .filter((a) => a.period === period)
        .reduce((s, a) => s + a.totalTax, 0),
    );
    const proj = roundMoney(
      projectedList
        .filter((a) => a.period === period)
        .reduce((s, a) => s + a.totalTax, 0),
    );
    return { period, realized, projected: proj };
  });

  const revenueTotal = snap.bases
    .filter((b) => b.kind === "revenue")
    .reduce((s, b) => s + b.amount, 0);

  return {
    tenantId: snap.tenantId,
    asOf,
    consolidatedLoad: consolidated,
    projectedLoad: projected,
    realizedVsProjectedDelta: roundMoney(consolidated - projected),
    byPeriod,
    byCompany: groupByEntityKind(assessments, snap.entities, "company"),
    byBranch: groupByEntityKind(assessments, snap.entities, "branch"),
    byCostCenter: groupByCostCenter(assessments, snap),
    monthlyTrend,
    efficiency: [
      {
        key: "effective_load",
        label: "Carga efetiva sobre receita",
        value: safeRatio(consolidated, revenueTotal) ?? 0,
        unit: "ratio",
        explanation:
          "Tributos consolidados / receita nas bases informadas (sem alíquota implícita).",
      },
      {
        key: "entities_covered",
        label: "Entidades com apuração",
        value: assessments.length,
        unit: "count",
        explanation: "Quantidade de entidades com cálculo bem-sucedido.",
      },
      {
        key: "vs_projected",
        label: "Desvio realizado vs projetado",
        value: roundMoney(consolidated - projected),
        unit: "currency",
        explanation: "Diferença consolidada entre realizado e projeções informadas.",
      },
    ],
    reformImpact,
    opportunities,
    alertsCount: 0,
    emptyReason,
    methodology:
      "Dashboard 100% derivado de tax_rule_versions + bases + providers. Drill-down disponível por dimensão.",
  };
}

export function buildTaxDrillDown(
  snap: TaxIntelligenceSnapshot,
  request: TaxDrillDownRequest,
): TaxDrillDownResult {
  const dashboard = buildExecutiveTaxDashboard(snap);
  const dimension: TaxDrillDownDimension = request.dimension;
  let items: TaxDrillDownItem[] = [];
  switch (dimension) {
    case "period":
      items = dashboard.byPeriod;
      if (request.id) items = items.filter((i) => i.id === request.id);
      break;
    case "company":
      items = dashboard.byCompany;
      if (request.id) items = items.filter((i) => i.id === request.id);
      break;
    case "branch":
      items = dashboard.byBranch;
      if (request.id) items = items.filter((i) => i.id === request.id);
      break;
    case "cost_center":
      items = dashboard.byCostCenter;
      if (request.id) items = items.filter((i) => i.id === request.id);
      break;
    case "opportunity":
      items = dashboard.opportunities.map((o) => ({
        id: o.id,
        label: o.title,
        amount: o.estimatedImpact,
        share: 0,
        meta: { confidence: o.confidence, origin: o.origin },
      }));
      break;
    case "regime": {
      const assessments = computeAssessments(snap);
      const map = new Map<string, number>();
      for (const a of assessments) {
        map.set(a.regimeCode, roundMoney((map.get(a.regimeCode) ?? 0) + a.totalTax));
      }
      items = shareItems(
        [...map.entries()].map(([id, amount]) => ({ id, label: id, amount })),
      );
      break;
    }
    case "component": {
      const assessments = computeAssessments(snap);
      const map = new Map<string, number>();
      for (const a of assessments) {
        for (const c of a.components) {
          map.set(c.code, roundMoney((map.get(c.code) ?? 0) + c.amount));
        }
      }
      items = shareItems(
        [...map.entries()].map(([id, amount]) => ({ id, label: id, amount })),
      );
      break;
    }
  }

  if (request.periodFrom || request.periodTo) {
    items = items.filter((i) => {
      if (dimension !== "period") return true;
      if (request.periodFrom && i.id < periodKey(request.periodFrom)) return false;
      if (request.periodTo && i.id > periodKey(request.periodTo)) return false;
      return true;
    });
  }

  const total = roundMoney(items.reduce((s, i) => s + i.amount, 0));
  return {
    dimension,
    items,
    total,
    methodology: `Drill-down ${dimension} a partir do dashboard parametrizado.`,
  };
}
