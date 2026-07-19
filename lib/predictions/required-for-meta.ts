import {
  classifyDailyGrowthViability,
  viabilityLabel,
  worstViability,
  classifyCoverageViability,
} from "@/lib/predictions/confidence";
import { dailyGrowthNeededPercent } from "@/lib/predictions/daily-target-simulator";
import {
  estimateRemainingSales,
  projectedGap,
} from "@/lib/predictions/projection-math";
import type {
  PredictionInput,
  RequiredForMetaResult,
} from "@/lib/predictions/types";

/**
 * Calcula o necessário para atingir a meta (média, ticket, volume).
 */
export function buildRequiredForMeta(
  input: PredictionInput,
): RequiredForMetaResult {
  const assumptions: string[] = [];

  if (!input.possuiMeta || input.metaMensal === null) {
    return {
      requiredDailyAverage: null,
      requiredDailyGrowthPercent: null,
      additionalSalesNeeded: null,
      requiredTicket: null,
      requiredVolume: null,
      assumptions: ["Sem meta mensal — cenário necessário não se aplica."],
      viability: "dados_insuficientes",
      alert: "Cadastre a meta mensal para calcular o necessário.",
    };
  }

  if (input.periodoFuturo) {
    return {
      requiredDailyAverage: null,
      requiredDailyGrowthPercent: null,
      additionalSalesNeeded: null,
      requiredTicket: null,
      requiredVolume: null,
      assumptions: ["Competência futura — ainda não há dias a recuperar."],
      viability: "dados_insuficientes",
      alert: "Aguarde o início do período.",
    };
  }

  const gap = projectedGap(input.realizado, input.metaMensal);
  const gapPositive = gap !== null && gap > 0 ? gap : 0;

  if (gap !== null && gap <= 0) {
    return {
      requiredDailyAverage: 0,
      requiredDailyGrowthPercent: 0,
      additionalSalesNeeded: 0,
      requiredTicket: input.ticketAtual,
      requiredVolume: 0,
      assumptions: ["Meta já atingida ou superada pelo realizado."],
      viability: "viavel",
      alert: null,
    };
  }

  let requiredDailyAverage: number | null = input.necessarioDiaUtil;
  if (
    (requiredDailyAverage === null || requiredDailyAverage < 0) &&
    input.diasUteisRestantes > 0
  ) {
    requiredDailyAverage = gapPositive / input.diasUteisRestantes;
    assumptions.push(
      "Necessário/dia recalculado como gap residual ÷ dias úteis restantes.",
    );
  } else if (requiredDailyAverage !== null) {
    assumptions.push(
      "Usa o necessário por dia útil já calculado no painel comercial.",
    );
  }

  if (input.periodoEncerrado || input.diasUteisRestantes <= 0) {
    return {
      requiredDailyAverage: null,
      requiredDailyGrowthPercent: null,
      additionalSalesNeeded:
        input.ticketAtual > 0 ? gapPositive / input.ticketAtual : null,
      requiredTicket: null,
      requiredVolume:
        input.ticketAtual > 0 ? gapPositive / input.ticketAtual : null,
      assumptions: [
        "Período encerrado — não há dias restantes para elevar média diária.",
        ...(gapPositive > 0
          ? [
              "Gap residual só seria coberto por receita adicional já impossível no calendário.",
            ]
          : []),
      ],
      viability: gapPositive > 0 ? "impossivel" : "viavel",
      alert:
        gapPositive > 0
          ? "Com o mês encerrado e gap residual, o cenário de fechamento na meta é impossível no calendário atual."
          : null,
    };
  }

  const requiredDailyGrowthPercent = dailyGrowthNeededPercent(input);
  const remainingSales = estimateRemainingSales(input);

  let additionalSalesNeeded: number | null = null;
  let requiredTicket: number | null = null;
  let requiredVolume: number | null = null;

  if (input.ticketAtual > 0) {
    additionalSalesNeeded = gapPositive / input.ticketAtual;
    assumptions.push(
      "Vendas adicionais = gap residual ÷ ticket atual (volume incremental).",
    );
  }

  if (remainingSales !== null && remainingSales > 0) {
    requiredTicket = gapPositive / remainingSales;
    assumptions.push(
      "Ticket necessário mantém o volume estimado restante constante.",
    );
    requiredVolume = remainingSales;
  } else if (input.ticketAtual > 0) {
    requiredVolume = gapPositive / input.ticketAtual;
    assumptions.push(
      "Volume necessário = gap ÷ ticket atual (sem base suficiente de ritmo de vendas).",
    );
  }

  const growth = requiredDailyGrowthPercent;
  const projectedIfRequired =
    input.realizado +
    (requiredDailyAverage ?? 0) * input.diasUteisRestantes;

  const viability = worstViability(
    classifyDailyGrowthViability(growth, input),
    classifyCoverageViability(projectedIfRequired, input.metaMensal, input),
  );

  let alert: string | null = null;
  if (growth !== null && Number.isFinite(growth) && growth > 0) {
    alert = `Para atingir a meta, seria necessário elevar a média diária em ${growth.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%, ${viabilityLabel(viability).toLowerCase()}.`;
  }

  if (viability === "impossivel" || viability === "improvavel") {
    assumptions.push(
      "Valores extremos mantidos com alerta de viabilidade — não foi inventada alternativa.",
    );
  }

  return {
    requiredDailyAverage,
    requiredDailyGrowthPercent: growth,
    additionalSalesNeeded,
    requiredTicket,
    requiredVolume,
    assumptions,
    viability,
    alert,
  };
}
