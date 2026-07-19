import {
  EXECUTIVE_PROJECAO_RATIO,
  EXECUTIVE_RITMO_PP,
  EXECUTIVE_SCORE_BANDS,
  EXECUTIVE_SCORE_WEIGHTS,
} from "@/lib/intelligence/thresholds";
import type {
  ExecutiveIntelligenceInput,
  ExecutiveScoreFactor,
  ExecutiveScoreResult,
  ExecutiveScoreStatus,
  ExecutiveTone,
} from "@/lib/intelligence/types";

function clamp(n: number, min = 0, max = 100) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function statusFromScore(score: number): {
  status: ExecutiveScoreStatus;
  tone: ExecutiveTone;
} {
  if (score <= EXECUTIVE_SCORE_BANDS.criticoMax) {
    return { status: "critico", tone: "danger" };
  }
  if (score <= EXECUTIVE_SCORE_BANDS.atencaoMax) {
    return { status: "atencao", tone: "warning" };
  }
  if (score <= EXECUTIVE_SCORE_BANDS.bomMax) {
    return { status: "bom", tone: "info" };
  }
  return { status: "excelente", tone: "success" };
}

function scoreProjecao(input: ExecutiveIntelligenceInput): ExecutiveScoreFactor {
  const weight = EXECUTIVE_SCORE_WEIGHTS.projecaoVsMeta;
  if (!input.possuiMeta || input.metaMensal === null || input.metaMensal <= 0) {
    return {
      key: "projecao",
      label: "Projeção vs meta",
      score: 50,
      weight,
      explanation: "Sem meta — fator neutro.",
    };
  }
  const ratio = input.projecaoDiasUteis / input.metaMensal;
  let score: number;
  if (ratio < EXECUTIVE_PROJECAO_RATIO.critico) score = 20;
  else if (ratio < EXECUTIVE_PROJECAO_RATIO.atencao) score = 45;
  else if (ratio < EXECUTIVE_PROJECAO_RATIO.noAlvo) score = 70;
  else if (ratio < EXECUTIVE_PROJECAO_RATIO.acima) score = 88;
  else score = 100;

  return {
    key: "projecao",
    label: "Projeção vs meta",
    score,
    weight,
    explanation: `Projeção útil em ${(ratio * 100).toFixed(0)}% da meta.`,
  };
}

function scoreRitmo(input: ExecutiveIntelligenceInput): ExecutiveScoreFactor {
  const weight = EXECUTIVE_SCORE_WEIGHTS.ritmoVsEsperado;
  if (!input.possuiMeta || input.diferencaRitmoPp === null) {
    return {
      key: "ritmo",
      label: "Ritmo vs esperado",
      score: 50,
      weight,
      explanation: "Ritmo indisponível sem meta.",
    };
  }
  const d = input.diferencaRitmoPp;
  let score: number;
  if (d <= EXECUTIVE_RITMO_PP.criticoAbaixo) score = 15;
  else if (d <= EXECUTIVE_RITMO_PP.atencaoAbaixo) score = 40;
  else if (d <= EXECUTIVE_RITMO_PP.noRitmo) score = 75;
  else if (d <= EXECUTIVE_RITMO_PP.acima) score = 90;
  else score = 100;

  const sign = d > 0 ? "+" : "";
  return {
    key: "ritmo",
    label: "Ritmo vs esperado",
    score,
    weight,
    explanation: `Diferença de ritmo: ${sign}${d.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p.`,
  };
}

function scoreAtingimento(
  input: ExecutiveIntelligenceInput,
): ExecutiveScoreFactor {
  const weight = EXECUTIVE_SCORE_WEIGHTS.atingimento;
  if (!input.possuiMeta || input.atingimentoPercentual === null) {
    return {
      key: "atingimento",
      label: "Atingimento",
      score: 50,
      weight,
      explanation: "Atingimento indisponível sem meta.",
    };
  }
  const pct = input.atingimentoPercentual;
  // Escala: 0% → 0, 100% → 100, >100 capped
  const score = clamp(pct);
  return {
    key: "atingimento",
    label: "Atingimento",
    score,
    weight,
    explanation: `Atingimento atual: ${pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%.`,
  };
}

