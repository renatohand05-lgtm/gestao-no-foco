import { formatCurrency } from "@/lib/dashboard/format";
import {
  EXECUTIVE_ATINGIMENTO,
  EXECUTIVE_CRESCIMENTO_PP,
  EXECUTIVE_INSIGHT_PRIORITY,
  EXECUTIVE_INSIGHTS_MAX,
  EXECUTIVE_NECESSARIO_RATIO,
  EXECUTIVE_PROJECAO_RATIO,
  EXECUTIVE_RITMO_PP,
  EXECUTIVE_TICKET_PP,
} from "@/lib/intelligence/thresholds";
import type {
  ExecutiveInsight,
  ExecutiveInsightCategory,
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

function push(
  list: ExecutiveInsight[],
  insight: Omit<ExecutiveInsight, "priority"> & {
    category: ExecutiveInsightCategory;
  },
) {
  list.push({
    ...insight,
    priority: EXECUTIVE_INSIGHT_PRIORITY[insight.category],
  });
}

/**
 * Insights determinísticos (3–6), sem repetir o mesmo problema.
 */
export function buildExecutiveInsights(
  input: ExecutiveIntelligenceInput,
): ExecutiveInsight[] {
  const out: ExecutiveInsight[] = [];
  const seen = new Set<string>();

  const add = (
    insight: Omit<ExecutiveInsight, "priority"> & {
      category: ExecutiveInsightCategory;
    },
  ) => {
    if (seen.has(insight.id)) return;
    seen.add(insight.id);
    push(out, insight);
  };

  if (!input.possuiMeta) {
    add({
      id: "sem-meta",
      category: "important",
      title: "Meta mensal ausente",
      description:
        "Sem meta, o painel não consegue medir gap, ritmo e probabilidade.",
      impact: "Decisão comercial fica sem referência objetiva.",
      recommendation: "Cadastre a meta do mês para ativar a inteligência.",
      actionLabel: "Cadastrar meta",
      href: metaHref(input),
    });
  }

  if (input.periodoFuturo) {
    add({
      id: "periodo-futuro",
      category: "informative",
      title: "Período ainda não iniciado",
      description: "Aguarde o início da competência para acompanhar o ritmo.",
      impact: "Indicadores permanecerão informativos até haver movimento.",
      recommendation: "Revise o planejamento e a meta cadastrada.",
      actionLabel: "Ver metas",
      href: metaHref(input),
    });
  }

  if (
    input.possuiMeta &&
    input.atingimentoPercentual !== null &&
    input.atingimentoPercentual >= EXECUTIVE_ATINGIMENTO.metaAtingida
  ) {
    add({
      id: "meta-atingida",
      category: "positive",
      title: "Meta atingida",
      description: `O realizado já alcançou ${input.atingimentoPercentual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% da meta.`,
      impact: "Objetivo do mês conquistado.",
      recommendation: "Proteja o ticket e busque superação sustentável.",
      actionLabel: "Ver vendas",
      href: vendasHref(input),
    });
  }

  if (
    input.possuiMeta &&
    input.diferencaRitmoPp !== null &&
    input.diferencaRitmoPp <= EXECUTIVE_RITMO_PP.criticoAbaixo &&
    !seen.has("meta-atingida")
  ) {
    add({
      id: "ritmo-critico",
      category: "critical",
      title: "Ritmo muito abaixo do esperado",
      description: `Diferença de ${input.diferencaRitmoPp.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p. versus o ritmo esperado.`,
      impact: "Fecha o mês em risco elevado se o padrão continuar.",
      recommendation: "Priorize dias consecutivos acima da meta diária útil.",
      actionLabel: "Abrir vendas",
      href: vendasHref(input),
    });
  } else if (
    input.possuiMeta &&
    input.diferencaRitmoPp !== null &&
    input.diferencaRitmoPp <= EXECUTIVE_RITMO_PP.atencaoAbaixo &&
    !seen.has("ritmo-critico") &&
    !seen.has("meta-atingida")
  ) {
    add({
      id: "ritmo-atencao",
      category: "important",
      title: "Ritmo abaixo do esperado",
      description: `Ritmo atual ${input.diferencaRitmoPp.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p. em relação ao esperado.`,
      impact: "Atingimento da meta fica pressionado.",
      recommendation: "Recupere o ritmo com foco nos próximos dias úteis.",
      actionLabel: "Ver vendas",
      href: vendasHref(input),
    });
  }

  if (
    input.possuiMeta &&
    input.metaMensal &&
    input.metaMensal > 0 &&
    input.projecaoDiasUteis / input.metaMensal <
      EXECUTIVE_PROJECAO_RATIO.atencao &&
    !seen.has("meta-atingida")
  ) {
    const ratio = input.projecaoDiasUteis / input.metaMensal;
    add({
      id: "projecao-abaixo",
      category:
        ratio < EXECUTIVE_PROJECAO_RATIO.critico ? "critical" : "important",
      title: "Projeção abaixo da meta",
      description: `Projeção útil em ${(ratio * 100).toFixed(0)}% da meta (${formatCurrency(input.projecaoDiasUteis)}).`,
      impact: "Cenário de fechamento indica shortfall.",
      recommendation: "Eleve a média diária útil restante.",
      actionLabel: "Ver vendas",
      href: vendasHref(input),
    });
  }

  if (
    input.possuiMeta &&
    (input.probabilidadeMeta === "alta" ||
      input.probabilidadeMeta === "muito_alta") &&
    !seen.has("meta-atingida")
  ) {
    add({
      id: "prob-alta",
      category: "positive",
      title: "Meta provavelmente atingida",
      description: `Probabilidade ${input.probabilidadeMeta.replace("_", " ")} (${input.probabilidadeScore}/100).`,
      impact: "Cenário favorável de fechamento.",
      recommendation: "Mantenha o ritmo e evite queda de ticket.",
      actionLabel: "Acompanhar vendas",
      href: vendasHref(input),
    });
  }

  if (input.tendencia === "crescente") {
    add({
      id: "tend-up",
      category: "positive",
      title: "Tendência crescente",
      description: "Os últimos dias com movimento apontam aceleração.",
      impact: "Suporte positivo à projeção.",
      recommendation: "Sustente o padrão dos melhores dias.",
      actionLabel: "Ver vendas",
      href: vendasHref(input),
    });
  } else if (input.tendencia === "decrescente") {
    add({
      id: "tend-down",
      category: "important",
      title: "Tendência decrescente",
      description: "A janela recente indica desaceleração.",
      impact: "Pode comprometer a projeção útil.",
      recommendation: "Investigue causas e recupere dois dias fortes.",
      actionLabel: "Ver vendas",
      href: vendasHref(input),
    });
  }

  if (
    input.ticketVariacaoPct !== null &&
    input.ticketVariacaoPct <= EXECUTIVE_TICKET_PP.quedaRelevante
  ) {
    add({
      id: "ticket-down",
      category: "important",
      title: "Ticket médio em queda",
      description: `Variação de ${input.ticketVariacaoPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs período anterior.`,
      impact: "Mesmo volume pode não sustentar a receita.",
      recommendation: "Revise mix e ticket por venda.",
      actionLabel: "Ver vendas",
      href: vendasHref(input),
    });
  } else if (
    input.ticketVariacaoPct !== null &&
    input.ticketVariacaoPct >= EXECUTIVE_TICKET_PP.altaRelevante
  ) {
    add({
      id: "ticket-up",
      category: "positive",
      title: "Ticket médio em alta",
      description: `Variação de +${input.ticketVariacaoPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%.`,
      impact: "Melhora a eficiência de receita por venda.",
      recommendation: "Proteja o ganho de ticket.",
      actionLabel: "Ver vendas",
      href: vendasHref(input),
    });
  }

  if (
    input.crescimentoPeriodo !== null &&
    input.crescimentoPeriodo <= EXECUTIVE_CRESCIMENTO_PP.negativo
  ) {
    add({
      id: "cresc-neg",
      category: "important",
      title: "Crescimento negativo",
      description: `Realizado ${input.crescimentoPeriodo.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs período anterior.`,
      impact: "Base comparativa em retração.",
      recommendation: "Foque em recuperar volume e ticket.",
      actionLabel: "Ver vendas",
      href: vendasHref(input),
    });
  } else if (
    input.crescimentoPeriodo !== null &&
    input.crescimentoPeriodo >= EXECUTIVE_CRESCIMENTO_PP.positivo
  ) {
    add({
      id: "cresc-pos",
      category: "positive",
      title: "Crescimento positivo",
      description: `Realizado +${input.crescimentoPeriodo.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs período anterior.`,
      impact: "Trajetória favorável versus a base anterior.",
      recommendation: "Consolide o ganho sem afrouxar o ritmo.",
      actionLabel: "Ver vendas",
      href: vendasHref(input),
    });
  }

  if (input.confianca === "baixa") {
    add({
      id: "conf-baixa",
      category: "informative",
      title: "Confiança baixa na projeção",
      description: input.confiancaMotivo,
      impact: "Evite decisões absolutas com base só na projeção.",
      recommendation: "Acumule mais dias úteis com movimento.",
      actionLabel: "Ver vendas",
      href: vendasHref(input),
    });
  }

  if (input.tendenciaInsuficiente || input.tendencia === "insuficiente") {
    add({
      id: "poucos-dados",
      category: "informative",
      title: "Poucos dados na janela recente",
      description: "A tendência ainda não tem amostra suficiente.",
      impact: "Leitura de aceleração fica limitada.",
      recommendation: "Acompanhe os próximos dias úteis de perto.",
      actionLabel: "Ver vendas",
      href: vendasHref(input),
    });
  }

  if (
    input.possuiMeta &&
    input.necessarioDiaUtil !== null &&
    input.mediaDiariaUtil > 0 &&
    input.necessarioDiaUtil / input.mediaDiariaUtil >=
      EXECUTIVE_NECESSARIO_RATIO.muitoAcima &&
    input.diasUteisRestantes > 0 &&
    !seen.has("meta-atingida")
  ) {
    add({
      id: "nec-acima",
      category: "critical",
      title: "Necessário por dia muito acima da média",
      description: `É preciso ${formatCurrency(input.necessarioDiaUtil)}/dia útil vs média atual ${formatCurrency(input.mediaDiariaUtil)}.`,
      impact: "Gap residual exige aceleração forte.",
      recommendation: `Eleve a média diária nos próximos ${input.diasUteisRestantes} dias úteis.`,
      actionLabel: "Abrir vendas",
      href: vendasHref(input),
    });
  }

  const order: ExecutiveInsightCategory[] = [
    "critical",
    "important",
    "positive",
    "informative",
  ];

  return out
    .sort((a, b) => {
      const ca = order.indexOf(a.category);
      const cb = order.indexOf(b.category);
      if (ca !== cb) return ca - cb;
      return a.priority - b.priority;
    })
    .slice(0, EXECUTIVE_INSIGHTS_MAX);
}
