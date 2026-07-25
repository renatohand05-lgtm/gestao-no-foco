/**
 * Predictive Intelligence Engine — Gate 20.4
 *
 * Interpreta feeds já disponíveis (Executive AI input + result).
 * Não recalcula SQL · não inventa métricas · sem I/O · sem LLM.
 */

import { executiveAiCanonicalHref } from "../ai/executive-ai-summary.ts";
import type {
  ExecutiveAiInput,
  ExecutiveAiResult,
} from "../ai/executive-ai-types.ts";
import {
  confidenceFromCoverage,
  formatPredictiveCount,
  formatPredictiveMoney,
  formatPredictivePct,
  labelConfidence,
  labelRisk,
  labelTrend,
  riskFromCounts,
  riskFromScore,
  trendFromDelta,
  worstConfidence,
} from "./format.ts";
import {
  PREDICTIVE_DOMAIN_TITLE,
  PREDICTIVE_ENGINE_VERSION,
  type PredictiveEvidence,
  type PredictiveForecast,
  type PredictiveIntelligenceResult,
} from "./types.ts";

export type PredictiveHojeExtras = {
  faturamentoHoje: number | null;
  metaHoje: number | null;
  percentualHoje: number | null;
  projecaoFechamentoMes: number | null;
};

export type RunPredictiveEngineInput = {
  tenantSlug: string;
  ai: ExecutiveAiResult;
  /** Feeds já montados pelo snapshot da IA (mesmo ciclo · sem fetch novo). */
  feeds: ExecutiveAiInput;
  hoje?: PredictiveHojeExtras | null;
};

function ev(
  id: string,
  label: string,
  value: string,
  source: string,
): PredictiveEvidence {
  return { id, label, value, source };
}

function forecastFaturamento(
  input: RunPredictiveEngineInput,
): PredictiveForecast {
  const com = input.feeds.comercial;
  const hoje = input.hoje;
  const title = PREDICTIVE_DOMAIN_TITLE.faturamento;

  if (!com || com.status === "unavailable") {
    return {
      domain: "faturamento",
      title,
      headline: "Previsão de faturamento indisponível.",
      primaryValue: "Indisponível",
      horizon: "período comercial",
      confidence: "baixa",
      confidenceLabel: labelConfidence("baixa"),
      trend: "indisponivel",
      trendLabel: labelTrend("indisponivel"),
      risk: "indisponivel",
      riskLabel: labelRisk("indisponivel"),
      evidence: [],
      unavailableReason: "Feed comercial ausente ou indisponível.",
      href: executiveAiCanonicalHref(input.tenantSlug, "vendas_ci"),
    };
  }

  const fat = com.faturamentoPeriodo;
  const neg = com.valorEmNegociacao;
  const projMes = hoje?.projecaoFechamentoMes ?? null;
  const fields = [fat, neg, projMes, hoje?.faturamentoHoje ?? null];
  const available = fields.filter((v) => v != null && Number.isFinite(v)).length;
  const confidence = confidenceFromCoverage(
    available,
    fields.length,
    com.status === "partial",
  );

  const primary =
    projMes != null
      ? formatPredictiveMoney(projMes)
      : fat != null
        ? formatPredictiveMoney(fat)
        : "Indisponível";

  const headline =
    projMes != null
      ? `Projeção de fechamento do mês: ${formatPredictiveMoney(projMes)}.`
      : fat != null
        ? `Faturamento do período: ${formatPredictiveMoney(fat)}.`
        : "Sem valor de faturamento confiável no snapshot.";

  const trendHonest =
    projMes != null && fat != null
      ? trendFromDelta(fat, projMes)
      : "indisponivel";

  const modScore =
    input.ai.moduleScores.find((m) => m.module === "comercial")?.score ?? null;

  const evidence: PredictiveEvidence[] = [];
  if (fat != null) {
    evidence.push(
      ev("fat.periodo", "Faturamento período", formatPredictiveMoney(fat), "comercial"),
    );
  }
  if (neg != null) {
    evidence.push(
      ev("fat.negociacao", "Em negociação", formatPredictiveMoney(neg), "comercial"),
    );
  }
  if (projMes != null) {
    evidence.push(
      ev(
        "fat.proj_mes",
        "Projeção fechamento",
        formatPredictiveMoney(projMes),
        "dashboard-hoje",
      ),
    );
  }
  if (hoje?.faturamentoHoje != null) {
    evidence.push(
      ev(
        "fat.hoje",
        "Realizado hoje",
        formatPredictiveMoney(hoje.faturamentoHoje),
        "dashboard-hoje",
      ),
    );
  }

  return {
    domain: "faturamento",
    title,
    headline,
    primaryValue: primary,
    horizon: projMes != null ? "fechamento do mês" : "período carregado",
    confidence,
    confidenceLabel: labelConfidence(confidence),
    trend: trendHonest,
    trendLabel: labelTrend(trendHonest),
    risk: riskFromScore(modScore),
    riskLabel: labelRisk(riskFromScore(modScore)),
    evidence,
    unavailableReason:
      evidence.length === 0 ? "Sem indicadores numéricos de faturamento." : null,
    href: executiveAiCanonicalHref(input.tenantSlug, "vendas_ci"),
  };
}

