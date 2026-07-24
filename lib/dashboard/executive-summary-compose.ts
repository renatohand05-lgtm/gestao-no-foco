/**
 * Composição pura do Resumo Executivo (Gate 17.3 / 17.3.1).
 *
 * Separação vs Plano de Ação:
 * - Resumo: status + contagem + sinais (títulos do Centro de Decisão) + recomendações curtas
 * - Plano: tarefas executáveis com impacto/CTA (não listadas aqui)
 */

import type { ExecutiveDecisionResult } from "./executive-decision-types";
import type { ExecutiveActionPlanData } from "./executive-action-plan-types";
import type { ExecutiveIntelligenceData } from "./executive-intelligence-types";
import type { ExecutiveFinancialCockpitData } from "./executive-financial-cockpit-types";
import type {
  ExecutiveSummaryData,
  ExecutiveSummaryPriority,
  ExecutiveSummaryStatus,
} from "./executive-summary-types";

/** Espelha EXECUTIVE_STATUS_LABEL — inline p/ Node tests (sem alias/@). */
const EXECUTIVE_STATUS_LABEL = {
  critico: "Crítico",
  atencao: "Atenção",
  saudavel: "Saudável",
  excelente: "Excelente",
} as const;

const MAX_SIGNALS = 5;
const MAX_RECS = 4;

/** Recomendações curtas — não repetem títulos do Plano de Ação. */
const REC_BY_SIGNAL: Record<string, string> = {
  "meta-dia-abaixo": "Reforçar o ritmo de faturamento ainda hoje.",
  "projecao-mes-abaixo": "Monitorar o gap da projeção mensal.",
  "os-aguardando-aprovacao": "Acelerar o ciclo de aprovação das OS.",
  "os-paradas": "Reduzir o tempo parado na oficina.",
  "estoque-critico": "Evitar ruptura de itens críticos.",
  "contas-pagar-atencao": "Proteger o caixa ante compromissos vencidos.",
  "contas-receber-atraso": "Recuperar recebíveis em atraso.",
  "orcamentos-recuperacao": "Converter orçamentos em aberto.",
  "capacidade-limite": "Equilibrar a capacidade operacional.",
};

function statusFrom(input: {
  critical: number;
  warning: number;
  actionAlta: number;
  actionTotal: number;
  caixa: ExecutiveFinancialCockpitData["saude"];
  decisionTotal: number;
}): ExecutiveSummaryStatus {
  if (input.critical > 0 || input.caixa === "critico") return "critico";
  if (
    input.warning > 0 ||
    input.caixa === "atencao" ||
    input.actionAlta > 0
  ) {
    return "atencao";
  }
  if (
    input.decisionTotal === 0 &&
    input.actionTotal === 0 &&
    (input.caixa === "saudavel" || input.caixa === "indisponivel")
  ) {
    return "excelente";
  }
  return "saudavel";
}

function reasonFor(status: ExecutiveSummaryStatus): string {
  switch (status) {
    case "critico":
      return "Há risco crítico financeiro ou operacional agora.";
    case "atencao":
      return "Existem alertas que pedem acompanhamento.";
    case "saudavel":
      return "Nenhum alerta crítico identificado.";
    case "excelente":
      return "Nenhum alerta relevante no momento.";
  }
}

export function composeExecutiveSummary(input: {
  decision: ExecutiveDecisionResult;
  actionPlan: ExecutiveActionPlanData;
  intelligence: ExecutiveIntelligenceData;
  cockpit: ExecutiveFinancialCockpitData;
}): ExecutiveSummaryData {
  const critical = input.decision.items.filter((i) => i.severity === "critical");
  const warning = input.decision.items.filter((i) => i.severity === "warning");
  const actionAlta = input.actionPlan.recommendations.filter(
    (r) => r.priority === "alta",
  ).length;

  const status = statusFrom({
    critical: critical.length,
    warning: warning.length,
    actionAlta,
    actionTotal: input.actionPlan.recommendations.length,
    caixa: input.cockpit.saude,
    decisionTotal: input.decision.items.length,
  });

  // Sinais (Decisão) — sem href/CTA para não competir com o Plano de Ação.
  const signals = [...critical, ...warning]
    .slice()
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.id.localeCompare(b.id);
    })
    .slice(0, MAX_SIGNALS);

  const priorities: ExecutiveSummaryPriority[] = signals.map((d) => ({
    id: d.id,
    title: d.title,
    severityLabel:
      d.severity === "critical"
        ? EXECUTIVE_STATUS_LABEL.critico
        : EXECUTIVE_STATUS_LABEL.atencao,
  }));

  const recommendations: string[] = [];
  const seen = new Set<string>();
  for (const d of signals) {
    const text = REC_BY_SIGNAL[d.id];
    if (text && !seen.has(text)) {
      seen.add(text);
      recommendations.push(text);
    }
    if (recommendations.length >= MAX_RECS) break;
  }

  if (
    recommendations.length === 0 &&
    (input.cockpit.saude === "critico" || input.cockpit.saude === "atencao")
  ) {
    recommendations.push("Acompanhar a saúde do caixa no Cockpit Financeiro.");
  }

  if (
    recommendations.length === 0 &&
    input.intelligence.saudeOperacao.status === "available" &&
    (input.intelligence.saudeOperacao.osAtrasadas ?? 0) > 0
  ) {
    recommendations.push("Observar o volume de OS atrasadas na operação.");
  }

  if (recommendations.length === 0 && status === "excelente") {
    recommendations.push("Manter o ritmo operacional do dia.");
  }

  return {
    status,
    statusLabel: EXECUTIVE_STATUS_LABEL[status],
    statusReason: reasonFor(status),
    // Contagem = ações do Plano (prioridades executáveis do dia).
    prioritiesCount: input.actionPlan.recommendations.length,
    priorities,
    recommendations,
  };
}

/** Helper de teste: títulos do resumo não devem coincidir com títulos do plano. */
export function summaryTitlesOverlapActionPlan(
  summaryTitles: string[],
  actionTitles: string[],
): boolean {
  const set = new Set(summaryTitles.map((t) => t.trim().toLowerCase()));
  return actionTitles.some((t) => set.has(t.trim().toLowerCase()));
}
