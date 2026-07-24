/**
 * IA Executiva — regras de score por módulo (Gate 18.5).
 * Cada penalidade/bônus tem ruleId documentado. Sem pesos aleatórios.
 */

import {
  EXECUTIVE_AI_RULE_VERSION,
  type ExecutiveAiComercialFeed,
  type ExecutiveAiCrmFeed,
  type ExecutiveAiEstoqueFeed,
  type ExecutiveAiFinanceiroFeed,
  type ExecutiveAiModuleScore,
  type ExecutiveAiOperacaoFeed,
  type ExecutiveAiSourceStatus,
} from "./executive-ai-types.ts";

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function pushPenalty(
  score: ExecutiveAiModuleScore,
  ruleId: string,
  delta: number,
  reason: string,
) {
  score.penalties.push({ ruleId, delta, reason });
  score.score = (score.score ?? 100) + delta;
}

function pushBonus(
  score: ExecutiveAiModuleScore,
  ruleId: string,
  delta: number,
  reason: string,
) {
  score.bonuses.push({ ruleId, delta, reason });
  score.score = (score.score ?? 100) + delta;
}

function baseScore(
  module: ExecutiveAiModuleScore["module"],
  status: ExecutiveAiSourceStatus,
  weight: number,
): ExecutiveAiModuleScore {
  if (status === "unavailable") {
    return {
      module,
      score: null,
      status,
      weight,
      effectiveWeight: 0,
      penalties: [],
      bonuses: [],
      notes: ["Fonte indisponível — score não atribuído (não usa 0)."],
    };
  }
  return {
    module,
    score: 100,
    status,
    weight,
    effectiveWeight: weight,
    penalties: [],
    bonuses: [],
    notes: [],
  };
}

/**
 * FINANCEIRO — base 100
 * Penalidades: proj 7d neg −25; proj 30d neg −15; pagar vencidas −20;
 *   receber vencidas −15; saldo null −10 + parcial; dados parciais −5
 * Bônus: proj 7d>0 +5; nenhuma vencida +5; cobertura completa +5
 */
export function scoreFinanceiro(
  feed: ExecutiveAiFinanceiroFeed | null,
  weight: number,
): ExecutiveAiModuleScore {
  if (!feed || feed.status === "unavailable") {
    return baseScore("financeiro", "unavailable", weight);
  }
  const s = baseScore("financeiro", feed.status, weight);

  if (feed.saldoAtual == null) {
    pushPenalty(s, "fin.saldo_indisponivel", -10, "Saldo bancário indisponível.");
    s.status = "partial";
    s.notes.push("Saldo atual ausente.");
  }
  if (feed.saldoProjetado7d != null && feed.saldoProjetado7d < 0) {
    pushPenalty(
      s,
      "fin.proj_7d_negativa",
      -25,
      `Projeção 7d negativa (${feed.saldoProjetado7d}).`,
    );
  }
  if (feed.saldoProjetado30d != null && feed.saldoProjetado30d < 0) {
    pushPenalty(
      s,
      "fin.proj_30d_negativa",
      -15,
      `Projeção 30d negativa (${feed.saldoProjetado30d}).`,
    );
  }
  if ((feed.pagarVencidoQtd ?? 0) > 0) {
    pushPenalty(
      s,
      "fin.pagar_vencidas",
      -20,
      `${feed.pagarVencidoQtd} conta(s) a pagar vencida(s).`,
    );
  }
  if ((feed.receberVencidoQtd ?? 0) > 0) {
    pushPenalty(
      s,
      "fin.receber_vencidas",
      -15,
      `${feed.receberVencidoQtd} recebível(is) vencido(s).`,
    );
  }
  if (feed.status === "partial") {
    pushPenalty(s, "fin.dados_parciais", -5, "Dados financeiros parciais.");
    s.status = "partial";
  }

  const projOk =
    feed.saldoProjetado7d != null && feed.saldoProjetado7d > 0;
  if (projOk) {
    pushBonus(s, "fin.proj_positiva", 5, "Projeção de caixa 7d positiva.");
  }
  if (
    feed.pagarVencidoQtd === 0 &&
    feed.receberVencidoQtd === 0 &&
    feed.pagarVencidoQtd != null &&
    feed.receberVencidoQtd != null
  ) {
    pushBonus(s, "fin.sem_vencidas", 5, "Nenhuma conta vencida.");
  }
  if (feed.status === "available" && feed.saldoAtual != null) {
    pushBonus(s, "fin.cobertura_completa", 5, "Cobertura financeira completa.");
  }

  s.score = clampScore(s.score ?? 100);
  return s;
}