function forecastCaixa(input: RunPredictiveEngineInput): PredictiveForecast {
  const fin = input.feeds.financeiro;
  const title = PREDICTIVE_DOMAIN_TITLE.fluxo_caixa;

  if (!fin || fin.status === "unavailable") {
    return {
      domain: "fluxo_caixa",
      title,
      headline: "Previsão de caixa indisponível.",
      primaryValue: "Indisponível",
      horizon: "7 / 30 dias",
      confidence: "baixa",
      confidenceLabel: labelConfidence("baixa"),
      trend: "indisponivel",
      trendLabel: labelTrend("indisponivel"),
      risk: "indisponivel",
      riskLabel: labelRisk("indisponivel"),
      evidence: [],
      unavailableReason: "Feed financeiro ausente ou indisponível.",
      href: executiveAiCanonicalHref(input.tenantSlug, "fluxo_caixa"),
    };
  }

  const fields = [
    fin.saldoAtual,
    fin.saldoProjetado7d,
    fin.saldoProjetado30d,
  ];
  const available = fields.filter((v) => v != null && Number.isFinite(v)).length;
  const confidence = confidenceFromCoverage(
    available,
    fields.length,
    fin.status === "partial",
  );

  const primary =
    fin.saldoProjetado7d != null
      ? formatPredictiveMoney(fin.saldoProjetado7d)
      : fin.saldoAtual != null
        ? formatPredictiveMoney(fin.saldoAtual)
        : "Indisponível";

  const headline =
    fin.saldoProjetado7d != null
      ? `Caixa projetado em 7 dias: ${formatPredictiveMoney(fin.saldoProjetado7d)}.`
      : fin.saldoAtual != null
        ? `Saldo atual: ${formatPredictiveMoney(fin.saldoAtual)} (sem projeção 7d).`
        : "Sem saldo ou projeção confiável.";

  const trend = trendFromDelta(fin.saldoAtual, fin.saldoProjetado7d);
  const vencidos =
    (fin.pagarVencidoQtd ?? 0) + (fin.receberVencidoQtd ?? 0);
  const neg7 = fin.saldoProjetado7d != null && fin.saldoProjetado7d < 0;
  const risk = neg7
    ? "critico"
    : vencidos > 0
      ? riskFromCounts(fin.pagarVencidoQtd ?? 0, fin.receberVencidoQtd ?? 0)
      : riskFromScore(
          input.ai.moduleScores.find((m) => m.module === "financeiro")?.score ??
            null,
        );

  const evidence: PredictiveEvidence[] = [];
  if (fin.saldoAtual != null) {
    evidence.push(
      ev("cx.saldo", "Saldo atual", formatPredictiveMoney(fin.saldoAtual), "cockpit"),
    );
  }
  if (fin.saldoProjetado7d != null) {
    evidence.push(
      ev(
        "cx.7d",
        "Projeção 7 dias",
        formatPredictiveMoney(fin.saldoProjetado7d),
        "cockpit",
      ),
    );
  }
  if (fin.saldoProjetado30d != null) {
    evidence.push(
      ev(
        "cx.30d",
        "Projeção 30 dias",
        formatPredictiveMoney(fin.saldoProjetado30d),
        "cockpit",
      ),
    );
  }
  if (fin.pagarVencidoQtd != null) {
    evidence.push(
      ev(
        "cx.pagar",
        "Contas a pagar vencidas",
        formatPredictiveCount(fin.pagarVencidoQtd),
        "cockpit",
      ),
    );
  }

  return {
    domain: "fluxo_caixa",
    title,
    headline,
    primaryValue: primary,
    horizon: "7 dias (projeção do cockpit)",
    confidence,
    confidenceLabel: labelConfidence(confidence),
    trend,
    trendLabel: labelTrend(trend),
    risk,
    riskLabel: labelRisk(risk),
    evidence,
    unavailableReason:
      evidence.length === 0 ? "Sem indicadores de caixa no snapshot." : null,
    href: executiveAiCanonicalHref(input.tenantSlug, "fluxo_caixa"),
  };
}

