/**
 * Sprint 25.4.2 — Preview de impacto do desfazer importação.
 */

import type {
  EntityUndoDecision,
  ImportUndoEligibilitySummary,
} from "./eligibility.ts";

export type ImportUndoImpactPreview = {
  summary: ImportUndoEligibilitySummary;
  productsToRemove: Array<{ id: string; label: string }>;
  servicesToRemove: Array<{ id: string; label: string }>;
  movementsToReverse: Array<{ id: string; label: string; qty: number }>;
  stockImpactQty: number;
  payablesAffected: number;
  receiptsAffected: number;
  blockedItems: EntityUndoDecision[];
  eligibleItems: EntityUndoDecision[];
  financialImpactNote: string;
  stockImpactNote: string;
  warning: string;
};

export function buildUndoImpactPreview(input: {
  summary: ImportUndoEligibilitySummary;
  labels?: Record<string, string>;
  movementQtys?: Record<string, number>;
  payablesAffected?: number;
  receiptsAffected?: number;
}): ImportUndoImpactPreview {
  const eligibleItems = input.summary.decisions.filter(
    (d) =>
      d.eligible &&
      (d.action === "soft_delete" ||
        d.action === "delete" ||
        d.action === "reverse_movement"),
  );
  const blockedItems = input.summary.decisions.filter(
    (d) => !d.eligible || d.action === "block" || d.action === "inactivate",
  );

  const productsToRemove = eligibleItems
    .filter(
      (d) =>
        d.targetType === "produto" &&
        (d.action === "soft_delete" || d.action === "delete"),
    )
    .map((d) => ({
      id: d.targetId,
      label: d.label ?? input.labels?.[d.targetId] ?? d.targetId,
    }));

  const servicesToRemove = eligibleItems
    .filter((d) => d.targetType === "servico")
    .map((d) => ({
      id: d.targetId,
      label: d.label ?? input.labels?.[d.targetId] ?? d.targetId,
    }));

  const movementsToReverse = eligibleItems
    .filter(
      (d) =>
        d.targetType === "estoque_movimentacao" &&
        d.action === "reverse_movement",
    )
    .map((d) => ({
      id: d.targetId,
      label: d.label ?? d.targetId,
      qty: input.movementQtys?.[d.targetId] ?? 0,
    }));

  const stockImpactQty = movementsToReverse.reduce((s, m) => s + m.qty, 0);

  return {
    summary: input.summary,
    productsToRemove,
    servicesToRemove,
    movementsToReverse,
    stockImpactQty,
    payablesAffected: input.payablesAffected ?? 0,
    receiptsAffected: input.receiptsAffected ?? 0,
    blockedItems,
    eligibleItems,
    financialImpactNote:
      (input.payablesAffected ?? 0) > 0
        ? `${input.payablesAffected} conta(s) a pagar potencialmente afetada(s).`
        : "Sem impacto financeiro identificado neste preview.",
    stockImpactNote:
      movementsToReverse.length > 0
        ? `${movementsToReverse.length} movimentação(ões) serão revertidas (qty líquida ~ ${stockImpactQty}).`
        : "Sem reversão de estoque elegível.",
    warning:
      "Esta ação pode alterar estoque e lançamentos financeiros. Revise o impacto antes de continuar.",
  };
}
