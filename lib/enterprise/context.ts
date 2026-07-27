/**
 * Sprint 21.6 RC1 — EnterpriseContext (obrigatório · tipado · actors sem profiles fictícios).
 */

import {
  assertActorRef,
  createSystemActor,
  createUserActor,
  type EnterpriseActorRef,
} from "./actors.ts";
import { EnterpriseContextError } from "./errors.ts";
import type {
  EnterpriseActorType,
  EnterpriseContext,
  EnterpriseSource,
  JsonValue,
} from "./types.ts";

export type CreateEnterpriseContextInput = {
  tenantId?: string | null;
  userId?: string | null;
  actorType?: EnterpriseActorType | null;
  systemActorKey?: string | null;
  sessionId?: string | null;
  requestId?: string | null;
  correlationId?: string | null;
  source?: EnterpriseSource | null;
  roles?: ReadonlyArray<string | null | undefined> | null;
  permissions?: ReadonlyArray<string | null | undefined> | null;
  metadata?: Record<string, JsonValue> | null;
  allowSystemActor?: boolean;
};

function trimOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t || null;
}

function asList(
  value: ReadonlyArray<string | null | undefined> | null | undefined,
): string[] {
  if (!value || !Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const t = item.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function resolveActor(input: CreateEnterpriseContextInput): EnterpriseActorRef {
  const actorType = (input.actorType ?? "user") as EnterpriseActorType;

  if (actorType === "user") {
    if (input.systemActorKey?.trim()) {
      throw new EnterpriseContextError(
        "Actor user não pode ter systemActorKey.",
      );
    }
    return createUserActor(input.userId ?? "");
  }

  if (input.allowSystemActor !== true) {
    throw new EnterpriseContextError(
      "Actor não-humano requer allowSystemActor explícito.",
    );
  }

  return createSystemActor(
    input.systemActorKey ?? "system",
    actorType === "service" || actorType === "integration"
      ? actorType
      : "system",
  );
}

export function normalizeEnterpriseContext(
  input: CreateEnterpriseContextInput | null | undefined,
): EnterpriseContext {
  if (!input || typeof input !== "object") {
    throw new EnterpriseContextError("Contexto Enterprise ausente.");
  }

  const tenantId = trimOrNull(input.tenantId);
  if (!tenantId) {
    throw new EnterpriseContextError("tenantId obrigatório no EnterpriseContext.");
  }

  const actor = resolveActor(input);
  assertActorRef(actor);

  const requestId = trimOrNull(input.requestId) ?? newId("req");
  const correlationId = trimOrNull(input.correlationId) ?? requestId;

  return {
    tenantId,
    userId: actor.userId,
    actorType: actor.actorType,
    systemActorKey: actor.systemActorKey,
    sessionId: trimOrNull(input.sessionId),
    requestId,
    correlationId,
    source: (input.source as EnterpriseSource) || "unknown",
    roles: asList(input.roles),
    permissions: asList(input.permissions),
    metadata:
      input.metadata && typeof input.metadata === "object"
        ? { ...input.metadata }
        : {},
  };
}

export function createEnterpriseContext(
  input: CreateEnterpriseContextInput,
): EnterpriseContext {
  return normalizeEnterpriseContext(input);
}

export function validateEnterpriseContext(
  context: EnterpriseContext | null | undefined,
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!context || typeof context !== "object") {
    return { valid: false, issues: ["Contexto ausente."] };
  }
  if (!context.tenantId?.trim()) issues.push("tenantId ausente.");
  if (!context.requestId?.trim()) issues.push("requestId ausente.");
  if (!context.correlationId?.trim()) issues.push("correlationId ausente.");
  try {
    assertActorRef({
      actorType: context.actorType,
      userId: context.userId,
      systemActorKey: context.systemActorKey,
    });
  } catch (e) {
    issues.push(e instanceof Error ? e.message : "Actor inválido.");
  }
  return { valid: issues.length === 0, issues };
}

export function assertEnterpriseContext(
  context: EnterpriseContext | null | undefined,
): asserts context is EnterpriseContext {
  const result = validateEnterpriseContext(context);
  if (!result.valid) {
    throw new EnterpriseContextError(result.issues.join(" "));
  }
}

export function assertSameTenant(
  context: EnterpriseContext,
  tenantId: string,
): void {
  if (context.tenantId !== tenantId) {
    throw new EnterpriseContextError(
      "Tenant divergente entre contexto e operação.",
    );
  }
}

export function actorRefFromContext(context: EnterpriseContext): EnterpriseActorRef {
  return {
    actorType: context.actorType,
    userId: context.userId,
    systemActorKey: context.systemActorKey,
  };
}