function forecastEstoque(input: RunPredictiveEngineInput): PredictiveForecast {
  const est = input.feeds.estoque;
  const title = PREDICTIVE_DOMAIN_TITLE.estoque;

  if (!est || est.status === "unavailable") {
    return {
      domain: "estoque",
      title,
      headline: "Risco de estoque indisponível.",
      primaryValue: "Indisponível",
      horizon: "ruptura / mínimo",
      confidence: "baixa",
      confidenceLabel: labelConfidence("baixa"),
      trend: "indisponivel",
      trendLabel: labelTrend("indisponivel"),
      risk: "indisponivel",
      riskLabel: labelRisk("indisponivel"),
      evidence: [],
      unavailableReason: "Feed de estoque ausente ou indisponível.",
      href: executiveAiCanonicalHref(input.tenantSlug, "estoque_dashboard"),
    };
  }

  const zerados = est.zerados;
  const abaixo = est.abaixoMinimo;
  const fields = [zerados, abaixo, est.skusAtivos];
  const available = fields.filter((v) => v != null && Number.isFinite(v)).length;
  const confidence = confidenceFromCoverage(
    available,
    3,
    est.status === "partial" || !est.coberturaDisponivel,
  );

  const z = zerados ?? 0;
  const a = abaixo ?? 0;
  const risk =
    zerados == null && abaixo == null
      ? "indisponivel"
      : riskFromCounts(z, a);

  const primary =
    zerados != null
      ? `${formatPredictiveCount(zerados)} zerado(s)`
      : abaixo != null
        ? `${formatPredictiveCount(abaixo)} abaixo do mínimo`
        : "Indisponível";

  const headline =
    risk === "baixo"
      ? "Estoque sem sinais críticos de ruptura no snapshot."
      : `Atenção de estoque: ${primary}.`;

  const evidence: PredictiveEvidence[] = [];
  if (zerados != null) {
    evidence.push(
      ev("est.zerados", "Itens zerados", formatPredictiveCount(zerados), "estoque"),
    );
  }
  if (abaixo != null) {
    evidence.push(
      ev(
        "est.abaixo",
        "Abaixo do mínimo",
        formatPredictiveCount(abaixo),
        "estoque",
      ),
    );
  }
  if (est.skusAtivos != null) {
    evidence.push(
      ev("est.skus", "SKUs ativos", formatPredictiveCount(est.skusAtivos), "estoque"),
    );
  }

  return {
    domain: "estoque",
    title,
    headline,
    primaryValue: primary,
    horizon: "posição atual",
    confidence,
    confidenceLabel: labelConfidence(confidence),
    trend: "indisponivel",
    trendLabel: labelTrend("indisponivel"),
    risk,
    riskLabel: labelRisk(risk),
    evidence,
    unavailableReason:
      evidence.length === 0 ? "Sem contagens de estoque no snapshot." : null,
    href:
      z > 0
        ? executiveAiCanonicalHref(input.tenantSlug, "estoque_zerado")
        : executiveAiCanonicalHref(input.tenantSlug, "estoque_abaixo"),
  };
}

