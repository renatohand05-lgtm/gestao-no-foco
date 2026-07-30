/**
 * Fase 24 — IA Comercial determinística (sem inventar dados).
 */

import { isCrmExternalAiEnabled } from "../crm-feature-flags.ts";
import type { CrmAlert, CrmCommercialProvider, CrmInsight, CrmKpiResult } from "./types.ts";

export const deterministicCommercialProvider: CrmCommercialProvider = {
  id: "crm-commercial-deterministic-v1",
  kind: "deterministic",
  label: "Análise baseada em regras e histórico do tenant.",
  explain({ kpis, alerts, tenantId }) {
    const available = kpis.filter((k) => k.availability === "available");
    const unavailable = kpis.filter((k) => k.availability === "unavailable");

    const insights: CrmInsight[] = [
      {
        id: `crm-summary-${tenantId}`,
        title: "Resumo comercial",
        summary: `${available.length} KPI(s) disponíveis, ${unavailable.length} indisponíveis (sem estimativa). ${alerts.length} alerta(s).`,
        dataUsed: available.slice(0, 8).map((k) => k.definitionId),
        confidence: available.length ? "medium" : "low",
        origin: "deterministic-commercial-provider",
        limitations: [
          "Análise baseada em regras e histórico do tenant.",
          "Não inventa causas sem evidência nos KPIs/alertas.",
        ],
        suggestedQuestions: [
          "Quais clientes inativos merecem follow-up?",
          "Qual o valor em negociação no funil?",
          "Há risco de perda nas oportunidades abertas?",
        ],
        requiresHumanReview: true,
        autoExecuted: false,
      },
    ];

    const inativos = available.find((k) => k.definitionId === "crm.inativos");
    if (inativos?.value != null && inativos.value > 0) {
      insights.push({
        id: `crm-insight-inativos-${tenantId}`,
        title: "Clientes inativos identificados",
        summary: `${inativos.formatted} inativos com base na regra canônica do CRM Executivo. Próximo passo sugerido: contatar os de maior faturamento histórico.`,
        dataUsed: ["crm.inativos"],
        confidence: "medium",
        origin: "kpi:crm.inativos",
        limitations: ["Segmentação detalhada exige drill-down do ranking."],
        suggestedQuestions: ["Abrir lista de inativos?"],
        requiresHumanReview: true,
        autoExecuted: false,
      });
    }

    const valorNeg = available.find((k) => k.definitionId === "crm.valor_negociacao");
    if (valorNeg?.value != null && valorNeg.value > 0) {
      insights.push({
        id: `crm-insight-pipeline-${tenantId}`,
        title: "Oportunidade no funil",
        summary: `${valorNeg.formatted} em Proposta/Negociação. Sugerir priorizar follow-ups nestas etapas.`,
        dataUsed: ["crm.valor_negociacao", "crm.oportunidades_abertas"],
        confidence: "medium",
        origin: "kpi:crm.valor_negociacao",
        limitations: ["Não atribui probabilidade de fechamento sem histórico explícito."],
        suggestedQuestions: ["Drill-down do valor em negociação?"],
        requiresHumanReview: true,
        autoExecuted: false,
      });
    }

    for (const a of alerts.slice(0, 3)) {
      insights.push({
        id: `crm-insight-alert-${a.id}`,
        title: a.title,
        summary: `${a.description} Recomendação: ${a.recommendation}`,
        dataUsed: a.relatedKpiIds,
        confidence: "medium",
        origin: a.dedupeKey,
        limitations: ["Alerta determinístico — revisão humana obrigatória."],
        suggestedQuestions: [],
        requiresHumanReview: true,
        autoExecuted: false,
      });
    }

    if (available.length === 0 && alerts.length === 0) {
      insights.push({
        id: `crm-insight-empty-${tenantId}`,
        title: "Evidência insuficiente",
        summary:
          "Não há KPIs disponíveis no snapshot. O sistema não inventa resumos nem próximos passos.",
        dataUsed: [],
        confidence: "none",
        origin: "empty-snapshot",
        limitations: ["Carregar fontes CRM Executivo / Dashboard antes de gerar insights."],
        suggestedQuestions: [],
        requiresHumanReview: true,
        autoExecuted: false,
      });
    }

    return insights;
  },
};

export const externalCommercialStubProvider: CrmCommercialProvider = {
  id: "crm-commercial-external-stub",
  kind: "external",
  label: "IA externa (preparando)",
  explain() {
    return [
      {
        id: "crm-external-off",
        title: "IA externa não configurada",
        summary:
          "Análise baseada em regras e histórico do tenant.",
        dataUsed: [],
        confidence: "none",
        origin: "external-stub",
        limitations: ["Provider externo desabilitado."],
        suggestedQuestions: [],
        requiresHumanReview: true,
        autoExecuted: false,
      },
    ];
  },
};

export const mockCommercialProvider: CrmCommercialProvider = {
  id: "crm-commercial-mock",
  kind: "mock",
  label: "Mock de testes",
  explain() {
    return [];
  },
};

export function resolveCommercialProvider(
  preferred?: CrmCommercialProvider,
): CrmCommercialProvider {
  if (preferred) return preferred;
  if (isCrmExternalAiEnabled()) return externalCommercialStubProvider;
  return deterministicCommercialProvider;
}

export type { CrmKpiResult, CrmAlert };
