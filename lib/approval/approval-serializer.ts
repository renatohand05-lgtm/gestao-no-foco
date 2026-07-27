/**
 * Sprint 21.4 — Serialização JSON (sem gravar arquivos).
 */

import { normalizeApprovalDefinition } from "./approval-definition.ts";
import { validateApprovalDefinition } from "./approval-validation.ts";
import type { ApprovalDefinition, ApprovalRequest } from "./types.ts";

export function serializeApprovalDefinition(
  definition: ApprovalDefinition,
): string {
  return JSON.stringify(definition);
}

export function deserializeApprovalDefinition(
  json: string,
): ApprovalDefinition {
  const raw = JSON.parse(json) as ApprovalDefinition;
  const def = normalizeApprovalDefinition({ ...raw, strict: false });
  const validation = validateApprovalDefinition(def);
  if (!validation.valid) {
    throw new Error(validation.issues[0]?.message ?? "Definição inválida.");
  }
  return def;
}

export function serializeApprovalRequest(request: ApprovalRequest): string {
  return JSON.stringify(request);
}

export function deserializeApprovalRequest(json: string): ApprovalRequest {
  const raw = JSON.parse(json) as ApprovalRequest;
  if (!raw || typeof raw !== "object" || !raw.id || !raw.definitionId) {
    throw new Error("Solicitação inválida.");
  }
  return {
    ...raw,
    history: [...(raw.history ?? [])],
    pendingActions: [...(raw.pendingActions ?? [])],
    levelProgress: [...(raw.levelProgress ?? [])],
    currentLevelIds: [...(raw.currentLevelIds ?? [])],
    tags: [...(raw.tags ?? [])],
    metadata: { ...(raw.metadata ?? {}) },
  };
}
