import { INTELLIGENCE_THRESHOLDS } from "@/lib/intelligence/alerts/thresholds";
import type {
  DashboardIntelligenceInput,
  HealthScoreFactor,
  HealthScoreLabel,
  HealthScoreResult,
} from "@/types/intelligence";

function clamp(value: number, min = 0, max = 100) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function scoreEbitda(input: DashboardIntelligenceInput): HealthScoreFactor {
  const { ebitda, receita_liquida } = input.kpis;
  if (ebitda < 0) {
    return {
      id: "ebitda",
      label: "EBITDA",
      weight: 20,
      score: 15,
      detail: "EBITDA negativo no período",
    };
  }
  if (receita_liquida <= 0) {
    return {
      id: "ebitda",
      label: "EBITDA",
      weight: 20,
      score: ebitda > 0 ? 60 : 40,
      detail: "Sem receita líquida para comparar EBITDA",
    };
  }
  const ratio = (ebitda / receita_liquida) * 100;
  return {
    id: "ebitda",
    label: "EBITDA",
    weight: 20,
    score: clamp(ratio * 2.5),
    detail: `EBITDA em ${ratio.toFixed(1)}% da receita líquida`,
  };
}

function scoreFluxo(input: DashboardIntelligenceInput): HealthScoreFactor {
  const { saldo_projetado, saldo_atual } = input.fluxo;
  if (saldo_projetado < 0) {
    return {
      id: "fluxo",
      label: "Fluxo de Caixa",
      weight: 15,
      score: 20,
      detail: "Saldo projetado negativo no período",
    };
  }
  if (saldo_atual < 0) {
    return {
      id: "fluxo",
      label: "Fluxo de Caixa",
      weight: 15,
      score: 35,
      detail: "Saldo bancário consolidado negativo",
    };
  }
  const cobertura =
    input.kpis.saidas_previstas > 0
      ? saldo_atual / input.kpis.saidas_previstas
      : 2;
  return {
    id: "fluxo",
    label: "Fluxo de Caixa",
    weight: 15,
    score: clamp(40 + cobertura * 30),
    detail: "Saldo e projeção em território positivo",
  };
}

function scoreCmv(input: DashboardIntelligenceInput): HealthScoreFactor {
  const { cmv, receita_liquida } = input.kpis;
  if (receita_liquida <= 0) {
    return {
      id: "cmv",
      label: "CMV",
      weight: 15,
      score: cmv === 0 ? 70 : 40,
      detail: "Sem receita líquida para avaliar CMV",
    };
  }
  const pct = (cmv / receita_liquida) * 100;
  const meta = INTELLIGENCE_THRESHOLDS.cmvMetaPct;
  if (pct <= meta * 0.75) {
    return {
      id: "cmv",
      label: "CMV",
      weight: 15,
      score: 95,
      detail: `CMV em ${pct.toFixed(1)}% (meta ${meta}%)`,
    };
  }
  if (pct <= meta) {
    return {
      id: "cmv",
      label: "CMV",
      weight: 15,
      score: 75,
      detail: `CMV em ${pct.toFixed(1)}% (dentro da meta ${meta}%)`,
    };
  }
  return {
    id: "cmv",
    label: "CMV",
    weight: 15,
    score: clamp(75 - (pct - meta) * 2),
    detail: `CMV em ${pct.toFixed(1)}% acima da meta ${meta}%`,
  };
}

function scoreMargem(input: DashboardIntelligenceInput): HealthScoreFactor {
  const margem = input.kpis.margem_media;
  const min = INTELLIGENCE_THRESHOLDS.margemMinimaPct;
  return {
    id: "margem",
    label: "Margem",
    weight: 15,
    score: clamp((margem / (min * 1.6)) * 100),
    detail: `Margem média de ${margem.toFixed(1)}%`,
  };
}

