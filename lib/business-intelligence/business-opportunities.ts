import { formatCurrency } from "@/lib/dashboard/format";
import {
  EXECUTIVE_NECESSARIO_RATIO,
  EXECUTIVE_TICKET_PP,
} from "@/lib/intelligence/thresholds";
import type { ExecutiveIntelligenceInput } from "@/lib/intelligence/types";
import type { BusinessOpportunity } from "@/lib/business-intelligence/types";
import type { CommercialPanelData } from "@/types/commercial-panel";

const MAX_OPPS = 5;

/**
 * Até 5 oportunidades — só com suporte factual no payload.
 */
export function buildBusinessOpportunities(
  input: ExecutiveIntelligenceInput,
  panel?: CommercialPanelData,
): BusinessOpportunity[] {
  const opps: BusinessOpportunity[] = [];

  if (
    input.possuiMeta &&
    input.necessarioDiaUtil !== null &&
    input.mediaDiariaUtil > 0 &&
    input.diasUteisRestantes > 0 &&
    input.necessarioDiaUtil > input.mediaDiariaUtil
  ) {
    const delta = input.necessarioDiaUtil - input.mediaDiariaUtil;
    const ratio = input.necessarioDiaUtil / input.mediaDiariaUtil;
    if (ratio >= EXECUTIVE_NECESSARIO_RATIO.acima) {
      opps.push({
        id: "opp-media-diaria",
        title: "Elevar a média diária útil",
        description: `Se a média diária aumentar ${formatCurrency(delta)} (de ${formatCurrency(input.mediaDiariaUtil)} para ${formatCurrency(input.necessarioDiaUtil)}), o gap residual fica alinhado ao necessário por dia útil.`,
        estimatedImpact: `Alvo diário: ${formatCurrency(input.necessarioDiaUtil)} nos próximos ${input.diasUteisRestantes} dia(s) útil(is).`,
      });
    }
  }

  if (
    input.ticketVariacaoPct !== null &&
    input.ticketVariacaoPct >= EXECUTIVE_TICKET_PP.altaRelevante
  ) {
    opps.push({
      id: "opp-ticket",
      title: "Proteger o ganho de ticket",
      description: `O ticket está ${input.ticketVariacaoPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% acima da base anterior (${formatCurrency(input.ticketAnterior)} → ${formatCurrency(input.ticketAtual)}). Manter esta tendência fortalece a receita por venda.`,
      estimatedImpact: "Sustenta score e eficiência de faturamento sem depender só de volume.",
    });
  }

  if (input.tendencia === "crescente") {
    opps.push({
      id: "opp-tendencia",
      title: "Converter a tendência crescente em dias consecutivos fortes",
      description:
        "A janela recente aponta aceleração — dois a três dias seguidos acima da meta diária consolidam a recuperação.",
      estimatedImpact: "Melhora ritmo atual e confiança da projeção.",
    });
  }

  if (
    input.possuiMeta &&
    input.probabilidadeScore >= 40 &&
    input.probabilidadeScore < 70 &&
    input.necessarioDiaUtil !== null &&
    input.mediaDiariaUtil > 0
  ) {
    const lift = Math.max(0, input.necessarioDiaUtil - input.mediaDiariaUtil);
    if (lift > 0) {
      opps.push({
        id: "opp-prob",
        title: "Subir a probabilidade com ritmo diário",
        description: `A probabilidade atual é ${input.probabilidadeMeta.replaceAll("_", " ")} (${input.probabilidadeScore}/100). Aproximar a média diária de ${formatCurrency(input.necessarioDiaUtil)} tende a migrar a leitura para faixas melhores.`,
        estimatedImpact: `Incremento diário de referência: ${formatCurrency(lift)}.`,
      });
    }
  }

  // Onde: melhor centro — só se o painel trouxer centros com realizado
  const centros = panel?.centros ?? [];
  if (centros.length > 0) {
    const ranked = [...centros].sort(
      (a, b) => b.faturamento_realizado - a.faturamento_realizado,
    );
    const top = ranked[0];
    if (top && top.faturamento_realizado > 0) {
      opps.push({
        id: "opp-centro",
        title: `Reforçar o centro ${top.centro_nome}`,
        description: `${top.centro_nome} lidera o faturamento do recorte (${formatCurrency(top.faturamento_realizado)})${top.percentual_atingido !== null ? ` com atingimento de ${top.percentual_atingido.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%` : ""}.`,
        estimatedImpact:
          "Concentrar esforço onde o desempenho já é comprovado no período.",
      });
    }
  }

  if (!input.possuiMeta) {
    opps.push({
      id: "opp-cadastrar-meta",
      title: "Cadastrar a meta mensal",
      description:
        "Com a meta ativa, o painel passa a calcular gap, ritmo e probabilidade com precisão.",
      estimatedImpact: "Desbloqueia a leitura completa de fechamento.",
    });
  }

  return opps.slice(0, MAX_OPPS);
}
