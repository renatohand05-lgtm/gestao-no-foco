/**
 * Simulador “E se?” determinístico (Gate 20.6).
 * Aplica deltas % apenas sobre valores reais do snapshot/predictive.
 */

import type { ExecutiveAiInput } from "../ai/executive-ai-types.ts";
import type { PredictiveIntelligenceResult } from "../predictive/types.ts";
import { formatPredictiveMoney } from "../predictive/format.ts";
import type { EdcConfidence, EdcSimulation } from "./types.ts";
import { EDC_MAX_SIMULATIONS } from "./types.ts";

function money(n: number | null | undefined): string {
  return formatPredictiveMoney(n ?? null);
}

function applyPct(base: number, deltaPct: number): number {
  return base * (1 + deltaPct / 100);
}

function simUnavailable(
  kind: EdcSimulation["kind"],
  title: string,
  reason: string,
  deltaPct: number,
): EdcSimulation {
  return {
    id: `sim:${kind}`,
    kind,
    title,
    description: reason,
    deltaPct,
    baselineLabel: "Baseline",
    baselineValue: "Indisponível",
    projectedLabel: "Projetado",
    projectedValue: "Indisponível",
    deltaLabel: "—",
    confidence: "baixa",
    available: false,
    unavailableReason: reason,
    evidence: [],
  };
}

function simFromBase(params: {
  kind: EdcSimulation["kind"];
  title: string;
  description: string;
  deltaPct: number;
  baseline: number;
  baselineLabel: string;
  projectedLabel: string;
  confidence: EdcConfidence;
  evidenceLabel: string;
  evidenceSource: string;
}): EdcSimulation {
  const projected = applyPct(params.baseline, params.deltaPct);
  const delta = projected - params.baseline;
  return {
    id: `sim:${params.kind}`,
    kind: params.kind,
    title: params.title,
    description: params.description,
    deltaPct: params.deltaPct,
    baselineLabel: params.baselineLabel,
    baselineValue: money(params.baseline),
    projectedLabel: params.projectedLabel,
    projectedValue: money(projected),
    deltaLabel: `${delta >= 0 ? "+" : ""}${money(delta)} (${params.deltaPct > 0 ? "+" : ""}${params.deltaPct}%)`,
    confidence: params.confidence,
    available: true,
    unavailableReason: null,
    evidence: [
      {
        id: `sim:${params.kind}:base`,
        label: params.evidenceLabel,
        value: money(params.baseline),
        source: params.evidenceSource,
      },
    ],
  };
}

/**
 * Gera simulações locais. Sem base numérica → unavailable (não inventa).
 */
