/**
 * Agregador do Command Center (Gate 20.7).
 * Orquestra engines existentes · sem fetch · sem regras paralelas.
 */

import type {
  ExecutiveAiInput,
  ExecutiveAiResult,
} from "../ai/executive-ai-types.ts";
import {
  runBusinessHealthEngine,
  type BusinessHealthResult,
} from "../dashboard/business-health-engine.ts";
import { composeExecutiveIntelligenceCenter } from "../dashboard/executive-intelligence-center-compose.ts";
import type { ExecutiveDecisionResult } from "../dashboard/executive-decision-types.ts";
import type { ExecutiveIntelligenceCenterData } from "../dashboard/executive-intelligence-center-types.ts";
import {
  runExecutiveDecisionCenter,
  type EdcResult,
} from "../executive-decision-center/index.ts";
import {
  runExecutiveTimeline,
  type ExecutiveTimelineResult,
} from "../executive-timeline/index.ts";
import type { PredictiveIntelligenceResult } from "../predictive/types.ts";
import { formatPredictiveMoney, formatPredictivePct } from "../predictive/format.ts";
import type { EccHojeKpis } from "./summary.ts";
import type {
  EccForecastSlice,
  EccGoalsSlice,
  EccKpiItem,
} from "./types.ts";
import {
  ECC_UNAVAILABLE_DRE_HINT,
  ECC_UNAVAILABLE_LABEL,
} from "./types.ts";

export type CommandAggregate = {
  bh: BusinessHealthResult;
  eic: ExecutiveIntelligenceCenterData;
  timeline: ExecutiveTimelineResult;
  edc: EdcResult;
};

export function aggregateCommandSources(params: {
  tenantSlug: string;
  ai: ExecutiveAiResult;
  predictive: PredictiveIntelligenceResult;
  feeds?: ExecutiveAiInput | null;
  decision?: ExecutiveDecisionResult | null;
  businessHealth?: BusinessHealthResult;
  timeline?: ExecutiveTimelineResult;
  edc?: EdcResult;
}): CommandAggregate {
  const bh =
    params.businessHealth ?? runBusinessHealthEngine(params.ai);

  const eic = composeExecutiveIntelligenceCenter({
    ai: params.ai,
    decision: params.decision ?? null,
  });

  const timeline =
    params.timeline ??
    runExecutiveTimeline({
      tenantSlug: params.tenantSlug,
      ai: params.ai,
      predictive: params.predictive,
      decision: params.decision ?? null,
      businessHealth: bh,
    });

  const edc =
    params.edc ??
    runExecutiveDecisionCenter({
      tenantSlug: params.tenantSlug,
      ai: params.ai,
      predictive: params.predictive,
      feeds: params.feeds ?? null,
      decision: params.decision ?? null,
      businessHealth: bh,
      timeline,
    });

  return { bh, eic, timeline, edc };
}

function forecastSlice(
  predictive: PredictiveIntelligenceResult,
  domain: string,
  id: string,
): EccForecastSlice | null {
  const f = predictive.forecasts.find((x) => x.domain === domain);
  if (!f) return null;
  return {
    id,
    title: f.title,
    headline: f.headline,
    primaryValue: f.primaryValue,
    horizon: f.horizon,
    confidence: f.confidence,
    riskLabel: f.riskLabel,
    available: !(f.unavailableReason && f.evidence.length === 0),
    unavailableReason: f.unavailableReason,
  };
}

export function buildCommandForecasts(
  predictive: PredictiveIntelligenceResult,
): {
  cashflowForecast: EccForecastSlice | null;
  financialForecast: EccForecastSlice | null;
  operationalForecast: EccForecastSlice | null;
} {
  return {
    cashflowForecast: forecastSlice(predictive, "fluxo_caixa", "fc:cash"),
    financialForecast: forecastSlice(predictive, "faturamento", "fc:fin"),
    operationalForecast: forecastSlice(
      predictive,
      "risco_operacional",
      "fc:ops",
    ),
  };
}

export function buildCommandGoals(params: {
  feeds: ExecutiveAiInput | null | undefined;
  hoje?: EccHojeKpis | null;
}): EccGoalsSlice {
  const comercial = params.feeds?.comercial;
  const pct =
    params.hoje?.percentualMes ?? comercial?.metaPercentual ?? null;
  const proj =
    params.hoje?.projecaoFechamento != null
      ? formatPredictiveMoney(params.hoje.projecaoFechamento)
      : "Indisponível";

  // Nunca usar percentual como label da meta; ausência ≠ R$ 0,00
  const hasMeta =
    params.hoje?.metaMes != null &&
    Number.isFinite(params.hoje.metaMes) &&
    params.hoje.metaMes > 0;

  return {
    metaMesLabel: hasMeta
      ? formatPredictiveMoney(params.hoje!.metaMes!)
      : "Meta não cadastrada",
    percentualLabel: hasMeta ? formatPredictivePct(pct) : "Meta não cadastrada",
    projecaoLabel: proj,
    abaixoRitmo: hasMeta ? (comercial?.metaAbaixoRitmo ?? null) : null,
    available: hasMeta,
  };
}

