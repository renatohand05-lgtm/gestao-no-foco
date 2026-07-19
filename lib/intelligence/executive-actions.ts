import { formatCurrency } from "@/lib/dashboard/format";
import {
  EXECUTIVE_ATINGIMENTO,
  EXECUTIVE_NECESSARIO_RATIO,
  EXECUTIVE_RITMO_PP,
  EXECUTIVE_TICKET_PP,
} from "@/lib/intelligence/thresholds";
import type {
  ExecutiveActionResult,
  ExecutiveIntelligenceInput,
} from "@/lib/intelligence/types";

function vendasHref(input: ExecutiveIntelligenceInput) {
  return `/${input.tenantSlug}/vendas?dataDe=${input.dataDe}&dataAte=${input.dataAte}&status=faturado`;
}

function metaHref(input: ExecutiveIntelligenceInput) {
  if (input.metaId) {
    return `/${input.tenantSlug}/configuracoes/metas/${input.metaId}/editar`;
  }
  return `/${input.tenantSlug}/configuracoes/metas/nova?competencia=${input.competenciaYm}`;
}

/**
 * Uma única próxima ação — prioridade determinística.
 */
export function buildExecutiveAction(
  input: ExecutiveIntelligenceInput,
): ExecutiveActionResult {
  if (!input.possuiMeta) {
    return {
      title: "Cadastrar a meta do mês",
      description:
        "Sem meta, não há referência para gap, ritmo e probabilidade.",
      severity: "important",
      rationale: "Meta ausente bloqueia o diagnóstico completo.",
      actionLabel: "Cadastrar meta",
      href: metaHref(input),
    };
  }

  if (input.periodoFuturo) {
    return {
      title: "Preparar o início da competência",
      description: "Revise meta e pipeline antes do primeiro dia útil.",
      severity: "neutral",
      rationale: "Período ainda não iniciado.",
      actionLabel: "Ver meta",
      href: metaHref(input),
    };
  }

  if (
    input.atingimentoPercentual !== null &&
    input.atingimentoPercentual >= EXECUTIVE_ATINGIMENTO.metaAtingida
  ) {
    return {
      title: "Manter o ritmo e proteger o ticket médio",
      description:
        "A meta já foi atingida — preserve a qualidade das vendas e evite queda de ticket.",
      severity: "positive",
      rationale: "Meta atingida ou superada.",
      actionLabel: "Ver vendas",
      href: vendasHref(input),
    };
  }

  // 1. Risco crítico de ritmo
  if (
    input.diferencaRitmoPp !== null &&
    input.diferencaRitmoPp <= EXECUTIVE_RITMO_PP.criticoAbaixo
  ) {
    const nec = input.necessarioDiaUtil;
    return {
      title:
        nec !== null
          ? `Elevar a média diária para ${formatCurrency(nec)} nos próximos ${input.diasUteisRestantes} dias úteis`
          : "Recuperar o ritmo comercial com urgência",
      description:
        "O ritmo está muito abaixo do esperado — priorize dias consecutivos acima da meta diária.",
      severity: "critical",
      rationale: `Ritmo ${input.diferencaRitmoPp.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p. vs esperado.`,
      actionLabel: "Abrir vendas",
      href: vendasHref(input),
    };
  }

  // 2. Necessário/dia muito acima da média
  if (
    input.necessarioDiaUtil !== null &&
    input.mediaDiariaUtil > 0 &&
    input.necessarioDiaUtil / input.mediaDiariaUtil >=
      EXECUTIVE_NECESSARIO_RATIO.muitoAcima &&
    input.diasUteisRestantes > 0
  ) {
    return {
      title: `Elevar a média diária para ${formatCurrency(input.necessarioDiaUtil)} nos próximos ${input.diasUteisRestantes} dias úteis`,
      description: `A média atual (${formatCurrency(input.mediaDiariaUtil)}) não cobre o necessário por dia útil.`,
      severity: "critical",
      rationale: "Necessário/dia útil muito acima da média corrente.",
      actionLabel: "Abrir vendas",
      href: vendasHref(input),
    };
  }

  // 3. Tendência de queda
  if (input.tendencia === "decrescente") {
    return {
      title: "Recuperar dois dias consecutivos acima da meta diária",
      description:
        "A tendência recente é de queda — interrompa a sequência fraca com dias fortes.",
      severity: "important",
      rationale: "Tendência decrescente na janela recente.",
      actionLabel: "Ver vendas",
      href: vendasHref(input),
    };
  }

  // 4. Ticket em queda
  if (
    input.ticketVariacaoPct !== null &&
    input.ticketVariacaoPct <= EXECUTIVE_TICKET_PP.quedaRelevante
  ) {
    return {
      title: "Recuperar o ticket médio das vendas",
      description: `Ticket caiu ${input.ticketVariacaoPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs a base anterior.`,
      severity: "important",
      rationale: "Queda relevante de ticket médio.",
      actionLabel: "Ver vendas",
      href: vendasHref(input),
    };
  }

  // 5. Confiança baixa
  if (input.confianca === "baixa") {
    return {
      title: "Acumular mais dias úteis com movimento",
      description: input.confiancaMotivo,
      severity: "neutral",
      rationale: "Confiança baixa — evite conclusões absolutas.",
      actionLabel: "Ver vendas",
      href: vendasHref(input),
    };
  }

  // 6/7. Manter ritmo
  if (
    input.diferencaRitmoPp !== null &&
    input.diferencaRitmoPp >= 0
  ) {
    return {
      title: "Manter o ritmo atual e proteger o ticket médio",
      description:
        "O ritmo está no alvo ou acima — preserve a consistência diária.",
      severity: "positive",
      rationale: "Ritmo adequado ao ponto do mês.",
      actionLabel: "Acompanhar vendas",
      href: vendasHref(input),
    };
  }

  return {
    title:
      input.necessarioDiaUtil !== null
        ? `Buscar média diária próxima de ${formatCurrency(input.necessarioDiaUtil)}`
        : "Acelerar o faturamento nos próximos dias úteis",
    description: "Há espaço para recuperar o ritmo antes do fechamento.",
    severity: "important",
    rationale: "Ritmo ainda abaixo do ideal.",
    actionLabel: "Ver vendas",
    href: vendasHref(input),
  };
}
