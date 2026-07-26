/**
 * Morning Brief + resumo executivo (Gate 20.7).
 * Texto determinístico · somente dados internos.
 */

import { formatPredictiveMoney } from "../predictive/format.ts";
import type {
  EccExecutiveScore,
  EccMorningBrief,
  EccOpportunityItem,
  EccRiskItem,
} from "./types.ts";

export type EccHojeKpis = {
  faturamentoHoje?: number | null;
  metaHoje?: number | null;
  percentualHoje?: number | null;
  ticketMedioHoje?: number | null;
  /** Ticket médio do mês (DashboardHojeSnapshot.mes.ticket_medio). */
  ticketMedioMes?: number | null;
  faturamentoMes?: number | null;
  metaMes?: number | null;
  percentualMes?: number | null;
  projecaoFechamento?: number | null;
};

function greetingFromHour(date: Date): string {
  const h = date.getHours();
  if (h < 12) return "Bom dia.";
  if (h < 18) return "Boa tarde.";
  return "Boa noite.";
}

function estimateQuickWinPotential(
  quickWins: EccOpportunityItem[],
): string | null {
  // Só usa labels já presentes (não soma inventada).
  const withLabel = quickWins.filter((q) => q.potentialGainLabel);
  if (withLabel.length === 0) return null;
  if (withLabel.length === 1) return withLabel[0].potentialGainLabel;
  return `${withLabel.length} quick wins com impacto evidenciado`;
}

function cashRiskLine(risks: EccRiskItem[]): string | null {
  const cash = risks.find((r) =>
    /fluxo|caixa|saldo|cash/i.test(`${r.title} ${r.description} ${r.category}`),
  );
  if (!cash) return null;
  return cash.description.length > 120
    ? `${cash.title}.`
    : cash.description.endsWith(".")
      ? cash.description
      : `${cash.description}.`;
}

/**
 * Gera o Executive Morning Brief a partir do estado agregado.
 */
export function buildMorningBrief(params: {
  score: EccExecutiveScore;
  criticalDecisionsCount: number;
  pendingDecisionsCount: number;
  risks: EccRiskItem[];
  quickWins: EccOpportunityItem[];
  generatedAt: string;
  greetingOverride?: string | null;
}): EccMorningBrief {
  const when = new Date(params.generatedAt);
  const greetingLine =
    params.greetingOverride?.trim() ||
    (Number.isNaN(when.getTime())
      ? "Olá."
      : greetingFromHour(when));

  const paragraphs: string[] = [];

  if (params.criticalDecisionsCount > 0) {
    paragraphs.push(
      params.criticalDecisionsCount === 1
        ? "Hoje existe 1 decisão crítica."
        : `Hoje existem ${params.criticalDecisionsCount} decisões críticas.`,
    );
  } else if (params.pendingDecisionsCount > 0) {
    paragraphs.push(
      params.pendingDecisionsCount === 1
        ? "Há 1 decisão na fila executiva."
        : `Há ${params.pendingDecisionsCount} decisões na fila executiva.`,
    );
  } else {
    paragraphs.push("Não há decisões críticas priorizadas neste momento.");
  }

  if (params.score.value != null) {
    paragraphs.push(
      `Seu Executive Score é ${params.score.value}.`,
    );
  } else {
    paragraphs.push("Executive Score indisponível por cobertura insuficiente.");
  }

  const cash = cashRiskLine(params.risks);
  if (cash) {
    paragraphs.push(cash);
  } else if (params.risks[0]) {
    paragraphs.push(
      `Principal risco em evidência: ${params.risks[0].title}.`,
    );
  }

  const qw = estimateQuickWinPotential(params.quickWins);
  if (qw) {
    paragraphs.push(
      `Há potencial evidenciado nos Quick Wins sugeridos (${qw}).`,
    );
  }

  const fullText = [greetingLine, "", ...paragraphs].join("\n");

  return { greetingLine, paragraphs, fullText };
}

export function buildSummaryLine(params: {
  score: EccExecutiveScore;
  criticalDecisionsCount: number;
  risksCount: number;
  opportunitiesCount: number;
}): string {
  const score =
    params.score.value == null ? "indisponível" : String(params.score.value);
  return `Score ${score} · ${params.criticalDecisionsCount} crítica${params.criticalDecisionsCount === 1 ? "" : "s"} · ${params.risksCount} risco${params.risksCount === 1 ? "" : "s"} · ${params.opportunitiesCount} oportunidade${params.opportunitiesCount === 1 ? "" : "s"}.`;
}

export function formatMoneyOrUnavailable(
  n: number | null | undefined,
): string {
  if (n == null || !Number.isFinite(n)) return "Indisponível";
  return formatPredictiveMoney(n);
}
