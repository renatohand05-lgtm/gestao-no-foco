/**
 * Executive Timeline — builders de eventos a partir de engines (Gate 20.5).
 * Somente evidências existentes · sem inventar valores.
 */

import type { ExecutiveAiResult } from "../ai/executive-ai-types.ts";
import type { BusinessHealthResult } from "../dashboard/business-health-engine.ts";
import type { ExecutiveIntelligenceCenterData } from "../dashboard/executive-intelligence-center-types.ts";
import type { PredictiveIntelligenceResult } from "../predictive/types.ts";
import {
  clampImpact,
  confidenceFromCoverage,
  mapBhConfidence,
  mapPredictiveConfidence,
} from "./format.ts";
import { computeTimelinePriority } from "./priorities.ts";
import type {
  ExecutiveTimelineCategory,
  ExecutiveTimelineEvent,
  ExecutiveTimelineSeverity,
} from "./types.ts";

function tsOffset(base: string, minutes: number): string {
  const d = new Date(base);
  if (Number.isNaN(d.getTime())) return base;
  d.setMinutes(d.getMinutes() - minutes);
  return d.toISOString();
}

function makeEvent(partial: {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  category: ExecutiveTimelineCategory;
  severity: ExecutiveTimelineSeverity;
  impact: number;
  evidence: ExecutiveTimelineEvent["evidence"];
  recommendation: string | null;
  source: string;
  confidence: ExecutiveTimelineEvent["confidence"];
  href?: string;
}): ExecutiveTimelineEvent {
  const impact = clampImpact(partial.impact);
  return {
    ...partial,
    impact,
    priority: computeTimelinePriority(
      partial.severity,
      impact,
      partial.confidence,
    ),
  };
}

function bhStatusSeverity(
  status: BusinessHealthResult["overallStatus"],
): ExecutiveTimelineSeverity {
  if (status === "excelente" || status === "saudavel") return "positive";
  if (status === "atencao") return "attention";
  if (status === "critico") return "critical";
  return "info";
}

function moduleToCategory(
  module: string | null,
): ExecutiveTimelineCategory {
  switch (module) {
    case "financeiro":
      return "finance";
    case "comercial":
      return "sales";
    case "operacao":
      return "operations";
    case "estoque":
      return "inventory";
    case "crm":
      return "performance";
    default:
      return "performance";
  }
}

export function eventsFromBusinessHealth(
  bh: BusinessHealthResult,
): ExecutiveTimelineEvent[] {
  const base = bh.generatedAt;
  const conf = mapBhConfidence(bh.confidence);
  const out: ExecutiveTimelineEvent[] = [];

  out.push(
    makeEvent({
      id: "bh:overall",
      timestamp: base,
      title: `Saúde empresarial: ${bh.overallStatusLabel}`,
      description:
        bh.overallScore == null
          ? "Score indisponível por cobertura insuficiente."
          : `Business Health Score ${bh.overallScore}/100 · confiança ${bh.confidenceLabel}.`,
      category: "performance",
      severity: bhStatusSeverity(bh.overallStatus),
      impact: bh.overallScore == null ? 40 : 100 - bh.overallScore,
      evidence: [
        {
          id: "bh:score",
          label: "Score",
          value: bh.overallScore == null ? "Indisponível" : String(bh.overallScore),
          source: "business-health-engine",
        },
        {
          id: "bh:cov",
          label: "Cobertura",
          value: `${bh.coveragePct}% · ${bh.modulesAvailable} módulos`,
          source: "business-health-engine",
        },
      ],
      recommendation:
        bh.priorities[0]?.title ??
        (bh.overallStatus === "critico" || bh.overallStatus === "atencao"
          ? "Revisar prioridades do Business Health."
          : null),
      source: "business-health-engine",
      confidence: conf,
    }),
  );

  const modules = [
    bh.finance,
    bh.commercial,
    bh.operation,
    bh.crm,
    bh.inventory,
  ];
  let i = 0;
  for (const mod of modules) {
    if (mod.coverage === "unavailable" || mod.score == null) continue;
    if (mod.status === "excelente" || mod.status === "saudavel") {
      if (mod.oportunidades.length === 0 && mod.riscos.length === 0) continue;
    }
    const sev = bhStatusSeverity(mod.status);
    const lead = mod.motivos[0]?.text || mod.statusLabel;
    out.push(
      makeEvent({
        id: `bh:mod:${mod.key}`,
        timestamp: tsOffset(base, 2 + i),
        title: `${mod.label}: ${mod.statusLabel}`,
        description: lead,
        category: moduleToCategory(mod.module),
        severity: sev,
        impact:
          sev === "critical"
            ? Math.max(70, 100 - mod.score)
            : sev === "attention"
              ? Math.max(50, 90 - mod.score)
              : Math.max(20, 100 - mod.score),
        evidence: [
          {
            id: `bh:${mod.key}:score`,
            label: "Score módulo",
            value: `${mod.score}/100`,
            source: "business-health-engine",
          },
          ...mod.riscos.slice(0, 2).map((r) => ({
            id: r.id,
            label: "Risco",
            value: r.text,
            source: r.source,
          })),
          ...mod.oportunidades.slice(0, 1).map((o) => ({
            id: o.id,
            label: "Oportunidade",
            value: o.text,
            source: o.source,
          })),
        ],
        recommendation: mod.riscos[0]?.text ?? null,
        source: "business-health-engine",
        confidence: conf,
      }),
    );
    i += 1;
  }

  return out;
}

