import type { MetaProjecaoMensal, MetaVendasStatus } from "@/types/metas-vendas";

export type TendenciaComercial =
  | "crescente"
  | "estavel"
  | "decrescente"
  | "insuficiente";

export type ConfiancaProjecao = "baixa" | "media" | "alta";

export type ProbabilidadeMeta =
  | "muito_baixa"
  | "baixa"
  | "moderada"
  | "alta"
  | "muito_alta";

export type CanalDisponivel = false;

export type HeatmapBand =
  | "fim_semana"
  | "futuro"
  | "sem_meta"
  | "zero"
  | "muito_abaixo"
  | "abaixo"
  | "no_ritmo"
  | "acima"
  | "muito_acima";

export type CommercialTicketResumo = {
  ticket_medio_atual: number;
  ticket_medio_anterior: number;
  quantidade_vendas: number;
  quantidade_vendas_anterior: number;
  variacao_pct: number | null;
  meta_ticket: number | null;
  projecao_ticket: number | null;
  gap_ticket: number | null;
  impacto_faturamento_estimado: number | null;
};

export type CommercialDailyPoint = {
  data: string;
  label: string;
  is_weekend: boolean;
  is_future: boolean;
  is_util: boolean;
  meta_diaria: number;
  realizado: number;
  diferenca: number | null;
  diferenca_pct: number | null;
  projetado: number;
  acumulado_realizado: number;
  acumulado_projetado: number;
  acumulado_meta: number;
  diferenca_acumulada: number | null;
  heatmap_band: HeatmapBand;
};

export type CommercialCentroRow = {
  centro_custo_id: string;
  centro_nome: string;
  valor_meta: number | null;
  faturamento_realizado: number;
  projecao_dias_uteis: number;
  percentual_atingido: number | null;
  gap_projetado: number | null;
  necessario_por_dia_util: number | null;
  ticket_medio: number;
  quantidade_vendas: number;
  tendencia: TendenciaComercial;
  status: MetaVendasStatus;
};

export type CommercialCanalRow = {
  canal: string;
  quantidade_unidades: number;
  meta_vendas: number | null;
  realizado: number;
  projecao: number;
  diferenca: number | null;
  comparativo: number | null;
  meta_diaria: number | null;
  realizado_d1: number;
  diferenca_d1: number | null;
  ticket_medio_atual: number;
  ticket_medio_anterior: number;
  variacao_ticket_pct: number | null;
  participacao_pct: number;
};

export type CommercialShareMonth = {
  competencia: string;
  label: string;
  total: number;
  series: Array<{ id: string; nome: string; valor: number; pct: number }>;
};

export type CommercialImpacto = {
  codigo: string;
  mensagem: string;
  severidade: "info" | "positivo" | "atencao" | "critico";
};

export type CommercialInsight = {
  codigo: string;
  titulo: string;
  descricao: string;
  impacto: string;
  recomendacao: string;
  href: string | null;
  severidade: "info" | "positivo" | "atencao" | "critico";
};

export type CommercialRankingItem = {
  id: string;
  label: string;
  valor: number;
  participacao_pct: number | null;
};

export type CommercialRankings = {
  clientes: CommercialRankingItem[];
  produtos: CommercialRankingItem[];
  servicos: CommercialRankingItem[];
  centros: CommercialRankingItem[];
  vendedores: CommercialRankingItem[];
  vendedor_disponivel: false;
};

export type CommercialAuditoria = {
  tem_canal: false;
  tem_vendedor: false;
  tem_meta_ticket: false;
};

export type CommercialPanelData = {
  competencia: string;
  dataDe: string;
  dataAte: string;
  centro_custo_id: string | null;
  projecao: MetaProjecaoMensal;
  tendencia: TendenciaComercial;
  tendencia_pct: number | null;
  tendencia_janela_dias: number;
  tendencia_insuficiente: boolean;
  confianca: ConfiancaProjecao;
  confianca_motivo: string;
  probabilidade: ProbabilidadeMeta;
  probabilidade_score: number;
  probabilidade_motivo: string;
  ticket: CommercialTicketResumo;
  daily: CommercialDailyPoint[];
  centros: CommercialCentroRow[];
  canais: CommercialCanalRow[];
  canal_disponivel: CanalDisponivel;
  share_13m: CommercialShareMonth[];
  share_modo: "canal" | "centro" | "indisponivel";
  rankings: CommercialRankings;
  insights: CommercialInsight[];
  /** Compat 9.8.7 — espelho resumido dos insights. */
  impactos: CommercialImpacto[];
  auditoria: CommercialAuditoria;
  meta_diaria_regra: string;
};