function scoreReceber(input: DashboardIntelligenceInput): HealthScoreFactor {
  const { total_aberto, total_vencido } = input.contasReceber;
  const base = total_aberto + total_vencido;
  if (base <= 0) {
    return {
      id: "contas_receber",
      label: "Contas a Receber",
      weight: 10,
      score: 90,
      detail: "Sem títulos pendentes relevantes",
    };
  }
  const vencidoPct = (total_vencido / base) * 100;
  return {
    id: "contas_receber",
    label: "Contas a Receber",
    weight: 10,
    score: clamp(100 - vencidoPct * 1.5),
    detail: `${vencidoPct.toFixed(0)}% do saldo em atraso`,
  };
}

function scorePagar(input: DashboardIntelligenceInput): HealthScoreFactor {
  const { total_aberto, total_vencido } = input.contasPagar;
  const base = total_aberto + total_vencido;
  if (base <= 0) {
    return {
      id: "contas_pagar",
      label: "Contas a Pagar",
      weight: 10,
      score: 90,
      detail: "Sem obrigações pendentes relevantes",
    };
  }
  const vencidoPct = (total_vencido / base) * 100;
  return {
    id: "contas_pagar",
    label: "Contas a Pagar",
    weight: 10,
    score: clamp(100 - vencidoPct * 1.5),
    detail: `${vencidoPct.toFixed(0)}% do saldo em atraso`,
  };
}

function scoreEstoque(input: DashboardIntelligenceInput): HealthScoreFactor {
  const baixa = input.estoqueBaixoCount;
  const parados = input.produtosParadosCount;
  const penalty = baixa * 12 + parados * 6;
  return {
    id: "estoque",
    label: "Estoque",
    weight: 10,
    score: clamp(100 - penalty),
    detail:
      baixa === 0 && parados === 0
        ? "Estoque sem alertas críticos"
        : `${baixa} abaixo do mínimo · ${parados} parados`,
  };
}

function scoreCrescimento(input: DashboardIntelligenceInput): HealthScoreFactor {
  const { variationPct, current, previous } = input.comparisons.quantidade_vendas;
  if (previous === 0 && current === 0) {
    return {
      id: "crescimento_vendas",
      label: "Crescimento de Vendas",
      weight: 5,
      score: 50,
      detail: "Sem vendas nos períodos comparados",
    };
  }
  if (variationPct === null) {
    return {
      id: "crescimento_vendas",
      label: "Crescimento de Vendas",
      weight: 5,
      score: current > 0 ? 80 : 40,
      detail: "Sem base no período anterior",
    };
  }
  return {
    id: "crescimento_vendas",
    label: "Crescimento de Vendas",
    weight: 5,
    score: clamp(50 + variationPct),
    detail: `Variação de ${variationPct.toFixed(1)}% nas vendas`,
  };
}

export function classifyHealthScore(score: number): HealthScoreLabel {
  const { excelenteMin, saudavelMin, atencaoMin, criticoMin } =
    INTELLIGENCE_THRESHOLDS.health;
  if (score >= excelenteMin) return "Excelente";
  if (score >= saudavelMin) return "Saudável";
  if (score >= atencaoMin) return "Atenção";
  if (score >= criticoMin) return "Crítico";
  return "Emergência";
}

export function calculateHealthScore(
  input: DashboardIntelligenceInput,
): HealthScoreResult {
  const factors = [
    scoreEbitda(input),
    scoreFluxo(input),
    scoreCmv(input),
    scoreMargem(input),
    scoreReceber(input),
    scorePagar(input),
    scoreEstoque(input),
    scoreCrescimento(input),
  ];

  const totalWeight = factors.reduce((acc, factor) => acc + factor.weight, 0);
  const weighted = factors.reduce(
    (acc, factor) => acc + factor.score * factor.weight,
    0,
  );
  const score = Math.round(clamp(weighted / totalWeight));

  return {
    score,
    label: classifyHealthScore(score),
    factors,
  };
}