function forecastMetas(input: RunPredictiveEngineInput): PredictiveForecast {
  const com = input.feeds.comercial;
  const hoje = input.hoje;
  const title = PREDICTIVE_DOMAIN_TITLE.metas;

  const metaPct = com?.metaDisponivel ? com.metaPercentual : null;
  const metaHojePct = hoje?.percentualHoje ?? null;

  if (
    (!com || com.status === "unavailable" || !com.metaDisponivel) &&
    metaHojePct == null
  ) {
    return {
      domain: "metas",
      title,
      headline: "Previsão de meta indisponível.",
      primaryValue: "Indisponível",
      horizon: "meta do período",
      confidence: "baixa",
      confidenceLabel: labelConfidence("baixa"),
      trend: "indisponivel",
      trendLabel: labelTrend("indisponivel"),
      risk: "indisponivel",
      riskLabel: labelRisk("indisponivel"),
      evidence: [],
      unavailableReason: "Meta comercial não disponível no snapshot.",
      href: `/${input.tenantSlug}/configuracoes/metas`,
    };
  }

  const primary =
    metaPct != null
      ? formatPredictivePct(metaPct)
      : formatPredictivePct(metaHojePct);

  const abaixo = Boolean(com?.metaAbaixoRitmo);
  const atingida = Boolean(com?.metaAtingida);
  const confidence = confidenceFromCoverage(
    [metaPct, metaHojePct, hoje?.metaHoje].filter(
      (v) => v != null && Number.isFinite(v),
    ).length,
    3,
    com?.status === "partial",
  );

  const risk = atingida
    ? "baixo"
    : abaixo
      ? metaPct != null && metaPct < 70
        ? "alto"
        : "moderado"
      : metaPct == null
        ? "indisponivel"
        : "baixo";

  const trend =
    metaPct != null && metaHojePct != null
      ? trendFromDelta(metaHojePct, metaPct)
      : "indisponivel";

  const headline = atingida
    ? `Meta atingida (${primary}).`
    : abaixo
      ? `Meta abaixo do ritmo (${primary}).`
      : `Atingimento da meta: ${primary}.`;

  const evidence: PredictiveEvidence[] = [];
  if (metaPct != null) {
    evidence.push(
      ev("meta.pct", "% da meta (período)", formatPredictivePct(metaPct), "comercial"),
    );
  }
  if (metaHojePct != null) {
    evidence.push(
      ev(
        "meta.hoje_pct",
        "% meta do dia",
        formatPredictivePct(metaHojePct),
        "dashboard-hoje",
      ),
    );
  }
  if (hoje?.metaHoje != null) {
    evidence.push(
      ev("meta.hoje_val", "Meta hoje", formatPredictiveMoney(hoje.metaHoje), "dashboard-hoje"),
    );
  }
  if (com?.metaAbaixoRitmo != null) {
    evidence.push(
      ev(
        "meta.ritmo",
        "Abaixo do ritmo",
        com.metaAbaixoRitmo ? "Sim" : "Não",
        "comercial",
      ),
    );
  }

  return {
    domain: "metas",
    title,
    headline,
    primaryValue: primary,
    horizon: "meta do período / dia",
    confidence,
    confidenceLabel: labelConfidence(confidence),
    trend,
    trendLabel: labelTrend(trend),
    risk,
    riskLabel: labelRisk(risk),
    evidence,
    unavailableReason: null,
    href: executiveAiCanonicalHref(input.tenantSlug, "vendas_ci"),
  };
}