/** Tendência: |variação| < 3 p.p. → estável. */
export const TENDENCIA_ESTAVEL_PP = 3;

/** Mínimo de dias com movimento na janela para classificar tendência. */
export const TENDENCIA_MIN_DIAS = 3;

/**
 * Confiança da projeção:
 * - baixa: < 3 dias úteis decorridos OU < 3 vendas
 * - média: < 10 dias úteis decorridos
 * - alta: demais casos
 */
export function resolveConfianca(input: {
  diasUteisDecorridos: number;
  quantidadeVendas: number;
}): { confianca: ConfiancaProjecao; motivo: string } {
  if (input.diasUteisDecorridos < 3 || input.quantidadeVendas < 3) {
    return {
      confianca: "baixa",
      motivo:
        "Poucos dias úteis ou poucas vendas no mês — a projeção ainda é frágil.",
    };
  }
  if (input.diasUteisDecorridos < 10) {
    return {
      confianca: "media",
      motivo: "Amostra parcial do mês; acompanhar a evolução diária.",
    };
  }
  return {
    confianca: "alta",
    motivo: "Base suficiente de dias úteis e vendas para a estimativa.",
  };
}

export function resolveTendencia(
  variacaoPct: number | null,
  diasComMovimento: number,
): TendenciaComercial {
  if (diasComMovimento < TENDENCIA_MIN_DIAS || variacaoPct === null) {
    return "insuficiente";
  }
  if (variacaoPct > TENDENCIA_ESTAVEL_PP) return "crescente";
  if (variacaoPct < -TENDENCIA_ESTAVEL_PP) return "decrescente";
  return "estavel";
}

export function resolveHeatmapBand(input: {
  isWeekend: boolean;
  isFuture: boolean;
  isUtil: boolean;
  metaDiaria: number;
  realizado: number;
  diferencaPct: number | null;
}): HeatmapBand {
  if (input.isFuture) return "futuro";
  if (input.isWeekend && !input.isUtil) return "fim_semana";
  if (input.metaDiaria <= 0) return "sem_meta";
  if (input.realizado === 0) return "zero";
  if (input.diferencaPct === null) return "sem_meta";
  if (input.diferencaPct <= -50) return "muito_abaixo";
  if (input.diferencaPct < -10) return "abaixo";
  if (input.diferencaPct <= 10) return "no_ritmo";
  if (input.diferencaPct <= 50) return "acima";
  return "muito_acima";
}

/**
 * Probabilidade determinística (0–100) de atingir a meta.
 * Não é garantia — estimativa gerencial.
 *
 * Componentes:
 * - cobertura da projeção útil vs meta (0–40)
 * - ritmo atual vs esperado (0–20)
 * - tendência recente (0–20)
 * - estabilidade (baixa volatilidade) (0–20)
 * Penalidade se amostra < 3 dias úteis.
 */