/**
 * COMERCIAL — base 100
 * Penalidades: meta abaixo ritmo −20; conversão <20% −15; valor perdido alto −10;
 *   negociação elevada −10; origem baixa −10; responsáveis fracos −5
 * Bônus: meta atingida +10; conversão ≥30% +5
 * Não aplica conversão se indisponível.
 */
export function scoreComercial(
  feed: ExecutiveAiComercialFeed | null,
  weight: number,
): ExecutiveAiModuleScore {
  if (!feed || feed.status === "unavailable") {
    return baseScore("comercial", "unavailable", weight);
  }
  const s = baseScore("comercial", feed.status, weight);

  if (feed.metaDisponivel && feed.metaAbaixoRitmo) {
    pushPenalty(s, "com.meta_abaixo", -20, "Meta comercial abaixo do ritmo.");
  }
  if (feed.conversaoDisponivel && feed.taxaConversaoPct != null) {
    if (feed.taxaConversaoPct < 20) {
      pushPenalty(
        s,
        "com.conversao_baixa",
        -15,
        `Conversão comercial ${feed.taxaConversaoPct}%.`,
      );
    } else if (feed.taxaConversaoPct >= 30) {
      pushBonus(s, "com.conversao_saudavel", 5, "Conversão comercial saudável.");
    }
  } else if (!feed.conversaoDisponivel) {
    s.notes.push("Taxa de conversão indisponível — sem penalidade.");
    s.status = s.status === "available" ? "partial" : s.status;
  }

  const fat = feed.faturamentoPeriodo ?? 0;
  const perdido = feed.valorPerdido ?? 0;
  if (feed.valorPerdido != null && fat > 0 && perdido / fat >= 0.25) {
    pushPenalty(
      s,
      "com.valor_perdido",
      -10,
      "Valor perdido elevado vs faturamento do período.",
    );
  } else if (feed.valorPerdido != null && fat === 0 && perdido > 0) {
    pushPenalty(s, "com.valor_perdido", -10, "Há valor perdido sem faturamento.");
  }

  if (
    feed.valorEmNegociacao != null &&
    fat > 0 &&
    feed.valorEmNegociacao / fat >= 0.5
  ) {
    pushPenalty(
      s,
      "com.negociacao_alta",
      -10,
      "Alto volume parado em negociação.",
    );
  }

  if (feed.coberturaOrigemBaixa) {
    pushPenalty(
      s,
      "com.origem_baixa",
      -10,
      "Cobertura de origem comercial baixa.",
    );
    s.status = "partial";
  }
  if (
    feed.coberturaResponsavelPct != null &&
    feed.coberturaResponsavelPct < 50
  ) {
    pushPenalty(
      s,
      "com.responsavel_fraco",
      -5,
      "Poucos responsáveis comerciais confirmados.",
    );
    s.status = "partial";
  }

  if (feed.metaDisponivel && feed.metaAtingida) {
    pushBonus(s, "com.meta_atingida", 10, "Meta comercial atingida.");
  }

  if (feed.status === "partial") {
    s.status = "partial";
  }

  s.score = clampScore(s.score ?? 100);
  s.notes.push(`ruleVersion=${EXECUTIVE_AI_RULE_VERSION}`);
  return s;
}