export function eventsFromExecutiveAi(
  ai: ExecutiveAiResult,
): ExecutiveTimelineEvent[] {
  const base = ai.generatedAt;
  const conf = confidenceFromCoverage(
    ai.partial,
    ai.diagnostics.length > 0 || ai.recommendations.length > 0,
  );
  const out: ExecutiveTimelineEvent[] = [];

  if (ai.priority.title) {
    out.push(
      makeEvent({
        id: "ai:priority",
        timestamp: base,
        title: ai.priority.title,
        description: ai.priority.reason,
        category: "decision",
        severity: "attention",
        impact: 85,
        evidence: [
          {
            id: "ai:prio:mod",
            label: "Módulo",
            value: ai.priority.module ?? "geral",
            source: "decision-engine",
          },
        ],
        recommendation: ai.priority.title,
        source: "decision-engine",
        confidence: conf,
        href: ai.priority.href,
      }),
    );
  }

  let di = 0;
  for (const d of ai.diagnostics.slice(0, 8)) {
    const severity: ExecutiveTimelineSeverity =
      d.severity === "critica"
        ? "critical"
        : d.severity === "alta" || d.severity === "media"
          ? "attention"
          : d.severity === "oportunidade"
            ? "positive"
            : "info";
    out.push(
      makeEvent({
        id: `ai:diag:${d.id}`,
        timestamp: tsOffset(base, 5 + di),
        title: d.title,
        description: d.description,
        category: d.severity === "oportunidade" ? "sales" : "risk",
        severity,
        impact: clampImpact(Math.abs(d.scoreImpact) * 4 || (severity === "critical" ? 80 : 55)),
        evidence: d.evidence.slice(0, 3).map((text, idx) => ({
          id: `${d.id}:ev:${idx}`,
          label: "Evidência",
          value: text,
          source: d.source,
        })),
        recommendation: null,
        source: d.source || "decision-engine",
        confidence: conf,
        href: d.href,
      }),
    );
    di += 1;
  }

  let ri = 0;
  for (const r of ai.recommendations.slice(0, 5)) {
    out.push(
      makeEvent({
        id: `ai:rec:${r.id}`,
        timestamp: tsOffset(base, 10 + ri),
        title: r.action || r.title,
        description: r.reason,
        category: "recommendation",
        severity: r.priority <= 2 ? "attention" : "info",
        impact: clampImpact(100 - (r.priority - 1) * 12),
        evidence: [
          {
            id: `${r.id}:reason`,
            label: "Motivo",
            value: r.reason,
            source: r.source,
          },
          ...(r.expectedImpact
            ? [
                {
                  id: `${r.id}:impact`,
                  label: "Impacto esperado",
                  value: r.expectedImpact,
                  source: r.source,
                },
              ]
            : []),
        ],
        recommendation: r.action || r.title,
        source: r.source || "decision-engine",
        confidence: conf,
        href: r.href,
      }),
    );
    ri += 1;
  }

  return out;
}