export function resolveProbabilidade(input: {
  valorMeta: number | null;
  projecaoUteis: number;
  ritmoDiferencaPp: number | null;
  tendencia: TendenciaComercial;
  volatilidade: number;
  diasUteisDecorridos: number;
  percentualAtingido: number | null;
}): { probabilidade: ProbabilidadeMeta; score: number; motivo: string } {
  if (input.valorMeta === null) {
    return {
      probabilidade: "muito_baixa",
      score: 0,
      motivo: "Sem meta cadastrada — probabilidade não aplicável.",
    };
  }

  if (input.valorMeta === 0 || (input.percentualAtingido ?? 0) >= 100) {
    return {
      probabilidade: "muito_alta",
      score: 100,
      motivo: "Meta já atingida ou meta zero.",
    };
  }

  const cobertura = Math.min(
    Math.max(input.projecaoUteis / input.valorMeta, 0),
    1.2,
  );
  const coberturaScore = Math.min(cobertura, 1) * 40;

  const ritmo =
    input.ritmoDiferencaPp === null
      ? 10
      : Math.min(Math.max(10 + input.ritmoDiferencaPp / 2, 0), 20);

  const tendenciaScore =
    input.tendencia === "crescente"
      ? 20
      : input.tendencia === "estavel"
        ? 12
        : input.tendencia === "insuficiente"
          ? 8
          : 4;

  const estabilidade = Math.min(Math.max(1 - input.volatilidade, 0), 1) * 20;

  let score = coberturaScore + ritmo + tendenciaScore + estabilidade;
  if (input.diasUteisDecorridos < 3) {
    score *= 0.6;
  }

  score = Math.round(Math.min(Math.max(score, 0), 100));

  let probabilidade: ProbabilidadeMeta;
  if (score < 20) probabilidade = "muito_baixa";
  else if (score < 40) probabilidade = "baixa";
  else if (score < 60) probabilidade = "moderada";
  else if (score < 80) probabilidade = "alta";
  else probabilidade = "muito_alta";

  return {
    probabilidade,
    score,
    motivo:
      "Estimativa baseada em projeção por dias úteis, ritmo, tendência e volatilidade diária. Não considera feriados nem sazonalidade externa.",
  };
}

export function computeVolatility(values: number[]): number {
  const sample = values.filter((v) => Number.isFinite(v));
  if (sample.length < 2) return 1;
  const mean = sample.reduce((a, b) => a + b, 0) / sample.length;
  if (mean === 0) return sample.every((v) => v === 0) ? 0 : 1;
  const variance =
    sample.reduce((acc, v) => acc + (v - mean) ** 2, 0) / sample.length;
  return Math.min(Math.sqrt(variance) / Math.abs(mean), 2);
}

