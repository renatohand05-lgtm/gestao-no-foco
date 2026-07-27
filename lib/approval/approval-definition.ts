/**
 * Sprint 21.4 — Criação e normalização de definições.
 */

import { createApprovalLevel, sortLevelsByOrder } from "./approval-level.ts";
import { InvalidApprovalDefinitionError } from "./approval-errors.ts";
import { validateApprovalDefinition } from "./approval-validation.ts";
import type {
  ApprovalDefinition,
  ApprovalDefinitionStatus,
  ApprovalLevel,
  ApprovalPolicy,
  ApprovalSlaConfig,
  ApprovalRule,
} from "./types.ts";

export type CreateApprovalDefinitionInput = {
  id: string;
  version?: string;
  name: string;
  description?: string;
  tenantScope?: "global" | "tenant";
  tenantId?: string | null;
  status?: ApprovalDefinitionStatus;
  levels: readonly ApprovalLevel[];
  policy?: ApprovalPolicy | null;
  rules?: readonly ApprovalRule[];
  sla?: ApprovalSlaConfig | null;
  metadata?: Record<string, unknown>;
  strict?: boolean;
};

export function normalizeApprovalDefinition(
  input: CreateApprovalDefinitionInput,
): ApprovalDefinition {
  const levels = sortLevelsByOrder(
    input.levels.map((l) => createApprovalLevel(l)),
  );

  const definition: ApprovalDefinition = {
    id: input.id.trim(),
    version: (input.version ?? "1.0.0").trim(),
    name: input.name.trim(),
    description: (input.description ?? "").trim(),
    tenantScope: input.tenantScope ?? "global",
    tenantId: input.tenantId?.trim() || null,
    status: input.status ?? "active",
    levels,
    policy: input.policy ?? null,
    rules: input.rules ?? [],
    sla: input.sla ?? null,
    metadata: input.metadata ?? {},
  };

  const validation = validateApprovalDefinition(definition);
  if (!validation.valid && input.strict !== false) {
    throw new InvalidApprovalDefinitionError(
      validation.issues[0]?.message ?? "Definição inválida.",
    );
  }

  return definition;
}

export function createApprovalDefinition(
  input: CreateApprovalDefinitionInput,
): ApprovalDefinition {
  return normalizeApprovalDefinition({
    ...input,
    strict: input.strict ?? true,
  });
}

export function definitionKey(id: string, version: string): string {
  return `${id.trim()}@${version.trim()}`;
}

/** SLA estrutural — sem timers. */
export function createSlaConfig(input: {
  maxMinutes?: number | null;
  alertAfterMinutes?: number | null;
  escalateAfterMinutes?: number | null;
  expireAfterMinutes?: number | null;
  allowReopen?: boolean;
  metadata?: Record<string, unknown>;
}): ApprovalSlaConfig {
  return {
    maxMinutes: input.maxMinutes ?? null,
    alertAfterMinutes: input.alertAfterMinutes ?? null,
    escalateAfterMinutes: input.escalateAfterMinutes ?? null,
    expireAfterMinutes: input.expireAfterMinutes ?? null,
    allowReopen: input.allowReopen === true,
    metadata: input.metadata ?? {},
  };
}
