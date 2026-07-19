import { formatCurrency } from "@/lib/dashboard/format";
import {
  EXECUTIVE_PROJECAO_RATIO,
  EXECUTIVE_RITMO_PP,
  EXECUTIVE_TICKET_PP,
} from "@/lib/intelligence/thresholds";
import type { ExecutiveIntelligenceInput } from "@/lib/intelligence/types";
import type { BusinessRisk } from "@/lib/business-intelligence/types";

const MAX_RISKS = 5;

/**
 * Até 5 riscos com severidade e impacto — só com suporte nos dados.
 */
export function buildBusinessRisks(
  input: ExecutiveIntelligenceInput,
): BusinessRisk[] {
  const risks: BusinessRisk[] = [];

  if (!input.possuiMeta) {
    risks.push({
      id: "risco-sem-meta",
      severity: "media",
      title: "Sem meta para ancorar o fechamento",
      description:
        "Sem meta mensal o painel não consegue quantificar gap nem probabilidade de atingimento.",
      impact: "Decisões de aceleração ficam sem referência objetiva.",
    });
  }

  if (
    input.possuiMeta &&
    input.metaMensal !== null &&
    input.metaMensal > 0 &&
    input.projecaoDiasUteis < input.metaMensal
  ) {
    const gap = input.metaMensal - input.projecaoDiasUteis;
    const ratio = input.projecaoDiasUteis / input.metaMensal;
    risks.push({
      id: "risco-projecao",
      severity: ratio < EXECUTIVE_PROJECAO_RATIO.critico ? "alta" : "media",
      title: "Projeção indica fechamento abaixo da meta",
      description: `Projeção útil em ${formatCurrency(input.projecaoDiasUteis)} vs meta ${formatCurrency(input.metaMensal)} (gap projetado ${formatCurrency(gap)}).`,
      impact: `Shortfall estimado de ${formatCurrency(gap)} no cenário útil atual.`,
    });
  }

  if (
    input.diferencaRitmoPp !== null &&
    input.diferencaRitmoPp <= EXECUTIVE_RITMO_PP.criticoAbaixo
  ) {
    risks.push({
      id: "risco-ritmo",
      severity: "alta",
      title: "Ritmo crítico frente ao esperado",
      description: `Diferença de ${input.diferencaRitmoPp.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p. no ritmo.`,
      impact: "Alta pressão sobre a meta se o padrão se mantiver.",
    });
  }

  if (input.confianca === "baixa") {
    risks.push({
      id: "risco-confianca",
      severity: "media",
      title: "Confiança baixa na leitura",
      description: input.confiancaMotivo,
      impact:
        "Evite decisões absolutas com base apenas na projeção neste momento.",
    });
  }

  if (
    input.ticketVariacaoPct !== null &&
    input.ticketVariacaoPct <= EXECUTIVE_TICKET_PP.quedaRelevante
  ) {
    risks.push({
      id: "risco-ticket",
      severity: "media",
      title: "Ticket médio em queda",
      description: `Variação de ${input.ticketVariacaoPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs a base anterior.`,
      impact: "Mesmo volume pode não sustentar a receita planejada.",
    });
  }

  if (input.tendencia === "decrescente") {
    risks.push({
      id: "risco-tendencia",
      severity: "media",
      title: "Tendência recente de queda",
      description: "A janela recente de movimento aponta desaceleração.",
      impact: "Pode deteriorar a projeção útil se não for interrompida.",
    });
  }

  // Risco baixo informativo (estabilidade de ticket) — só se não houver risco de ticket
  if (
    input.ticketVariacaoPct !== null &&
    Math.abs(input.ticketVariacaoPct) < Math.abs(EXECUTIVE_TICKET_PP.quedaRelevante) &&
    !risks.some((r) => r.id === "risco-ticket")
  ) {
    risks.push({
      id: "risco-ticket-estavel",
      severity: "baixa",
      title: "Ticket médio estável",
      description: `Variação de ${input.ticketVariacaoPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% — sem movimento relevante.`,
      impact: "Baixo risco de diluição de receita por ticket neste recorte.",
    });
  }

  const order = { alta: 0, media: 1, baixa: 2 } as const;
  return risks
    .sort((a, b) => order[a.severity] - order[b.severity])
    .slice(0, MAX_RISKS);
}
