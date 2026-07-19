import { formatCurrency } from "@/lib/dashboard/format";
import {
  EXECUTIVE_ATINGIMENTO,
  EXECUTIVE_CRESCIMENTO_PP,
  EXECUTIVE_RITMO_PP,
} from "@/lib/intelligence/thresholds";
import type { ExecutiveIntelligenceInput } from "@/lib/intelligence/types";
import type {
  BusinessStatus,
  BusinessSummary,
} from "@/lib/business-intelligence/types";
import type { ExecutiveTone } from "@/lib/intelligence/types";

function statusTone(status: BusinessStatus): ExecutiveTone {
  switch (status) {
    case "critico":
      return "danger";
    case "atencao":
      return "warning";
    case "excelente":
    case "no_ritmo":
      return "success";
    case "recuperacao":
      return "info";
    default:
      return "info";
  }
}

/**
 * Resumo executivo narrativo — frases com suporte nos dados.
 */
export function buildBusinessSummary(
  input: ExecutiveIntelligenceInput,
): BusinessSummary {
  if (input.periodoFuturo) {
    return {
      headline: "A competência selecionada ainda não começou.",
      executiveSummary:
        "Indicadores permanecerão informativos até o primeiro dia útil com movimento.",
      status: "periodo_futuro",
      tone: "info",
    };
  }

  if (!input.possuiMeta) {
    const growth =
      input.crescimentoPeriodo !== null
        ? input.crescimentoPeriodo >= 0
          ? `o realizado está ${input.crescimentoPeriodo.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% acima da base anterior`
          : `o realizado está ${Math.abs(input.crescimentoPeriodo).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% abaixo da base anterior`
        : "ainda não há comparação com o mês anterior";
    return {
      headline: "Há movimento comercial, mas sem meta mensal de referência.",
      executiveSummary: `O realizado acumula ${formatCurrency(input.realizado)} com ${input.vendasQuantidade} venda(s); ${growth}. Cadastre a meta para medir ritmo e gap.`,
      status: "sem_meta",
      tone: "info",
    };
  }

  if (input.confianca === "baixa" && input.diasUteisDecorridos < 3) {
    return {
      headline: "O mês ainda tem amostra curta para conclusões fortes.",
      executiveSummary: `${input.confiancaMotivo} Realizado: ${formatCurrency(input.realizado)} em ${input.diasUteisDecorridos} dia(s) útil(is).`,
      status: "dados_insuficientes",
      tone: "info",
    };
  }

  const metaHit =
    input.atingimentoPercentual !== null &&
    input.atingimentoPercentual >= EXECUTIVE_ATINGIMENTO.metaAtingida;

  const belowRhythm =
    input.diferencaRitmoPp !== null &&
    input.diferencaRitmoPp <= EXECUTIVE_RITMO_PP.atencaoAbaixo;

  const criticalRhythm =
    input.diferencaRitmoPp !== null &&
    input.diferencaRitmoPp <= EXECUTIVE_RITMO_PP.criticoAbaixo;

  const recovering =
    input.tendencia === "crescente" && belowRhythm && !metaHit;

  const growing =
    input.crescimentoPeriodo !== null &&
    input.crescimentoPeriodo >= EXECUTIVE_CRESCIMENTO_PP.positivo;

  const shrinking =
    input.crescimentoPeriodo !== null &&
    input.crescimentoPeriodo <= EXECUTIVE_CRESCIMENTO_PP.negativo;

  if (metaHit) {
    return {
      headline: "A meta mensal já foi atingida.",
      executiveSummary: `O realizado (${formatCurrency(input.realizado)}) alcançou ${input.atingimentoPercentual!.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% da meta. A prioridade passa a proteger ticket e qualidade das vendas.`,
      status: "excelente",
      tone: statusTone("excelente"),
    };
  }

  if (recovering) {
    const ritmo = input.diferencaRitmoPp!.toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    });
    return {
      headline:
        "O mês iniciou abaixo do esperado, mas a tendência recente demonstra recuperação.",
      executiveSummary: `O ritmo ainda está ${ritmo} p.p. abaixo do esperado, porém a janela recente é crescente. Sustentar dias fortes reduz o gap (${input.gapMeta === null ? "—" : formatCurrency(input.gapMeta)}).`,
      status: "recuperacao",
      tone: statusTone("recuperacao"),
    };
  }

  if (criticalRhythm) {
    return {
      headline:
        "A operação está muito abaixo do ritmo necessário para a meta.",
      executiveSummary: `Diferença de ritmo de ${input.diferencaRitmoPp!.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p. A projeção útil (${formatCurrency(input.projecaoDiasUteis)}) e o restante da meta (${input.gapMeta === null ? "—" : formatCurrency(input.gapMeta)}) exigem aceleração imediata.`,
      status: "critico",
      tone: statusTone("critico"),
    };
  }

  if (belowRhythm && growing) {
    return {
      headline:
        "A operação apresenta crescimento de receita, porém permanece abaixo do ritmo necessário para atingir a meta.",
      executiveSummary: `Crescimento de ${input.crescimentoPeriodo!.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs a base anterior, enquanto o ritmo segue ${input.diferencaRitmoPp!.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p. abaixo do esperado.`,
      status: "atencao",
      tone: statusTone("atencao"),
    };
  }

  if (belowRhythm) {
    return {
      headline: "O ritmo atual ainda não cobre a trajetória da meta.",
      executiveSummary: `Ritmo ${input.diferencaRitmoPp!.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p. vs esperado. Restam ${input.diasUteisRestantes} dia(s) útil(is)${input.necessarioDiaUtil !== null ? ` com necessidade de ${formatCurrency(input.necessarioDiaUtil)}/dia` : ""}.`,
      status: "atencao",
      tone: statusTone("atencao"),
    };
  }

  if (shrinking && !belowRhythm) {
    return {
      headline:
        "O ritmo está razoável, mas o crescimento frente ao mês anterior é negativo.",
      executiveSummary: `Crescimento de ${input.crescimentoPeriodo!.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs a base anterior, com realizado em ${formatCurrency(input.realizado)}. Vale monitorar volume e ticket.`,
      status: "atencao",
      tone: statusTone("atencao"),
    };
  }

  if (
    input.diferencaRitmoPp !== null &&
    input.diferencaRitmoPp >= 0 &&
    growing
  ) {
    return {
      headline:
        "A operação está no ritmo da meta e com crescimento frente à base anterior.",
      executiveSummary: `Ritmo ${input.diferencaRitmoPp >= 0 ? "+" : ""}${input.diferencaRitmoPp.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p. e crescimento de ${input.crescimentoPeriodo!.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%. Projeção útil: ${formatCurrency(input.projecaoDiasUteis)}.`,
      status: "excelente",
      tone: statusTone("excelente"),
    };
  }

  return {
    headline: "A operação está no ritmo esperado para o ponto do mês.",
    executiveSummary: `Atingimento ${input.atingimentoPercentual === null ? "—" : `${input.atingimentoPercentual.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}, projeção útil ${formatCurrency(input.projecaoDiasUteis)} e tendência ${input.tendencia}.`,
    status: "no_ritmo",
    tone: statusTone("no_ritmo"),
  };
}
