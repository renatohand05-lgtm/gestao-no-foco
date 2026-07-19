import { formatCurrency } from "@/lib/dashboard/format";
import type {
  ExecutiveIntelligenceInput,
  ExecutiveTimelineMilestone,
  ExecutiveTimelineResult,
} from "@/lib/intelligence/types";

function clampPct(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/**
 * Timeline executiva — só milestones derivados dos dados existentes.
 */
export function buildExecutiveTimeline(
  input: ExecutiveIntelligenceInput,
): ExecutiveTimelineResult {
  const total = Math.max(input.diasUteisTotais, 1);
  const elapsed = input.diasUteisDecorridos;
  const remaining = input.diasUteisRestantes;

  const todayPos = input.periodoFuturo
    ? 0
    : input.periodoEncerrado
      ? 100
      : clampPct((elapsed / total) * 100);

  const esperadoHoje =
    input.metaMensal !== null && input.ritmoEsperado > 0
      ? (input.metaMensal * input.ritmoEsperado) / 100
      : null;

  const milestones: ExecutiveTimelineMilestone[] = [
    {
      id: "inicio",
      label: "Início do mês",
      value: "Dia 1",
      status: elapsed > 0 || input.periodoEncerrado ? "done" : "current",
      positionPercent: 0,
    },
    {
      id: "hoje",
      label: input.periodoEncerrado ? "Fechamento" : "Hoje",
      value: `${elapsed}/${total} úteis`,
      status: input.periodoEncerrado ? "done" : "current",
      positionPercent: todayPos,
    },
  ];

  if (esperadoHoje !== null) {
    milestones.push({
      id: "meta-esperada",
      label: "Meta esperada até hoje",
      value: formatCurrency(esperadoHoje),
      status: "projected",
      positionPercent: todayPos,
    });
  }

  milestones.push({
    id: "realizado",
    label: "Realizado até hoje",
    value: formatCurrency(input.realizado),
    status: "current",
    positionPercent: todayPos,
  });

  if (input.possuiMeta) {
    const projPos = 92;
    milestones.push({
      id: "projecao",
      label: "Projeção de fechamento",
      value: formatCurrency(input.projecaoDiasUteis),
      status: "projected",
      positionPercent: projPos,
    });
  }

  milestones.push({
    id: "fim",
    label: "Fim do mês",
    value: `${total} úteis`,
    status: input.periodoEncerrado ? "done" : "upcoming",
    positionPercent: 100,
  });

  return {
    currentDay: elapsed,
    elapsedBusinessDays: elapsed,
    remainingBusinessDays: remaining,
    totalBusinessDays: total,
    milestones,
  };
}