/**
 * CRM — base 100
 * Penalidades: risco −min(25, n*3); VIP sem retorno −min(15,n*5);
 *   revisões −min(10,n*3); orçamentos −min(10,n*2); visita parcial −5
 * Bônus: recorrência ≥30% ativos +5; oportunidades >0 +5; ativos >0 +5
 */
export function scoreCrm(
  feed: ExecutiveAiCrmFeed | null,
  weight: number,
): ExecutiveAiModuleScore {
  if (!feed || feed.status === "unavailable") {
    return baseScore("crm", "unavailable", weight);
  }
  const s = baseScore("crm", feed.status, weight);

  const risco = feed.clientesEmRisco ?? 0;
  if (feed.clientesEmRisco != null && risco > 0) {
    pushPenalty(
      s,
      "crm.clientes_risco",
      -Math.min(25, risco * 3),
      `${risco} cliente(s) em risco.`,
    );
  }
  const vip = feed.vipSemRetorno ?? 0;
  if (feed.vipSemRetorno != null && vip > 0) {
    pushPenalty(
      s,
      "crm.vip_sem_retorno",
      -Math.min(15, vip * 5),
      `${vip} VIP sem retorno recente.`,
    );
  }
  const rev = feed.revisoesVencidas ?? 0;
  if (feed.revisoesVencidas != null && rev > 0) {
    pushPenalty(
      s,
      "crm.revisoes_vencidas",
      -Math.min(10, rev * 3),
      `${rev} revisão(ões) vencida(s).`,
    );
  }
  const orc = feed.orcamentosPendentes ?? 0;
  if (feed.orcamentosPendentes != null && orc > 0) {
    pushPenalty(
      s,
      "crm.orcamentos_pendentes",
      -Math.min(10, orc * 2),
      `${orc} orçamento(s) pendente(s) no CRM.`,
    );
  }
  if (feed.ultimaVisitaCarteira == null) {
    pushPenalty(
      s,
      "crm.visita_parcial",
      -5,
      "Última visita da carteira indisponível/parcial.",
    );
    s.status = "partial";
  }

  const ativos = feed.clientesAtivos ?? 0;
  const rec = feed.clientesRecorrentes ?? 0;
  if (ativos > 0 && rec / ativos >= 0.3) {
    pushBonus(s, "crm.recorrencia", 5, "Recorrência saudável na carteira.");
  }
  if (ativos > 0) {
    pushBonus(s, "crm.ativos", 5, "Há clientes ativos na carteira.");
  }
  if ((feed.oportunidades ?? 0) > 0) {
    pushBonus(s, "crm.oportunidades", 5, "Oportunidades qualificadas presentes.");
  }

  if (feed.status === "partial") s.status = "partial";
  s.score = clampScore(s.score ?? 100);
  return s;
}

/**
 * OPERAÇÃO — base 100
 * Penalidades: atrasadas −min(25,n*5); paradas −min(20,n*4);
 *   aprovação −min(20,n*4); sem responsável −min(15,n*3); capacidade −15
 * Bônus: nenhuma crítica +10; ocupação <80% +5
 */
