import { formatCurrency } from "@/lib/dashboard/format";
import {
  EXECUTIVE_CRESCIMENTO_PP,
  EXECUTIVE_NECESSARIO_RATIO,
  EXECUTIVE_RITMO_PP,
  EXECUTIVE_TICKET_PP,
} from "@/lib/intelligence/thresholds";
import type { ExecutiveIntelligenceInput } from "@/lib/intelligence/types";
import type { BusinessCause } from "@/lib/business-intelligence/types";

type Candidate = BusinessCause & { weight: number };

/**
 * Principal causa do cenário — uma só, com métricas de suporte.
 */
export function buildBusinessCause(
  input: ExecutiveIntelligenceInput,
): BusinessCause {
  if (!input.possuiMeta) {
    return {
      title: "Ausência de meta mensal",
      description:
        "Sem meta cadastrada não há referência para ritmo, gap e probabilidade.",
      confidence: "alta",
      supportingMetrics: [
        { label: "Realizado", value: formatCurrency(input.realizado) },
        { label: "Vendas", value: String(input.vendasQuantidade) },
      ],
    };
  }

  if (input.periodoFuturo) {
    return {
      title: "Competência ainda não iniciada",
      description: "Não há causa operacional enquanto o período não começa.",
      confidence: "alta",
      supportingMetrics: [],
    };
  }

  const candidates: Candidate[] = [];

  if (
    input.diferencaRitmoPp !== null &&
    input.diferencaRitmoPp <= EXECUTIVE_RITMO_PP.atencaoAbaixo
  ) {
    candidates.push({
      weight:
        input.diferencaRitmoPp <= EXECUTIVE_RITMO_PP.criticoAbaixo ? 100 : 80,
      title: "Ritmo abaixo da meta",
      description: `O ritmo atual está ${input.diferencaRitmoPp.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p. em relação ao esperado para o ponto do mês.`,
      confidence: input.confianca,
      supportingMetrics: [
        {
          label: "Diff ritmo",
          value: `${input.diferencaRitmoPp.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p.`,
        },
        {
          label: "Atingimento",
          value:
            input.atingimentoPercentual === null
              ? "—"
              : `${input.atingimentoPercentual.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`,
        },
      ],
    });
  }

  if (
    input.ticketVariacaoPct !== null &&
    input.ticketVariacaoPct <= EXECUTIVE_TICKET_PP.quedaRelevante
  ) {
    candidates.push({
      weight: 70,
      title: "Ticket médio em queda",
      description: `O ticket caiu ${input.ticketVariacaoPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs a base anterior (${formatCurrency(input.ticketAnterior)} → ${formatCurrency(input.ticketAtual)}).`,
      confidence: input.confianca,
      supportingMetrics: [
        { label: "Ticket atual", value: formatCurrency(input.ticketAtual) },
        {
          label: "Variação",
          value: `${input.ticketVariacaoPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`,
        },
      ],
    });
  }

  if (
    input.crescimentoPeriodo !== null &&
    input.crescimentoPeriodo <= EXECUTIVE_CRESCIMENTO_PP.negativo
  ) {
    candidates.push({
      weight: 65,
      title: "Crescimento negativo vs mês anterior",
      description: `O realizado está ${input.crescimentoPeriodo.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% abaixo da base do mês anterior.`,
      confidence: input.confianca,
      supportingMetrics: [
        { label: "Realizado", value: formatCurrency(input.realizado) },
        {
          label: "Crescimento",
          value: `${input.crescimentoPeriodo.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`,
        },
      ],
    });
  }

  if (input.diasUteisDecorridos < 3 || input.vendasQuantidade < 3) {
    candidates.push({
      weight: 55,
      title: "Poucos dias úteis ou vendas na amostra",
      description: input.confiancaMotivo,
      confidence: "baixa",
      supportingMetrics: [
        {
          label: "Dias úteis",
          value: String(input.diasUteisDecorridos),
        },
        { label: "Vendas", value: String(input.vendasQuantidade) },
      ],
    });
  }

  if (
    input.necessarioDiaUtil !== null &&
    input.mediaDiariaUtil > 0 &&
    input.necessarioDiaUtil / input.mediaDiariaUtil >=
      EXECUTIVE_NECESSARIO_RATIO.muitoAcima
  ) {
    candidates.push({
      weight: 85,
      title: "Receita acumulada baixa para o ponto do mês",
      description: `A média útil (${formatCurrency(input.mediaDiariaUtil)}) está bem abaixo do necessário (${formatCurrency(input.necessarioDiaUtil)}) nos ${input.diasUteisRestantes} dia(s) restante(s).`,
      confidence: input.confianca,
      supportingMetrics: [
        {
          label: "Média útil",
          value: formatCurrency(input.mediaDiariaUtil),
        },
        {
          label: "Necessário/dia",
          value: formatCurrency(input.necessarioDiaUtil),
        },
      ],
    });
  }

  if (candidates.length === 0) {
    return {
      title: "Sem causa dominante de risco",
      description:
        "Os indicadores disponíveis não apontam um fator único de pressão no momento.",
      confidence: input.confianca,
      supportingMetrics: [
        {
          label: "Ritmo",
          value:
            input.diferencaRitmoPp === null
              ? "—"
              : `${input.diferencaRitmoPp.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p.`,
        },
        {
          label: "Tendência",
          value: input.tendencia,
        },
      ],
    };
  }

  candidates.sort((a, b) => b.weight - a.weight);
  const top = candidates[0]!;
  return {
    title: top.title,
    description: top.description,
    confidence: top.confidence,
    supportingMetrics: top.supportingMetrics,
  };
}
