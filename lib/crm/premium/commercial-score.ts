/**
 * Score comercial determinístico — regras em config/crm/commercial-score.ts.
 */

import {
  COMMERCIAL_SCORE_CONFIG,
  type CommercialScoreConfig,
  type CommercialScoreCriterionId,
} from "@/config/crm/commercial-score";
import type { CommercialScoreResult, ScoreBreakdownItem } from "./types";

export type ScoreInput = {
  daysWithoutContact: number | null;
  valorEstimado: number | null;
  stage: string | null;
  /** Contagem de vendas/OS históricas do cliente. */
  historicoCount: number;
  /** Eventos/tarefas recentes (30d). */
  atividadeCount: number;
  origem: string | null;
  now?: Date;
};

const LABELS: Record<CommercialScoreCriterionId, string> = {
  tempo_sem_contato: "Tempo sem contato",
  valor: "Valor",
  etapa: "Etapa",
  historico: "Histórico",
  atividade: "Atividade",
  origem: "Origem",
};

function bandRatio(
  bands: Array<{ maxDays: number; ratio: number }>,
  days: number,
): number {
  for (const b of bands) {
    if (days <= b.maxDays) return b.ratio;
  }
  return bands[bands.length - 1]?.ratio ?? 0;
}

function valueRatio(
  bands: Array<{ minValue: number; ratio: number }>,
  value: number,
): number {
  const sorted = [...bands].sort((a, b) => b.minValue - a.minValue);
  for (const b of sorted) {
    if (value >= b.minValue) return b.ratio;
  }
  return 0.15;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function computeCommercialScore(
  input: ScoreInput,
  config: CommercialScoreConfig = COMMERCIAL_SCORE_CONFIG,
): CommercialScoreResult {
  const w = config.weights;
  const breakdown: ScoreBreakdownItem[] = [];

  const days =
    input.daysWithoutContact == null
      ? 45
      : Math.max(0, input.daysWithoutContact);
  const contactPts = Math.round(
    w.tempo_sem_contato * bandRatio(config.daysWithoutContactBands, days),
  );
  breakdown.push({
    id: "tempo_sem_contato",
    label: LABELS.tempo_sem_contato,
    weight: w.tempo_sem_contato,
    points: contactPts,
  });

  const valor = Number(input.valorEstimado ?? 0);
  const valorPts = Math.round(w.valor * valueRatio(config.valueBands, valor));
  breakdown.push({
    id: "valor",
    label: LABELS.valor,
    weight: w.valor,
    points: valorPts,
  });

  const stageKey = (input.stage ?? "lead").toLowerCase();
  const stageRatio = config.stageRatios[stageKey] ?? 0.35;
  const etapaPts = Math.round(w.etapa * stageRatio);
  breakdown.push({
    id: "etapa",
    label: LABELS.etapa,
    weight: w.etapa,
    points: etapaPts,
  });

  const histRatio = clamp(input.historicoCount / 5, 0, 1);
  const histPts = Math.round(w.historico * (0.2 + 0.8 * histRatio));
  breakdown.push({
    id: "historico",
    label: LABELS.historico,
    weight: w.historico,
    points: histPts,
  });

  const actRatio = clamp(input.atividadeCount / 8, 0, 1);
  const actPts = Math.round(w.atividade * (0.15 + 0.85 * actRatio));
  breakdown.push({
    id: "atividade",
    label: LABELS.atividade,
    weight: w.atividade,
    points: actPts,
  });

  const originKey = (input.origem ?? "").toLowerCase().trim();
  let originRatio = config.defaultOriginRatio;
  if (originKey) {
    for (const [k, r] of Object.entries(config.originRatios)) {
      if (originKey.includes(k)) {
        originRatio = r;
        break;
      }
    }
  }
  const origemPts = Math.round(w.origem * originRatio);
  breakdown.push({
    id: "origem",
    label: LABELS.origem,
    weight: w.origem,
    points: origemPts,
  });

  const score = clamp(
    breakdown.reduce((a, b) => a + b.points, 0),
    0,
    config.maxScore,
  );

  return { score, breakdown };
}

export function daysBetween(isoA: string | null | undefined, now: Date): number | null {
  if (!isoA) return null;
  const t = Date.parse(isoA);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((now.getTime() - t) / 86_400_000));
}
