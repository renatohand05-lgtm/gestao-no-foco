import { viabilityLabel } from "@/lib/predictions/confidence";
import { simulateDailyAveragePercent } from "@/lib/predictions/daily-target-simulator";
import {
  buildBaseScenario,
  simulateRecoveryDays,
} from "@/lib/predictions/revenue-simulator";
import { buildRequiredForMeta } from "@/lib/predictions/required-for-meta";
import { scoreScenario } from "@/lib/predictions/scenario-comparator";
import {
  PREDICTION_DEFAULT_SIMULATOR,
  PREDICTION_MAX_SCENARIOS,
} from "@/lib/predictions/thresholds";
import { simulateTicketPercent } from "@/lib/predictions/ticket-simulator";
import type {
  PredictionInput,
  RequiredForMetaResult,
  ScenarioCardModel,
} from "@/lib/predictions/types";

/**
 * Gera 3–5 cenários padrão sem redundância.
 */
export function buildDefaultScenarios(
  input: PredictionInput,
  required: RequiredForMetaResult,
): ScenarioCardModel[] {
  const base = buildBaseScenario(input);
  const scenarios: ScenarioCardModel[] = [];

  scenarios.push(
    scoreScenario({
      id: "base",
      kind: "base",
      name: "Mantendo o ritmo atual",
      description: base.explanation,
      confidence: base.confidence,
      projectedRevenue: base.projectedRevenue,
      projectedAttainment: base.projectedAttainment,
      projectedGap: base.projectedGap,
      probability: base.probability,
      estimatedIncrement: 0,
      viability: base.viability,
      viabilityLabel: viabilityLabel(base.viability),
      effortHints: { kind: "base" },
      baseRevenue: base.projectedRevenue,
      meta: input.metaMensal,
      gapBase: base.projectedGap,
    }),
  );

  // Só gera lift de média se há dias restantes e média > 0
  if (
    !input.periodoEncerrado &&
    !input.periodoFuturo &&
    input.diasUteisRestantes > 0 &&
    input.mediaDiariaAtual > 0
  ) {
    const daily = simulateDailyAveragePercent(
      input,
      PREDICTION_DEFAULT_SIMULATOR.dailyPercentDelta,
    );
    scenarios.push(
      scoreScenario({
        id: "daily-plus-10",
        kind: "daily_average",
        name: `Média diária +${PREDICTION_DEFAULT_SIMULATOR.dailyPercentDelta}%`,
        description: daily.assumption,
        confidence: daily.confidence,
        projectedRevenue: daily.projectedRevenue,
        projectedAttainment: daily.projectedAttainment,
        projectedGap: daily.projectedGap,
        probability: daily.probability,
        estimatedIncrement: daily.estimatedIncrement,
        viability: daily.viability,
        viabilityLabel: viabilityLabel(daily.viability),
        effortHints: {
          kind: "daily_average",
          percentDelta: PREDICTION_DEFAULT_SIMULATOR.dailyPercentDelta,
        },
        baseRevenue: base.projectedRevenue,
        meta: input.metaMensal,
        gapBase: base.projectedGap,
      }),
    );
  }

  if (
    !input.periodoEncerrado &&
    !input.periodoFuturo &&
    input.ticketAtual > 0 &&
    input.quantidadeVendas >= 1
  ) {
    const ticket = simulateTicketPercent(
      input,
      PREDICTION_DEFAULT_SIMULATOR.ticketPercentDelta,
    );
    // Evita redundância se incremento for ~0
    if (Math.abs(ticket.estimatedIncrement) > 0.01) {
      scenarios.push(
        scoreScenario({
          id: "ticket-plus-5",
          kind: "ticket",
          name: `Ticket +${PREDICTION_DEFAULT_SIMULATOR.ticketPercentDelta}%`,
          description: ticket.assumption,
          confidence: ticket.confidence,
          projectedRevenue: ticket.estimatedRevenue,
          projectedAttainment: ticket.projectedAttainment,
          projectedGap: ticket.projectedGap,
          probability: ticket.probability,
          estimatedIncrement: ticket.estimatedIncrement,
          viability: ticket.viability,
          viabilityLabel: viabilityLabel(ticket.viability),
          effortHints: {
            kind: "ticket",
            percentDelta: PREDICTION_DEFAULT_SIMULATOR.ticketPercentDelta,
          },
          baseRevenue: base.projectedRevenue,
          meta: input.metaMensal,
          gapBase: base.projectedGap,
        }),
      );
    }
  }

  if (
    !input.periodoEncerrado &&
    !input.periodoFuturo &&
    input.diasUteisRestantes > 0
  ) {
    const recovery = simulateRecoveryDays(input, {
      days: Math.min(
        PREDICTION_DEFAULT_SIMULATOR.recoveryDays,
        input.diasUteisRestantes,
      ),
      liftPercent: PREDICTION_DEFAULT_SIMULATOR.recoveryLiftPercent,
    });
    if (recovery.recoveredDays > 0) {
      scenarios.push(
        scoreScenario({
          id: "recovery-3d",
          kind: "recovery",
          name: `Recuperar ${recovery.recoveredDays} dia(s) acima da meta diária`,
          description: recovery.assumption,
          confidence: recovery.confidence,
          projectedRevenue: recovery.projectedRevenue,
          projectedAttainment: recovery.projectedAttainment,
          projectedGap: recovery.projectedGap,
          probability: recovery.probability,
          estimatedIncrement: recovery.estimatedIncrement,
          viability: recovery.viability,
          viabilityLabel: viabilityLabel(recovery.viability),
          effortHints: {
            kind: "recovery",
            days: recovery.recoveredDays,
            liftPercent: recovery.targetLiftPercent,
          },
          baseRevenue: base.projectedRevenue,
          meta: input.metaMensal,
          gapBase: base.projectedGap,
        }),
      );
    }
  }

  if (
    input.possuiMeta &&
    required.requiredDailyAverage !== null &&
    required.requiredDailyGrowthPercent !== null &&
    required.requiredDailyGrowthPercent > 0.5
  ) {
    // Cenário necessário: projeta com a média requerida
    const needed = simulateDailyAveragePercent(
      input,
      required.requiredDailyGrowthPercent,
    );
    // Evita clone do +10% se growth ≈ 10
    const nearDefault =
      Math.abs(
        required.requiredDailyGrowthPercent -
          PREDICTION_DEFAULT_SIMULATOR.dailyPercentDelta,
      ) < 1;
    if (!nearDefault) {
      scenarios.push(
        scoreScenario({
          id: "required-meta",
          kind: "required_for_meta",
          name: "Necessário para atingir a meta",
          description:
            required.alert ??
            `Elevar a média diária para ${required.requiredDailyAverage.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
          confidence: needed.confidence,
          projectedRevenue: needed.projectedRevenue,
          projectedAttainment: needed.projectedAttainment,
          projectedGap: needed.projectedGap,
          probability: needed.probability,
          estimatedIncrement: needed.estimatedIncrement,
          viability: required.viability,
          viabilityLabel: viabilityLabel(required.viability),
          effortHints: {
            kind: "required_for_meta",
            percentDelta: required.requiredDailyGrowthPercent,
          },
          baseRevenue: base.projectedRevenue,
          meta: input.metaMensal,
          gapBase: base.projectedGap,
        }),
      );
    }
  }

  return scenarios.slice(0, PREDICTION_MAX_SCENARIOS);
}

export { buildRequiredForMeta };
