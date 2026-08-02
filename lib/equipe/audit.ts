import "server-only";

/**
 * Sprint 30.2 — Auditoria de eventos de Equipe via audit_events (append-only).
 * Reaproveita createAuditSupabaseAdapter — sem tabela paralela de auditoria.
 */

import { createAuditSupabaseAdapter } from "@/lib/enterprise";
import { createClient } from "@/lib/supabase/server";

import type { TeamAuditEvent } from "./types";

export const EQUIPE_AUDIT_MODULE = "equipe";

export type TeamAuditEventCode =
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_DELETED"
  | "ROLE_GRANTED"
  | "ROLE_REMOVED"
  | "CONFIG_CHANGED";

export async function recordTeamAuditEvent(input: {
  tenantId: string;
  userId: string | null;
  event: TeamAuditEventCode;
  description: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const client = await createClient();
  const audit = createAuditSupabaseAdapter(client);
  await audit.append({
    tenantId: input.tenantId,
    userId: input.userId,
    actorType: input.userId ? "user" : "system",
    systemActorKey: input.userId ? null : "equipe",
    event: input.event,
    category: "Users",
    severity: input.event === "USER_DELETED" || input.event === "ROLE_REMOVED" ? "Warning" : "Info",
    targetType: input.targetType ?? "tenant_member",
    targetId: input.targetId ?? null,
    resource: null,
    module: EQUIPE_AUDIT_MODULE,
    description: input.description,
    metadata: (input.metadata ?? {}) as never,
    origin: "server_action",
    correlationId: null,
    requestId: null,
    sessionId: null,
    ipAddress: null,
    device: null,
  });
}

/** Honesto: retorna vazio quando não há eventos — nunca inventa histórico. */
export async function listTeamAuditEvents(
  tenantId: string,
  limit = 50,
): Promise<TeamAuditEvent[]> {
  const client = await createClient();
  const audit = createAuditSupabaseAdapter(client);
  const events = await audit.list(tenantId, { limit: Math.max(limit * 3, 100) });
  return events
    .filter((event) => event.module === EQUIPE_AUDIT_MODULE)
    .slice(0, limit)
    .map((event) => ({
      id: event.id,
      event: event.event,
      description: event.description,
      actorUserId: event.userId,
      targetType: event.targetType,
      targetId: event.targetId,
      createdAt: event.createdAt,
      metadata: event.metadata,
    }));
}