function forecastOperacao(input: RunPredictiveEngineInput): PredictiveForecast {
  const op = input.feeds.operacao;
  const title = PREDICTIVE_DOMAIN_TITLE.risco_operacional;

  if (!op || op.status === "unavailable") {
    return {
      domain: "risco_operacional",
      title,
      headline: "Risco operacional indisponível.",
      primaryValue: "Indisponível",
      horizon: "OS / oficina",
      confidence: "baixa",
      confidenceLabel: labelConfidence("baixa"),
      trend: "indisponivel",
      trendLabel: labelTrend("indisponivel"),
      risk: "indisponivel",
      riskLabel: labelRisk("indisponivel"),
      evidence: [],
      unavailableReason: "Feed de operação ausente ou indisponível.",
      href: executiveAiCanonicalHref(input.tenantSlug, "ordens_atrasadas"),
    };
  }

  const atrasadas = op.atrasadas;
  const paradas = op.paradas;
  const aprov = op.aguardandoAprovacao;
  const fields = [atrasadas, paradas, aprov, op.taxaOcupacaoPct];
  const available = fields.filter((v) => v != null && Number.isFinite(v)).length;
  const confidence = confidenceFromCoverage(
    available,
    fields.length,
    op.status === "partial",
  );

  const crit = atrasadas ?? 0;
  const warn = (paradas ?? 0) + (aprov ?? 0);
  const risk =
    atrasadas == null && paradas == null && aprov == null
      ? "indisponivel"
      : op.capacidadeLimite
        ? "alto"
        : riskFromCounts(crit, warn);

  const primary =
    atrasadas != null
      ? `${formatPredictiveCount(atrasadas)} OS atrasada(s)`
      : aprov != null
        ? `${formatPredictiveCount(aprov)} aguardando aprovação`
        : "Indisponível";

  const headline =
    risk === "baixo"
      ? "Operação sem sinais críticos no snapshot."
      : `Risco operacional: ${primary}.`;

  const evidence: PredictiveEvidence[] = [];
  if (atrasadas != null) {
    evidence.push(
      ev("op.atrasadas", "OS atrasadas", formatPredictiveCount(atrasadas), "operacao"),
    );
  }
  if (paradas != null) {
    evidence.push(
      ev("op.paradas", "OS paradas", formatPredictiveCount(paradas), "operacao"),
    );
  }
  if (aprov != null) {
    evidence.push(
      ev(
        "op.aprov",
        "Aguardando aprovação",
        formatPredictiveCount(aprov),
        "operacao",
      ),
    );
  }
  if (op.taxaOcupacaoPct != null) {
    evidence.push(
      ev(
        "op.ocup",
        "Taxa de ocupação",
        formatPredictivePct(op.taxaOcupacaoPct),
        "operacao",
      ),
    );
  }

  return {
    domain: "risco_operacional",
    title,
    headline,
    primaryValue: primary,
    horizon: "posição atual da oficina",
    confidence,
    confidenceLabel: labelConfidence(confidence),
    trend: "indisponivel",
    trendLabel: labelTrend("indisponivel"),
    risk,
    riskLabel: labelRisk(risk),
    evidence,
    unavailableReason:
      evidence.length === 0 ? "Sem indicadores operacionais no snapshot." : null,
    href:
      (atrasadas ?? 0) > 0
        ? executiveAiCanonicalHref(input.tenantSlug, "ordens_atrasadas")
        : executiveAiCanonicalHref(input.tenantSlug, "ordens_aprovacao"),
  };
}

/**
 * Executa o motor preditivo local (determinístico).
 */
export function runPredictiveEngine(
  input: RunPredictiveEngineInput,
): PredictiveIntelligenceResult {
  const forecasts = [
    forecastFaturamento(input),
    forecastCaixa(input),
    forecastEstoque(input),
    forecastMetas(input),
    forecastOperacao(input),
  ];

  const overallConfidence = worstConfidence(
    forecasts.map((f) => f.confidence),
  );

  const critical = forecasts.filter(
    (f) => f.risk === "critico" || f.risk === "alto",
  );
  const unavailable = forecasts.filter((f) => f.unavailableReason);

  const summary =
    critical.length > 0
      ? `${critical.length} previsão(ões) com risco alto/crítico · confiança ${labelConfidence(overallConfidence)}.`
      : `Previsões locais com confiança ${labelConfidence(overallConfidence)} · sem risco alto evidenciado.`;

  const warnings: string[] = [];
  if (input.ai.partial) {
    warnings.push("Diagnóstico parcial — previsões com cobertura limitada.");
  }
  if (unavailable.length > 0) {
    warnings.push(
      `${unavailable.length} domínio(s) sem evidência numérica suficiente.`,
    );
  }
  if (overallConfidence === "baixa") {
    warnings.push("Confiança baixa: não use como decisão definitiva.");
  }

  return {
    forecasts,
    overallConfidence,
    overallConfidenceLabel: labelConfidence(overallConfidence),
    summary,
    warnings,
    generatedAt: input.ai.generatedAt || new Date().toISOString(),
    engineVersion: PREDICTIVE_ENGINE_VERSION,
    tenantSlug: input.tenantSlug,
  };
}

export const PredictiveEngine = {
  version: PREDICTIVE_ENGINE_VERSION,
  run: runPredictiveEngine,
} as const;
