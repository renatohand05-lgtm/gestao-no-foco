/**
 * Camada de apresentação executiva (Sprint 13.9).
 * Somente composição e rótulos — zero cálculos, zero I/O.
 */

import type { BusinessStatus } from "@/lib/business-intelligence/types";
import type { ExecutiveInsightCategory } from "@/lib/intelligence/types";

export type PresentationPriority = "critical" | "high" | "medium" | "info";

export type PresentationContext =
  | "positive"
  | "attention"
  | "critical"
  | "informational"
  | "sem_meta"
  | "sem_dados"
  | "poucos_dados"
  | "periodo_futuro"
  | "mes_encerrado"
  | "meta_atingida"
  | "meta_superada";

export type ExecutiveNarrative = {
  /** Frase 1 — estado / desvio */
  lead: string;
  /** Frase 2 — tendência / prioridade (opcional) */
  support: string | null;
  lowConfidence: boolean;
  confidenceNote: string | null;
  context: PresentationContext;
  priority: PresentationPriority;
};

export function mapBusinessStatusToContext(
  status: BusinessStatus,
): PresentationContext {
  switch (status) {
    case "critico":
      return "critical";
    case "atencao":
    case "recuperacao":
      return "attention";
    case "excelente":
    case "no_ritmo":
      return "positive";
    case "sem_meta":
      return "sem_meta";
    case "periodo_futuro":
      return "periodo_futuro";
    case "dados_insuficientes":
      return "poucos_dados";
    default:
      return "informational";
  }
}

export function mapBusinessStatusToPriority(
  status: BusinessStatus,
): PresentationPriority {
  switch (status) {
    case "critico":
      return "critical";
    case "atencao":
    case "recuperacao":
      return "high";
    case "no_ritmo":
    case "excelente":
      return "medium";
    default:
      return "info";
  }
}

export function mapInsightCategoryToPriority(
  category: ExecutiveInsightCategory,
): PresentationPriority {
  switch (category) {
    case "critical":
      return "critical";
    case "important":
      return "high";
    case "positive":
      return "medium";
    default:
      return "info";
  }
}

/**
 * Compõe narrativa curta a partir de textos já produzidos pelos motores.
 * Não altera números, não infere causas novas.
 */
export function composeExecutiveNarrative(input: {
  headline: string;
  executiveSummary: string;
  status: BusinessStatus;
  confidence?: "baixa" | "media" | "alta";
  confidenceReason?: string | null;
}): ExecutiveNarrative {
  const lead = input.headline.trim();
  const support = input.executiveSummary.trim() || null;
  const lowConfidence =
    input.confidence === "baixa" ||
    input.status === "dados_insuficientes" ||
    input.status === "periodo_futuro";

  return {
    lead,
    support,
    lowConfidence,
    confidenceNote:
      lowConfidence && input.confidenceReason?.trim()
        ? input.confidenceReason.trim()
        : lowConfidence
          ? "Confiança limitada — dados insuficientes para conclusão forte."
          : null,
    context: mapBusinessStatusToContext(input.status),
    priority: mapBusinessStatusToPriority(input.status),
  };
}

export const CONTEXT_LABEL: Record<PresentationContext, string> = {
  positive: "Situação positiva",
  attention: "Atenção",
  critical: "Crítico",
  informational: "Informativo",
  sem_meta: "Sem meta",
  sem_dados: "Sem dados",
  poucos_dados: "Poucos dados",
  periodo_futuro: "Período futuro",
  mes_encerrado: "Mês encerrado",
  meta_atingida: "Meta atingida",
  meta_superada: "Meta superada",
};

export const PRIORITY_LABEL: Record<PresentationPriority, string> = {
  critical: "Crítico",
  high: "Alta prioridade",
  medium: "Média prioridade",
  info: "Informativo",
};
