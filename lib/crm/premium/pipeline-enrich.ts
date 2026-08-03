/**
 * Helpers para enriquecer cards do funil com idade / parado / score.
 */

import { computeCommercialScore, daysBetween } from "./commercial-score";

export function enrichPipelineCardMetrics(args: {
  createdAt: string;
  updatedAt: string;
  ultimoContatoAt: string | null;
  valorEstimado: number | null;
  valorPipeline: number;
  stage: string;
  origem: string | null;
  historicoCount: number;
  atividadeCount: number;
  storedScore: number;
  now?: Date;
}) {
  const now = args.now ?? new Date();
  const idadeDias = daysBetween(args.createdAt, now) ?? 0;
  const tempoParadoDias = daysBetween(args.updatedAt, now) ?? 0;
  const daysWithoutContact = daysBetween(args.ultimoContatoAt, now);

  const computed = computeCommercialScore({
    daysWithoutContact,
    valorEstimado: args.valorEstimado ?? args.valorPipeline,
    stage: args.stage,
    historicoCount: args.historicoCount,
    atividadeCount: args.atividadeCount,
    origem: args.origem,
    now,
  });

  // Preferir score determinístico; se stored > 0 e computed zerado por falta de dados, mistura leve.
  const commercialScore =
    args.storedScore > 0
      ? Math.round(computed.score * 0.7 + Math.min(100, args.storedScore) * 0.3)
      : computed.score;

  return {
    idadeDias,
    tempoParadoDias,
    commercialScore,
    scoreBreakdown: computed.breakdown,
  };
}