function scoreTendencia(
  input: ExecutiveIntelligenceInput,
): ExecutiveScoreFactor {
  const weight = EXECUTIVE_SCORE_WEIGHTS.tendencia;
  switch (input.tendencia) {
    case "crescente":
      return {
        key: "tendencia",
        label: "Tendência",
        score: 92,
        weight,
        explanation: "Tendência recente crescente.",
      };
    case "estavel":
      return {
        key: "tendencia",
        label: "Tendência",
        score: 70,
        weight,
        explanation: "Tendência recente estável.",
      };
    case "decrescente":
      return {
        key: "tendencia",
        label: "Tendência",
        score: 30,
        weight,
        explanation: "Tendência recente decrescente.",
      };
    default:
      return {
        key: "tendencia",
        label: "Tendência",
        score: 45,
        weight,
        explanation: "Tendência insuficiente — amostra pequena.",
      };
  }
}

function scoreProbabilidade(
  input: ExecutiveIntelligenceInput,
): ExecutiveScoreFactor {
  const weight = EXECUTIVE_SCORE_WEIGHTS.probabilidade;
  if (!input.possuiMeta) {
    return {
      key: "probabilidade",
      label: "Probabilidade",
      score: 50,
      weight,
      explanation: "Probabilidade não aplicável sem meta.",
    };
  }
  return {
    key: "probabilidade",
    label: "Probabilidade",
    score: clamp(input.probabilidadeScore),
    weight,
    explanation: `Score de probabilidade ${input.probabilidadeScore}/100 (${input.probabilidadeMeta.replace("_", " ")}).`,
  };
}

function scoreCrescimento(
  input: ExecutiveIntelligenceInput,
): ExecutiveScoreFactor {
  const weight = EXECUTIVE_SCORE_WEIGHTS.crescimento;
  if (input.crescimentoPeriodo === null) {
    return {
      key: "crescimento",
      label: "Crescimento",
      score: 55,
      weight,
      explanation: "Sem base de comparação com o período anterior.",
    };
  }
  const g = input.crescimentoPeriodo;
  let score: number;
  if (g <= -15) score = 20;
  else if (g <= -5) score = 40;
  else if (g < 5) score = 65;
  else if (g < 15) score = 85;
  else score = 100;

  const sign = g > 0 ? "+" : "";
  return {
    key: "crescimento",
    label: "Crescimento",
    score,
    weight,
    explanation: `Crescimento vs anterior: ${sign}${g.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%.`,
  };
}

/**
 * Score executivo 0–100 (determinístico).
 */
export function buildExecutiveScore(
  input: ExecutiveIntelligenceInput,
): ExecutiveScoreResult {
  if (input.periodoFuturo) {
    return {
      score: null,
      status: "periodo_futuro",
      tone: "info",
      explanation:
        "Período ainda não iniciado — o score será calculado quando houver movimento.",
      factors: [],
    };
  }

  if (!input.possuiMeta) {
    return {
      score: null,
      status: "sem_meta",
      tone: "info",
      explanation:
        "Sem meta mensal cadastrada — o score não é classificado como crítico.",
      factors: [],
    };
  }

  const factors = [
    scoreProjecao(input),
    scoreRitmo(input),
    scoreAtingimento(input),
    scoreTendencia(input),
    scoreProbabilidade(input),
    scoreCrescimento(input),
  ];

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const weighted =
    totalWeight <= 0
      ? 0
      : factors.reduce((s, f) => s + (f.score * f.weight) / totalWeight, 0);

  let score = clamp(Math.round(weighted));

  // Baixa confiança: não inventar excelência — suaviza para baixo o topo
  if (input.confianca === "baixa" && score > 70) {
    score = Math.max(55, score - 12);
  }

  if (
    input.confianca === "baixa" &&
    input.diasUteisDecorridos < 3 &&
    input.vendasQuantidade < 3
  ) {
    const { status, tone } = statusFromScore(score);
    return {
      score,
      status:
        status === "excelente" || status === "bom"
          ? "dados_insuficientes"
          : status,
      tone: status === "excelente" || status === "bom" ? "info" : tone,
      explanation:
        input.confianca === "baixa"
          ? `Score preliminar ${score}/100 — ${input.confiancaMotivo}`
          : `Score executivo ${score}/100.`,
      factors,
    };
  }

  const { status, tone } = statusFromScore(score);
  const top = [...factors].sort((a, b) => a.score - b.score)[0];

  return {
    score,
    status,
    tone,
    explanation:
      input.periodoEncerrado
        ? `Mês encerrado — score final ${score}/100. Principal pressão: ${top?.label ?? "n/d"}.`
        : `Score ${score}/100. Principal pressão: ${top?.label ?? "n/d"} (${top?.explanation ?? ""}).`,
    factors,
  };
}
