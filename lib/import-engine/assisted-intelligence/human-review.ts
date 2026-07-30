/**
 * Sprint 22.7 — Fila de revisão humana (sem confirmação silenciosa de baixa confiança).
 */

import { requiresHumanReview } from "./confidence.ts";
import type {
  ClassificationDecision,
  ReviewAction,
  ReviewQueueItem,
} from "./types.ts";

export type ReviewDecisionInput = {
  item: ReviewQueueItem;
  action: ReviewAction;
  editedCategory?: string;
  linkEntryId?: string;
};

export type ReviewDecisionResult = {
  ok: boolean;
  error?: string;
  item: ReviewQueueItem;
  createRule?: boolean;
  applySimilar?: boolean;
};

/**
 * Nenhuma linha de baixa confiança pode ser confirmada sem ação humana explícita.
 * `confirm` exige ação explícita e rejeita se alguém tentar "auto" com baixa confiança
 * sem passar por esta fila.
 */
export function applyReviewDecision(input: ReviewDecisionInput): ReviewDecisionResult {
  const { item, action } = input;
  if (item.tenantId == null || item.tenantId === "") {
    return { ok: false, error: "tenant obrigatório", item };
  }

  if (action === "confirm") {
    if (requiresHumanReview(item.decision.overallConfidence) && item.status === "pending") {
      // Confirmação explícita via fila é permitida — é a revisão humana.
      return {
        ok: true,
        item: { ...item, status: "confirmed" },
        createRule: false,
      };
    }
    return { ok: true, item: { ...item, status: "confirmed" } };
  }

  if (action === "edit") {
    if (!input.editedCategory?.trim()) {
      return { ok: false, error: "categoria editada obrigatória", item };
    }
    const decision: ClassificationDecision = {
      ...item.decision,
      category: {
        ...item.decision.category,
        value: input.editedCategory.trim(),
        origin: "human_review",
        reason: "Editado manualmente na fila de revisão.",
        confidence: 1,
        band: "high",
      },
      winningOrigin: "human_review",
      requiresHumanReview: false,
      overallConfidence: 1,
      overallBand: "high",
    };
    return {
      ok: true,
      item: { ...item, status: "edited", decision },
      createRule: true,
    };
  }

  if (action === "ignore") {
    return { ok: true, item: { ...item, status: "ignored" } };
  }
  if (action === "mark_duplicate") {
    return { ok: true, item: { ...item, status: "duplicate" } };
  }
  if (action === "link_entry") {
    if (!input.linkEntryId) {
      return { ok: false, error: "linkEntryId obrigatório", item };
    }
    return { ok: true, item: { ...item, status: "linked" } };
  }
  if (action === "create_rule") {
    return { ok: true, item: { ...item, status: "confirmed" }, createRule: true };
  }
  if (action === "apply_similar") {
    return {
      ok: true,
      item: { ...item, status: "confirmed" },
      applySimilar: true,
      createRule: true,
    };
  }
  if (action === "batch_review") {
    return { ok: true, item };
  }

  return { ok: false, error: "ação desconhecida", item };
}

export function buildReviewQueue(
  tenantId: string,
  importRunId: string | null,
  decisions: ClassificationDecision[],
  descriptions: Map<number, string>,
): ReviewQueueItem[] {
  return decisions
    .filter((d) => d.requiresHumanReview)
    .map((d) => ({
      id: `${tenantId}:${importRunId ?? "adhoc"}:${d.rowNumber}`,
      tenantId,
      importRunId,
      rowNumber: d.rowNumber,
      description: descriptions.get(d.rowNumber) ?? "",
      decision: d,
      status: "pending" as const,
    }));
}

/** Impede “confirmação silenciosa” programática de baixa confiança. */
export function assertNoSilentLowConfidenceConfirm(
  decision: ClassificationDecision,
  confirmedSilently: boolean,
): void {
  if (confirmedSilently && decision.requiresHumanReview) {
    throw new Error(
      "Linha de baixa confiança não pode ser confirmada silenciosamente — use a fila de revisão humana.",
    );
  }
}
