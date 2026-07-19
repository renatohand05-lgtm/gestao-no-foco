/**
 * CopilotEngine (Sprint 11.6)
 *
 * Composição determinística dos motores existentes.
 * Sem IA externa, sem LLM, sem prompt, sem API, sem recálculo.
 */

import type { ActionCenterDecision } from "@/lib/action-center";
import type { BusinessIntelligenceResult } from "@/lib/business-intelligence";
import type { ExecutiveIntelligenceResult } from "@/lib/intelligence/types";
import type { PredictionEngineResult } from "@/lib/predictions";
import type { TimelineEngineResult } from "@/lib/timeline-engine";
import {
  COPILOT_MAX_RESPONSES,
  type CopilotConfidence,
  type CopilotEngineResult,
  type CopilotResponse,
  type CopilotSource,
} from "@/lib/copilot/types";

export type CopilotEngineInput = {
  intelligence: ExecutiveIntelligenceResult;
  business: BusinessIntelligenceResult;
  predictions: PredictionEngineResult;
  timeline: TimelineEngineResult;
  action: ActionCenterDecision;
};

function uniqueEvidence(items: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const t = item?.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out.slice(0, 4);
}

function lowestConfidence(
  values: CopilotConfidence[],
): CopilotConfidence {
  if (values.includes("baixa")) return "baixa";
  if (values.includes("media")) return "media";
  return "alta";
}

function pushResponse(
  bag: CopilotResponse[],
  response: CopilotResponse,
) {
  if (bag.some((r) => r.id === response.id)) return;
  // Evita headlines quase idênticas
  if (
    bag.some(
      (r) =>
        r.headline.toLowerCase() === response.headline.toLowerCase() ||
        r.resposta.toLowerCase() === response.resposta.toLowerCase(),
    )
  ) {
    return;
  }
  bag.push(response);
}

/**
 * Monta até 3 respostas executivas em linguagem natural.
 */