export function buildCommandKpis(params: {
  feeds: ExecutiveAiInput | null | undefined;
  bh: BusinessHealthResult;
  predictive: PredictiveIntelligenceResult;
  hoje?: EccHojeKpis | null;
}): EccKpiItem[] {
  const fin = params.feeds?.financeiro;
  const com = params.feeds?.comercial;
  const op = params.feeds?.operacao;
  const fatForecast = params.predictive.forecasts.find(
    (f) => f.domain === "faturamento",
  );
  const cashForecast = params.predictive.forecasts.find(
    (f) => f.domain === "fluxo_caixa",
  );

  const receitaValue =
    params.hoje?.projecaoFechamento != null
      ? formatPredictiveMoney(params.hoje.projecaoFechamento)
      : fatForecast && fatForecast.primaryValue !== "Indisponível"
        ? fatForecast.primaryValue
        : com?.faturamentoPeriodo != null
          ? formatPredictiveMoney(com.faturamentoPeriodo)
          : "Indisponível";

  const fluxoValue =
    fin?.saldoProjetado7d != null
      ? formatPredictiveMoney(fin.saldoProjetado7d)
      : cashForecast && cashForecast.primaryValue !== "Indisponível"
        ? cashForecast.primaryValue
        : "Indisponível";

  const ticketRaw =
    params.hoje?.ticketMedioHoje ??
    params.hoje?.ticketMedioMes ??
    com?.ticketMedio ??
    null;
  const ticket =
    ticketRaw != null && Number.isFinite(ticketRaw)
      ? formatPredictiveMoney(ticketRaw)
      : "Indisponível";

  const conversao =
    com?.conversaoDisponivel && com.taxaConversaoPct != null
      ? formatPredictivePct(com.taxaConversaoPct)
      : "Indisponível";

  const estoqueScore = params.bh.inventory.score;
  const est = params.feeds?.estoque;
  let estoque = "Indisponível";
  let estoqueTone: EccKpiItem["tone"] = "neutral";
  let estoqueHint: string | null = "Score Business Health · estoque";
  if (estoqueScore != null) {
    estoque = `${Math.round(estoqueScore)}/100`;
    estoqueTone = estoqueScore < 65 ? "warning" : "success";
  } else if (est && est.status !== "unavailable") {
    const zerados = est.zerados ?? 0;
    const abaixo = est.abaixoMinimo ?? 0;
    estoque = `${zerados} zerados · ${abaixo} abaixo mín.`;
    estoqueTone = zerados > 0 || abaixo > 0 ? "warning" : "info";
    estoqueHint = "Feed de estoque (score BH indisponível)";
  }

  const osAtraso =
    op?.atrasadas != null ? String(op.atrasadas) : "Indisponível";

  const meta =
    params.hoje?.percentualMes != null
      ? formatPredictivePct(params.hoje.percentualMes)
      : com?.metaPercentual != null
        ? formatPredictivePct(com.metaPercentual)
        : "Indisponível";

  const mk = (
    key: EccKpiItem["key"],
    label: string,
    value: string,
    hint: string | null,
    tone: EccKpiItem["tone"] = "neutral",
  ): EccKpiItem => ({
    key,
    label,
    value,
    hint,
    available:
      value !== "Indisponível" && value !== ECC_UNAVAILABLE_LABEL,
    tone:
      value === "Indisponível" || value === ECC_UNAVAILABLE_LABEL
        ? "neutral"
        : tone,
  });

  return [
    mk(
      "receita_prevista",
      "Receita prevista",
      receitaValue,
      "Projeção / faturamento evidenciado",
      "info",
    ),
    mk(
      "lucro_previsto",
      "Lucro previsto",
      ECC_UNAVAILABLE_LABEL,
      ECC_UNAVAILABLE_DRE_HINT,
    ),
    mk(
      "fluxo_previsto",
      "Fluxo previsto",
      fluxoValue,
      "Saldo projetado 7d ou forecast de caixa",
      fluxoValue !== "Indisponível" && fin?.saldoProjetado7d != null && fin.saldoProjetado7d < 0
        ? "danger"
        : "info",
    ),
    mk(
      "margem",
      "Margem",
      ECC_UNAVAILABLE_LABEL,
      ECC_UNAVAILABLE_DRE_HINT,
    ),
    mk(
      "ticket_medio",
      "Ticket médio",
      ticket,
      "Hoje → mês → CI comercial",
    ),
    mk("conversao", "Conversão", conversao, "Taxa de conversão comercial"),
    mk(
      "estoque_saudavel",
      "Estoque saudável",
      estoque,
      estoqueHint,
      estoqueTone,
    ),
    mk(
      "os_atraso",
      "OS em atraso",
      osAtraso,
      "Feed operacional",
      op?.atrasadas != null && op.atrasadas > 0 ? "warning" : "success",
    ),
    mk("meta", "Meta", meta, "Atingimento de meta (mês / comercial)"),
  ];
}