function formatBrl(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPct(value: number) {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

/**
 * Insights determinísticos a partir de dados reais do painel.
 * Sem mock — só sinais derivados de projeção, tendência, ticket, rankings e centros.
 */
export function buildCommercialInsights(input: {
  projecao: MetaProjecaoMensal;
  tendencia: TendenciaComercial;
  tendenciaPct: number | null;
  probabilidade: ProbabilidadeMeta;
  ticket: CommercialTicketResumo;
  centros: CommercialCentroRow[];
  rankingClientes: CommercialRankingItem[];
  faturamentoTotal: number;
  mediaDiariaUtil: number;
  tenantSlug?: string | null;
  monthFilters?: { dataDe: string; dataAte: string } | null;
}): CommercialInsight[] {
  const {
    projecao: p,
    tendencia,
    tendenciaPct,
    probabilidade,
    ticket,
    centros,
    rankingClientes,
    faturamentoTotal,
    mediaDiariaUtil,
  } = input;
  const items: CommercialInsight[] = [];
  const vendasHref =
    input.tenantSlug && input.monthFilters
      ? `/${input.tenantSlug}/vendas?dataDe=${input.monthFilters.dataDe}&dataAte=${input.monthFilters.dataAte}`
      : null;
  const metasHref = input.tenantSlug
    ? `/${input.tenantSlug}/configuracoes/metas`
    : null;

  if (p.valor_meta === null) {
    items.push({
      codigo: "sem_meta",
      titulo: "Meta mensal ausente",
      descricao: "Cadastre a meta mensal para obter gap, ritmo e probabilidade.",
      impacto: "Sem referência de fechamento gerencial.",
      recomendacao: "Cadastrar meta do mês em Configurações → Metas.",
      href: metasHref,
      severidade: "info",
    });
    return items;
  }

  if (tendencia === "crescente") {
    items.push({
      codigo: "acelerando",
      titulo: "Vendas acelerando",
      descricao: `Tendência crescente na janela de 7 dias${
        tendenciaPct === null ? "" : ` (${formatPct(tendenciaPct)})`
      }.`,
      impacto: "Ritmo recente favorece a projeção de fechamento.",
      recomendacao: "Manter o pipeline e proteger o ticket médio.",
      href: vendasHref,
      severidade: "positivo",
    });
  } else if (tendencia === "decrescente") {
    items.push({
      codigo: "desacelerando",
      titulo: "Vendas desacelerando",
      descricao: `Tendência decrescente na janela de 7 dias${
        tendenciaPct === null ? "" : ` (${formatPct(tendenciaPct)})`
      }.`,
      impacto: "Risco de deteriorar a projeção se o ritmo persistir.",
      recomendacao: "Revisar oportunidades em aberto e focos comerciais do período.",
      href: vendasHref,
      severidade: "atencao",
    });
  }

  if (p.gap_projetado_uteis !== null && p.gap_projetado_uteis < 0 && !p.mes_encerrado) {
    items.push({
      codigo: "proj_abaixo",
      titulo: "Projeção abaixo da meta",
      descricao: `Fechamento esperado (úteis) fica ${formatBrl(Math.abs(p.gap_projetado_uteis))} abaixo da meta.`,
      impacto: "Gap projetado negativo no cenário por dias úteis.",
      recomendacao: "Acelerar volume ou ticket nos dias úteis restantes.",
      href: vendasHref,
      severidade: "critico",
    });
  }

  if (
    probabilidade === "alta" ||
    probabilidade === "muito_alta"
  ) {
    items.push({
      codigo: "meta_provavel",
      titulo: "Meta provável",
      descricao: `Probabilidade ${probabilidade === "muito_alta" ? "muito alta" : "alta"} de atingir a meta no cenário atual.`,
      impacto: "Cobertura da projeção e ritmo sustentam o fechamento.",
      recomendacao: "Acompanhar diário e evitar queda de ticket.",
      href: vendasHref,
      severidade: "positivo",
    });
  }

  if (ticket.variacao_pct !== null && Math.abs(ticket.variacao_pct) >= 5) {
    const subindo = ticket.variacao_pct > 0;
    items.push({
      codigo: subindo ? "ticket_alta" : "ticket_queda",
      titulo: subindo ? "Ticket médio em alta" : "Ticket médio em queda",
      descricao: `Variação de ${formatPct(ticket.variacao_pct)} vs mês anterior.`,
      impacto:
        ticket.impacto_faturamento_estimado === null
          ? "Impacto no faturamento não estimado."
          : `Impacto estimado: ${formatBrl(ticket.impacto_faturamento_estimado)}.`,
      recomendacao: subindo
        ? "Sustentar mix e evitar descontos agressivos."
        : "Revisar descontos, mix e precificação.",
      href: vendasHref,
      severidade: subindo ? "positivo" : "atencao",
    });
  }

  const topCliente = rankingClientes[0];
  if (
    topCliente &&
    topCliente.participacao_pct !== null &&
    topCliente.participacao_pct >= 35 &&
    faturamentoTotal > 0
  ) {
    items.push({
      codigo: "concentracao_cliente",
      titulo: "Concentração em cliente",
      descricao: `${topCliente.label} representa ${formatPct(topCliente.participacao_pct)} do ranking de clientes no período.`,
      impacto: "Risco de concentração de receita em poucos clientes.",
      recomendacao: "Diversificar carteira e acompanhar retenção do top cliente.",
      href: input.tenantSlug ? `/${input.tenantSlug}/clientes` : null,
      severidade: "atencao",
    });
  }

  const centroAbaixo = centros.find(
    (c) =>
      c.status === "abaixo_do_ritmo" || c.status === "muito_abaixo_do_ritmo",
  );
  if (centroAbaixo) {
    items.push({
      codigo: "centro_abaixo_ritmo",
      titulo: "Centro abaixo do ritmo",
      descricao: `${centroAbaixo.centro_nome} está ${
        centroAbaixo.status === "muito_abaixo_do_ritmo"
          ? "muito abaixo"
          : "abaixo"
      } do ritmo da meta.`,
      impacto:
        centroAbaixo.gap_projetado === null
          ? "Gap projetado indisponível."
          : `Gap projetado: ${formatBrl(centroAbaixo.gap_projetado)}.`,
      recomendacao: "Priorizar ações comerciais nesse centro de custo.",
      href: vendasHref,
      severidade:
        centroAbaixo.status === "muito_abaixo_do_ritmo" ? "critico" : "atencao",
    });
  }

  if (
    p.necessario_por_dia_util !== null &&
    p.necessario_por_dia_util > 0 &&
    mediaDiariaUtil > 0 &&
    !p.mes_encerrado &&
    p.necessario_por_dia_util > mediaDiariaUtil * 1.15
  ) {
    items.push({
      codigo: "nec_diaria_acima_media",
      titulo: "Necessário/dia acima da média",
      descricao: `Para fechar a meta, o necessário por dia útil (${formatBrl(p.necessario_por_dia_util)}) supera a média atual (${formatBrl(mediaDiariaUtil)}).`,
      impacto: "Ritmo atual insuficiente para cobrir o restante sem aceleração.",
      recomendacao: "Elevar volume diário ou ticket nos dias úteis restantes.",
      href: vendasHref,
      severidade: "atencao",
    });
  }

  if (items.length === 0) {
    items.push({
      codigo: "fechamento",
      titulo: "Fechamento esperado",
      descricao: `Projeção por dias úteis: ${formatBrl(p.projecao_dias_uteis)}.`,
      impacto: "Sem alertas adicionais no cenário atual.",
      recomendacao: "Manter acompanhamento diário do painel.",
      href: vendasHref,
      severidade: "info",
    });
  }

  return items;
}

/** Compat 9.8.7 — deriva impactos a partir dos insights (ou fallback legado). */
export function buildImpactosFromInsights(
  insights: CommercialInsight[],
): CommercialImpacto[] {
  return insights.map((item) => ({
    codigo: item.codigo,
    mensagem: `${item.titulo}: ${item.descricao}`,
    severidade: item.severidade,
  }));
}

export function buildImpactos(input: {
  projecao: MetaProjecaoMensal;
  ticketMedio: number;
}): CommercialImpacto[] {
  const insights = buildCommercialInsights({
    projecao: input.projecao,
    tendencia: "estavel",
    tendenciaPct: null,
    probabilidade: "moderada",
    ticket: {
      ticket_medio_atual: input.ticketMedio,
      ticket_medio_anterior: 0,
      quantidade_vendas: 0,
      quantidade_vendas_anterior: 0,
      variacao_pct: null,
      meta_ticket: null,
      projecao_ticket: null,
      gap_ticket: null,
      impacto_faturamento_estimado: null,
    },
    centros: [],
    rankingClientes: [],
    faturamentoTotal: input.projecao.faturamento_realizado,
    mediaDiariaUtil: input.projecao.media_diaria_util,
  });
  return buildImpactosFromInsights(insights);
}

export const META_DIARIA_REGRA =
  "Meta diária = meta do mês ÷ quantidade de dias úteis do mês (seg–sex). Fins de semana recebem meta 0. Feriados ainda não são descontados. Evolução futura: meta ponderada.";

export const PROBABILIDADE_LABEL: Record<ProbabilidadeMeta, string> = {
  muito_baixa: "Muito baixa",
  baixa: "Baixa",
  moderada: "Moderada",
  alta: "Alta",
  muito_alta: "Muito alta",
};

export const CONFIANCA_LABEL: Record<ConfiancaProjecao, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export const TENDENCIA_LABEL: Record<TendenciaComercial, string> = {
  crescente: "Crescente",
  estavel: "Estável",
  decrescente: "Decrescente",
  insuficiente: "Insuficiente",
};

export const HEATMAP_LABEL: Record<HeatmapBand, string> = {
  fim_semana: "Fim de semana",
  futuro: "Futuro",
  sem_meta: "Sem meta",
  zero: "Sem movimento",
  muito_abaixo: "Muito abaixo",
  abaixo: "Abaixo",
  no_ritmo: "No ritmo",
  acima: "Acima",
  muito_acima: "Muito acima",
};