export function eventsFromIntelligenceCenter(
  eic: ExecutiveIntelligenceCenterData,
): ExecutiveTimelineEvent[] {
  const base = eic.generatedAt;
  const out: ExecutiveTimelineEvent[] = [];
  let i = 0;
  for (const r of eic.riscos.slice(0, 5)) {
    out.push(
      makeEvent({
        id: `eic:risk:${r.id}`,
        timestamp: tsOffset(base, 15 + i),
        title: r.title,
        description: r.description,
        category: "risk",
        severity: r.criticidade === "critica" ? "critical" : "attention",
        impact: r.criticidade === "critica" ? 90 : r.criticidade === "alta" ? 70 : 50,
        evidence: [
          {
            id: `${r.id}:imp`,
            label: "Impacto",
            value: r.impactLabel ?? "Não quantificado",
            source: r.source,
          },
        ],
        recommendation: null,
        source: r.source,
        confidence: r.impactLabel ? "media" : "baixa",
        href: r.href,
      }),
    );
    i += 1;
  }
  for (const o of eic.oportunidades.slice(0, 4)) {
    out.push(
      makeEvent({
        id: `eic:opp:${o.id}`,
        timestamp: tsOffset(base, 20 + i),
        title: o.title,
        description: o.description,
        category: "sales",
        severity: "positive",
        impact: o.potentialGainLabel ? 60 : 40,
        evidence: [
          {
            id: `${o.id}:gain`,
            label: "Potencial",
            value: o.potentialGainLabel ?? "Sem valor quantificado",
            source: o.source,
          },
        ],
        recommendation: o.title,
        source: o.source,
        confidence: o.potentialGainLabel ? "media" : "baixa",
        href: o.href,
      }),
    );
    i += 1;
  }
  return out;
}

export function eventsFromPredictive(
  predictive: PredictiveIntelligenceResult,
): ExecutiveTimelineEvent[] {
  const base = predictive.generatedAt;
  const out: ExecutiveTimelineEvent[] = [];
  let i = 0;

  for (const f of predictive.forecasts) {
    if (f.unavailableReason && f.evidence.length === 0) continue;

    const category: ExecutiveTimelineCategory =
      f.domain === "faturamento"
        ? "forecast"
        : f.domain === "fluxo_caixa"
          ? "cashflow"
          : f.domain === "estoque"
            ? "inventory"
            : f.domain === "metas"
              ? "goal"
              : "operations";

    const severity: ExecutiveTimelineSeverity =
      f.risk === "critico"
        ? "critical"
        : f.risk === "alto" || f.risk === "moderado"
          ? "attention"
          : f.risk === "baixo"
            ? "positive"
            : "info";

    out.push(
      makeEvent({
        id: `pred:${f.domain}`,
        timestamp: tsOffset(base, 3 + i),
        title: `Previsão · ${f.title}`,
        description: f.headline,
        category,
        severity,
        impact:
          severity === "critical"
            ? 88
            : severity === "attention"
              ? 65
              : severity === "positive"
                ? 35
                : 45,
        evidence: f.evidence.map((e) => ({
          id: e.id,
          label: e.label,
          value: e.value,
          source: e.source,
        })),
        recommendation:
          severity === "critical" || severity === "attention"
            ? `Revisar ${f.title.toLowerCase()} no módulo relacionado.`
            : null,
        source: "predictive-engine",
        confidence: mapPredictiveConfidence(f.confidence),
        href: f.href,
      }),
    );
    i += 1;
  }

  return out;
}