export function buildCopilotResponses(
  input: CopilotEngineInput,
): CopilotEngineResult {
  const { intelligence, business, predictions, timeline, action } = input;
  const candidates: CopilotResponse[] = [];

  // 1) Por que estou abaixo / causa principal (BI + EI)
  pushResponse(candidates, {
    id: "copilot-causa",
    headline: "Por que o cenário está assim?",
    resposta: `${business.cause.title}. ${business.cause.description}`,
    evidencias: uniqueEvidence([
      business.summary.headline,
      business.summary.executiveSummary,
      intelligence.diagnosis.primaryCause,
      intelligence.diagnosis.conclusion,
      ...business.cause.supportingMetrics.map((m) => `${m.label}: ${m.value}`),
    ]),
    confidence: lowestConfidence([
      business.cause.confidence,
      action.confidence,
    ]),
    fontes: ["business_intelligence", "executive_intelligence"],
    proximaAcao: action.headline,
    rank: action.priority === "CRITICA" || action.priority === "ALTA" ? 1 : 3,
  });

  // 2) Maior risco (BI risks ou timeline Danger)
  const topRisk = business.risks.find((r) => r.severity === "alta") ??
    business.risks[0];
  const dangerEvent = timeline.visible.find((e) => e.tone === "Danger");

  if (topRisk) {
    pushResponse(candidates, {
      id: "copilot-risco",
      headline: "Qual o maior risco agora?",
      resposta: `O maior risco hoje é: ${topRisk.title}. ${topRisk.description}`,
      evidencias: uniqueEvidence([
        topRisk.impact,
        dangerEvent?.title,
        dangerEvent?.impact,
        intelligence.health.reason,
      ]),
      confidence: business.cause.confidence,
      fontes: [
        "business_intelligence",
        ...(dangerEvent ? (["timeline"] as CopilotSource[]) : []),
      ],
      proximaAcao: action.headline,
      rank: topRisk.severity === "alta" ? 0 : 2,
    });
  }

  // 3) O que fazer / necessário (Action + Prediction)
  const requiredAlert = predictions.requiredForMeta.alert;
  const rec = predictions.recommendation;

  pushResponse(candidates, {
    id: "copilot-acao",
    headline: "O que fazer agora?",
    resposta: requiredAlert
      ? requiredAlert
      : rec
        ? `${rec.title}. ${rec.expectedImpact}`
        : `${action.headline}. ${action.description}`,
    evidencias: uniqueEvidence([
      action.reason,
      action.impact,
      action.deadline,
      requiredAlert,
      rec?.rationale,
      predictions.base.explanation,
    ]),
    confidence: lowestConfidence([
      action.confidence,
      predictions.summary.confidence,
      ...(rec ? [rec.confidence] : []),
    ]),
    fontes: [
      "action_center",
      "prediction_engine",
      "executive_intelligence",
    ],
    proximaAcao: action.cta.label === "Ver detalhes"
      ? action.headline
      : `${action.cta.label}: ${action.headline}`,
    rank: 0,
  });

  // 4) Confiança / tendência / ticket — respostas situacionais
  const ticketInsight = intelligence.insights.find((i) =>
    /ticket/i.test(`${i.title} ${i.description}`),
  );
  const confidenceInsight = intelligence.insights.find((i) =>
    /confian/i.test(`${i.title} ${i.description}`),
  );
  const tendenciaInsight = intelligence.insights.find((i) =>
    /tend/i.test(`${i.title} ${i.description}`),
  );

  if (confidenceInsight || predictions.summary.confidence === "baixa") {
    pushResponse(candidates, {
      id: "copilot-confianca",
      headline: "A confiança da leitura está sob pressão?",
      resposta:
        confidenceInsight?.description ??
        `A confiança da projeção é ${predictions.summary.confidence}. ${predictions.summary.explanation}`,
      evidencias: uniqueEvidence([
        confidenceInsight?.impact,
        predictions.summary.headline,
        intelligence.score.explanation,
      ]),
      confidence: "baixa",
      fontes: ["prediction_engine", "executive_intelligence"],
      proximaAcao: action.headline,
      rank: 2,
    });
  }

  if (ticketInsight) {
    pushResponse(candidates, {
      id: "copilot-ticket",
      headline: "O que aconteceu com o ticket?",
      resposta: ticketInsight.description,
      evidencias: uniqueEvidence([
        ticketInsight.impact,
        ticketInsight.recommendation,
      ]),
      confidence: action.confidence,
      fontes: ["executive_intelligence"],
      proximaAcao: ticketInsight.recommendation || action.headline,
      rank: ticketInsight.category === "critical" ? 1 : 4,
    });
  }

  if (tendenciaInsight || /tendência|tendencia|queda|decresc/i.test(
    `${business.summary.headline} ${business.cause.title}`,
  )) {
    pushResponse(candidates, {
      id: "copilot-tendencia",
      headline: "Como está a tendência?",
      resposta:
        tendenciaInsight?.description ??
        `${business.summary.headline} ${business.cause.description}`,
      evidencias: uniqueEvidence([
        tendenciaInsight?.impact,
        business.summary.executiveSummary,
        predictions.summary.explanation,
      ]),
      confidence: lowestConfidence([
        action.confidence,
        business.cause.confidence,
      ]),
      fontes: [
        "business_intelligence",
        "executive_intelligence",
        "prediction_engine",
      ],
      proximaAcao: action.headline,
      rank: 3,
    });
  }

  // 5) Ritmo / projeção (Prediction summary + BI)
  pushResponse(candidates, {
    id: "copilot-projecao",
    headline: "O que a projeção indica?",
    resposta: predictions.summary.headline,
    evidencias: uniqueEvidence([
      predictions.summary.explanation,
      predictions.base.explanation,
      business.summary.executiveSummary,
      timeline.visible.find((e) => e.category === "Projeção")?.impact,
    ]),
    confidence: predictions.summary.confidence,
    fontes: ["prediction_engine", "business_intelligence", "timeline"],
    proximaAcao: action.headline,
    rank: predictions.summary.status === "critico" ? 1 : 5,
  });

  const responses = [...candidates]
    .sort((a, b) => a.rank - b.rank)
    .slice(0, COPILOT_MAX_RESPONSES);

  return { responses };
}