export function scoreOperacao(
  feed: ExecutiveAiOperacaoFeed | null,
  weight: number,
): ExecutiveAiModuleScore {
  if (!feed || feed.status === "unavailable") {
    return baseScore("operacao", "unavailable", weight);
  }
  const s = baseScore("operacao", feed.status, weight);

  const atr = feed.atrasadas ?? 0;
  if (feed.atrasadas != null && atr > 0) {
    pushPenalty(
      s,
      "ops.atrasadas",
      -Math.min(25, atr * 5),
      `${atr} OS atrasada(s).`,
    );
  }
  const par = feed.paradas ?? 0;
  if (feed.paradas != null && par > 0) {
    pushPenalty(
      s,
      "ops.paradas",
      -Math.min(20, par * 4),
      `${par} OS parada(s).`,
    );
  }
  const apr = feed.aguardandoAprovacao ?? 0;
  if (feed.aguardandoAprovacao != null && apr > 0) {
    pushPenalty(
      s,
      "ops.aguardando_aprovacao",
      -Math.min(20, apr * 4),
      `${apr} OS aguardando aprovação.`,
    );
  }
  const sem = feed.semResponsavel ?? 0;
  if (feed.semResponsavel != null && sem > 0) {
    pushPenalty(
      s,
      "ops.sem_responsavel",
      -Math.min(15, sem * 3),
      `${sem} OS sem responsável atribuído.`,
    );
  }
  if (feed.capacidadeLimite) {
    pushPenalty(s, "ops.capacidade_limite", -15, "Capacidade operacional no limite.");
  }

  const critica =
    atr + par + (feed.capacidadeLimite ? 1 : 0);
  if (critica === 0 && atr === 0 && par === 0 && apr === 0) {
    pushBonus(s, "ops.sem_criticas", 10, "Nenhuma OS crítica no momento.");
  }
  if (feed.taxaOcupacaoPct != null && feed.taxaOcupacaoPct < 80) {
    pushBonus(s, "ops.fluxo_estavel", 5, "Ocupação operacional abaixo de 80%.");
  }

  if (feed.status === "partial") s.status = "partial";
  s.score = clampScore(s.score ?? 100);
  return s;
}

/**
 * ESTOQUE — base 100
 * Penalidades: zerados −min(25,n*5); abaixo −min(20,n*4);
 *   valor parado alto −15 (só se disponível); cadastro −min(10,n);
 *   cobertura indisponível → parcial −5 (não trata como zero);
 *   fornecedor único −5
 * Bônus: nenhum crítico +10; giro confiável +5
 */
export function scoreEstoque(
  feed: ExecutiveAiEstoqueFeed | null,
  weight: number,
): ExecutiveAiModuleScore {
  if (!feed || feed.status === "unavailable") {
    return baseScore("estoque", "unavailable", weight);
  }
  const s = baseScore("estoque", feed.status, weight);

  const zer = feed.zerados ?? 0;
  if (feed.zerados != null && zer > 0) {
    pushPenalty(
      s,
      "est.zerados",
      -Math.min(25, zer * 5),
      `${zer} produto(s) zerado(s).`,
    );
  }
  const aba = feed.abaixoMinimo ?? 0;
  if (feed.abaixoMinimo != null && aba > 0) {
    pushPenalty(
      s,
      "est.abaixo_minimo",
      -Math.min(20, aba * 4),
      `${aba} produto(s) abaixo do mínimo.`,
    );
  }
  if (feed.valorParadoDisponivel && (feed.valorParado ?? 0) >= 500) {
    pushPenalty(
      s,
      "est.valor_parado",
      -15,
      `Alto valor parado em estoque (${feed.valorParado}).`,
    );
  } else if (!feed.valorParadoDisponivel) {
    s.notes.push("Valor parado indisponível — sem penalidade.");
  }
  const cad = feed.cadastroInconsistente ?? 0;
  if (feed.cadastroInconsistente != null && cad > 0) {
    pushPenalty(
      s,
      "est.cadastro",
      -Math.min(10, cad),
      `${cad} cadastro(s) inconsistente(s).`,
    );
  }
  if (!feed.coberturaDisponivel) {
    pushPenalty(
      s,
      "est.cobertura_indisponivel",
      -5,
      "Cobertura de estoque indisponível (histórico insuficiente).",
    );
    s.status = "partial";
  }
  if (feed.fornecedorUnico) {
    pushPenalty(s, "est.fornecedor_unico", -5, "Dependência de fornecedor único.");
  }

  if (zer === 0 && aba === 0) {
    pushBonus(s, "est.sem_criticos", 10, "Nenhum item crítico de estoque.");
  }
  if (feed.giroDisponivel) {
    pushBonus(s, "est.giro_confiavel", 5, "Giro médio disponível e confiável.");
  }

  if (feed.status === "partial") s.status = "partial";
  s.score = clampScore(s.score ?? 100);
  return s;
}
