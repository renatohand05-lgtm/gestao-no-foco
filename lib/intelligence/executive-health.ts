import { formatCurrency } from "@/lib/dashboard/format";
import { buildExecutiveScore } from "@/lib/intelligence/executive-score";
import { EXECUTIVE_SCORE_BANDS } from "@/lib/intelligence/thresholds";
import type {
  ExecutiveHealthResult,
  ExecutiveHealthStatus,
  ExecutiveIntelligenceInput,
  ExecutiveTone,
} from "@/lib/intelligence/types";

function healthStatus(
  percentage: number,
): { status: ExecutiveHealthStatus; tone: ExecutiveTone } {
  if (percentage <= EXECUTIVE_SCORE_BANDS.criticoMax) {
    return { status: "critica", tone: "danger" };
  }
  if (percentage <= EXECUTIVE_SCORE_BANDS.atencaoMax) {
    return { status: "atencao", tone: "warning" };
  }
  if (percentage <= EXECUTIVE_SCORE_BANDS.bomMax) {
    return { status: "saudavel", tone: "info" };
  }
  return { status: "excelente", tone: "success" };
}

/**
 * Saúde comercial — reutiliza o score com narrativa própria.
 */
export function buildExecutiveHealth(
  input: ExecutiveIntelligenceInput,
): ExecutiveHealthResult {
  const score = buildExecutiveScore(input);

  if (input.periodoFuturo) {
    return {
      percentage: null,
      status: "informativo",
      tone: "info",
      reason: "Período futuro — saúde comercial ainda não se aplica.",
      supportingMetrics: [],
    };
  }

  if (!input.possuiMeta) {
    return {
      percentage: null,
      status: "sem_meta",
      tone: "info",
      reason:
        "Cadastre a meta mensal para medir a saúde comercial com ritmo e projeção.",
      supportingMetrics: [
        {
          label: "Realizado",
          value: formatCurrency(input.realizado),
        },
        {
          label: "Vendas",
          value: String(input.vendasQuantidade),
        },
      ],
    };
  }

  const percentage = score.score ?? 0;
  const { status, tone } = healthStatus(percentage);

  const ritmoTxt =
    input.diferencaRitmoPp === null
      ? "ritmo indisponível"
      : `o ritmo atual está ${input.diferencaRitmoPp.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p. em relação ao esperado`;

  const projTxt =
    input.metaMensal && input.metaMensal > 0
      ? input.projecaoDiasUteis < input.metaMensal
        ? "a projeção útil permanece abaixo da meta"
        : "a projeção útil está no alvo ou acima da meta"
      : "projeção sem base de meta";

  const reason =
    status === "excelente"
      ? `Saúde excelente — ${ritmoTxt} e ${projTxt}.`
      : status === "saudavel"
        ? `Saúde saudável — ${ritmoTxt}; ${projTxt}.`
        : status === "atencao"
          ? `Saúde em atenção porque ${ritmoTxt} e ${projTxt}.`
          : `Saúde crítica porque ${ritmoTxt} e ${projTxt}.`;

  return {
    percentage,
    status,
    tone,
    reason,
    supportingMetrics: [
      {
        label: "Atingimento",
        value:
          input.atingimentoPercentual === null
            ? "—"
            : `${input.atingimentoPercentual.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`,
      },
      {
        label: "Projeção (úteis)",
        value: formatCurrency(input.projecaoDiasUteis),
      },
      {
        label: "Confiança",
        value: input.confianca,
      },
    ],
  };
}
