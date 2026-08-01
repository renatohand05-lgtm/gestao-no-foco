/**
 * Sprint 26.8 — Workflow de aprovação tributária.
 * Versão published é imutável; edição cria novo draft.
 */

import type { TaxRuleStatus } from "./types.ts";

const TRANSITIONS: Record<TaxRuleStatus, readonly TaxRuleStatus[]> = {
  draft: ["under_review", "archived"],
  under_review: ["draft", "approved", "archived"],
  approved: ["published", "draft", "archived"],
  published: ["superseded", "suspended", "archived"],
  superseded: ["archived"],
  suspended: ["archived", "draft"],
  archived: [],
};

export function canTransition(
  from: TaxRuleStatus,
  to: TaxRuleStatus,
): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(
  from: TaxRuleStatus,
  to: TaxRuleStatus,
): { ok: true } | { ok: false; message: string } {
  if (!canTransition(from, to)) {
    return {
      ok: false,
      message: `Transição inválida: ${from} → ${to}`,
    };
  }
  return { ok: true };
}

/** Publicação exige aprovação prévia (approved → published). */
export function canPublish(status: TaxRuleStatus): boolean {
  return status === "approved";
}

export function isImmutableStatus(status: TaxRuleStatus): boolean {
  return status === "published" || status === "superseded";
}

export function workflowActionsFor(status: TaxRuleStatus): string[] {
  const map: Record<TaxRuleStatus, string[]> = {
    draft: ["editar", "enviar_revisao", "arquivar", "clonar"],
    under_review: [
      "solicitar_ajuste",
      "aprovar",
      "rejeitar",
      "arquivar",
    ],
    approved: ["publicar", "agendar_publicacao", "voltar_draft", "arquivar"],
    published: [
      "suspender",
      "arquivar",
      "criar_nova_versao",
      "rollback_versionado",
    ],
    superseded: ["arquivar"],
    suspended: ["arquivar", "criar_nova_versao"],
    archived: [],
  };
  return map[status] ?? [];
}

export const WORKFLOW_ORDER: readonly TaxRuleStatus[] = [
  "draft",
  "under_review",
  "approved",
  "published",
  "superseded",
  "suspended",
  "archived",
];