export function buildDecisionSimulations(params: {
  feeds: ExecutiveAiInput;
  predictive: PredictiveIntelligenceResult;
}): EdcSimulation[] {
  const { feeds, predictive } = params;
  const fat = feeds.comercial?.faturamentoPeriodo ?? null;
  const neg = feeds.comercial?.valorEmNegociacao ?? null;
  const saldo = feeds.financeiro?.saldoAtual ?? null;
  const proj7 = feeds.financeiro?.saldoProjetado7d ?? null;
  const receber = feeds.financeiro?.receberVencidoValor ?? null;
  const estoqueParado =
    feeds.estoque?.valorParadoDisponivel && feeds.estoque.valorParado != null
      ? feeds.estoque.valorParado
      : null;

  const fatForecast = predictive.forecasts.find((f) => f.domain === "faturamento");
  const confFromPred: EdcConfidence =
    predictive.overallConfidence === "alta"
      ? "alta"
      : predictive.overallConfidence === "media"
        ? "media"
        : "baixa";

  const out: EdcSimulation[] = [];

  // Ticket médio → usa faturamento período como proxy de receita (não inventa ticket)
  if (fat != null && fat > 0) {
    out.push(
      simFromBase({
        kind: "ticket_medio",
        title: "E se o ticket médio subir 10%?",
        description:
          "Simulação linear de +10% sobre o faturamento do período (proxy de ticket).",
        deltaPct: 10,
        baseline: fat,
        baselineLabel: "Faturamento período",
        projectedLabel: "Faturamento simulado",
        confidence: feeds.comercial?.status === "available" ? confFromPred : "baixa",
        evidenceLabel: "Faturamento período",
        evidenceSource: "comercial",
      }),
    );
  } else {
    out.push(
      simUnavailable(
        "ticket_medio",
        "E se o ticket médio subir 10%?",
        "Sem faturamento de período no snapshot.",
        10,
      ),
    );
  }

  // Redução de despesas → usa saídas implícitas via diferença saldo/projeção quando possível
  if (saldo != null && proj7 != null) {
    const pressure = Math.max(0, saldo - proj7);
    if (pressure > 0) {
      out.push(
        simFromBase({
          kind: "reducao_despesas",
          title: "E se reduzir a pressão de caixa em 15%?",
          description:
            "Aplica −15% sobre a pressão observada (saldo atual − projeção 7d positiva de saída).",
          deltaPct: -15,
          baseline: pressure,
          baselineLabel: "Pressão de caixa (7d)",
          projectedLabel: "Pressão simulada",
          confidence: feeds.financeiro?.status === "available" ? "media" : "baixa",
          evidenceLabel: "Pressão (saldo − proj. 7d)",
          evidenceSource: "cockpit",
        }),
      );
    } else {
      out.push(
        simUnavailable(
          "reducao_despesas",
          "E se reduzir despesas em 15%?",
          "Sem pressão de caixa positiva (saldo ≤ projeção 7d).",
          -15,
        ),
      );
    }
  } else {
    out.push(
      simUnavailable(
        "reducao_despesas",
        "E se reduzir despesas em 15%?",
        "Saldo ou projeção 7d indisponível.",
        -15,
      ),
    );
  }

  // Crescimento de faturamento
  if (fat != null && fat > 0) {
    out.push(
      simFromBase({
        kind: "crescimento_faturamento",
        title: "E se o faturamento crescer 12%?",
        description: "Projeção linear +12% sobre o faturamento do período.",
        deltaPct: 12,
        baseline: fat,
        baselineLabel: "Faturamento período",
        projectedLabel: "Faturamento simulado",
        confidence: confFromPred,
        evidenceLabel: "Faturamento período",
        evidenceSource: "comercial",
      }),
    );
  } else {
    out.push(
      simUnavailable(
        "crescimento_faturamento",
        "E se o faturamento crescer 12%?",
        "Sem faturamento de período no snapshot.",
        12,
      ),
    );
  }

  // Antecipação de recebíveis
  if (receber != null && receber > 0) {
    out.push(
      simFromBase({
        kind: "antecipacao_recebiveis",
        title: "E se antecipar 100% dos recebíveis vencidos?",
        description: "Assume entrada imediata do valor a receber vencido já evidenciado.",
        deltaPct: 0,
        baseline: receber,
        baselineLabel: "Receber vencido",
        projectedLabel: "Caixa potencial",
        confidence: "media",
        evidenceLabel: "Contas a receber vencidas",
        evidenceSource: "cockpit",
      }),
    );
    // Fix projected = same as baseline for 100% anticipation (deltaPct 0 means same)
    const last = out[out.length - 1];
    last.projectedValue = money(receber);
    last.deltaLabel = `+${money(receber)} (antecipação total)`;
    last.description =
      "Liberação potencial igual ao valor vencido já registrado no cockpit.";
  } else {
    out.push(
      simUnavailable(
        "antecipacao_recebiveis",
        "E se antecipar recebíveis vencidos?",
        "Sem valor a receber vencido no snapshot.",
        0,
      ),
    );
  }

  // Estoque parado
  if (estoqueParado != null && estoqueParado > 0) {
    out.push(
      simFromBase({
        kind: "reducao_estoque_parado",
        title: "E se reduzir 20% do estoque parado?",
        description: "Aplica −20% sobre o valor parado disponível no feed de estoque.",
        deltaPct: -20,
        baseline: estoqueParado,
        baselineLabel: "Valor parado",
        projectedLabel: "Valor parado simulado",
        confidence: feeds.estoque?.status === "available" ? "media" : "baixa",
        evidenceLabel: "Valor financeiro parado",
        evidenceSource: "estoque",
      }),
    );
  } else {
    out.push(
      simUnavailable(
        "reducao_estoque_parado",
        "E se reduzir estoque parado?",
        "Valor parado indisponível no snapshot.",
        -20,
      ),
    );
  }

  // Margem — usa negociação como proxy de receita em aberto (honesto)
  if (neg != null && neg > 0) {
    out.push(
      simFromBase({
        kind: "melhoria_margem",
        title: "E se melhorar a conversão do pipeline em 8%?",
        description:
          "Proxy: +8% sobre valor em negociação (não inventa margem percentual).",
        deltaPct: 8,
        baseline: neg,
        baselineLabel: "Em negociação",
        projectedLabel: "Potencial simulado",
        confidence: "baixa",
        evidenceLabel: "Valor em negociação",
        evidenceSource: "comercial",
      }),
    );
  } else {
    out.push(
      simUnavailable(
        "melhoria_margem",
        "E se melhorar margem/conversão?",
        "Sem valor em negociação no snapshot.",
        8,
      ),
    );
  }

  // Produtividade — proxy linear sobre faturamento (sem inventar produtividade)
  if (fat != null && fat > 0) {
    out.push(
      simFromBase({
        kind: "aumento_produtividade",
        title: "E se a produtividade comercial subir 5%?",
        description: "Proxy linear +5% sobre faturamento do período.",
        deltaPct: 5,
        baseline: fat,
        baselineLabel: "Faturamento período",
        projectedLabel: "Faturamento simulado",
        confidence: fatForecast ? confFromPred : "baixa",
        evidenceLabel: "Faturamento período",
        evidenceSource: "comercial",
      }),
    );
  } else {
    out.push(
      simUnavailable(
        "aumento_produtividade",
        "E se a produtividade subir 5%?",
        "Sem base de faturamento para simular produtividade.",
        5,
      ),
    );
  }

  return out.slice(0, EDC_MAX_SIMULATIONS);
}
