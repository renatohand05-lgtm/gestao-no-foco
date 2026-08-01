/**
 * Sprint 27.6.1 — Repositórios persistentes (server-side).
 * Sem fallback silencioso para memória.
 */

import { randomUUID } from "node:crypto";
import {
  persistenceUnavailableError,
  probeIntelligenceSchema,
  type SchemaProbeResult,
} from "./schema.ts";

export type PersistenceClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

export type PersistResult<T> =
  | { ok: true; data: T; persisted: true }
  | {
      ok: false;
      persisted: false;
      code: "INTELLIGENCE_SCHEMA_UNAVAILABLE" | "TENANT_MISMATCH" | "WRITE_FAILED";
      message: string;
      missing?: string[];
    };

async function ensureSchema(client: PersistenceClient): Promise<SchemaProbeResult> {
  return probeIntelligenceSchema(client);
}

function assertTenant(rowTenant: string, expected: string): boolean {
  return rowTenant === expected;
}

export async function createIntelligenceSession(
  client: PersistenceClient,
  input: {
    tenantId: string;
    userId: string;
    mode: string;
    provider?: string | null;
    model?: string | null;
    title?: string | null;
    companyId?: string | null;
    branchId?: string | null;
    context?: Record<string, unknown>;
  },
): Promise<PersistResult<{ id: string }>> {
  const probe = await ensureSchema(client);
  if (!probe.ready) {
    return { ok: false, persisted: false, ...persistenceUnavailableError(probe) };
  }
  const id = randomUUID();
  const { error } = await client.from("intelligence_sessions").insert({
    id,
    tenant_id: input.tenantId,
    user_id: input.userId,
    mode: input.mode,
    provider: input.provider ?? null,
    model: input.model ?? null,
    title: input.title ?? null,
    company_id: input.companyId ?? null,
    branch_id: input.branchId ?? null,
    status: "active",
    context: input.context ?? {},
  });
  if (error) {
    return {
      ok: false,
      persisted: false,
      code: "WRITE_FAILED",
      message: error.message ?? "Falha ao criar sessão",
    };
  }
  return { ok: true, persisted: true, data: { id } };
}

export async function insertIntelligenceMessage(
  client: PersistenceClient,
  input: {
    id?: string;
    sessionId: string;
    tenantId: string;
    userId: string;
    role: "user" | "assistant" | "system";
    content: string;
    intent?: string | null;
    mode: string;
    provider?: string | null;
    model?: string | null;
    confidenceLevel?: string | null;
    confidenceScore?: number | null;
    correlationId?: string | null;
    latencyMs?: number | null;
    structuredOutput?: unknown;
    tokenUsage?: unknown;
    estimatedCost?: number | null;
  },
): Promise<PersistResult<{ id: string }>> {
  const probe = await ensureSchema(client);
  if (!probe.ready) {
    return { ok: false, persisted: false, ...persistenceUnavailableError(probe) };
  }
  const id = input.id ?? randomUUID();
  const { error } = await client.from("intelligence_messages").insert({
    id,
    session_id: input.sessionId,
    tenant_id: input.tenantId,
    user_id: input.userId,
    role: input.role,
    content: input.content,
    intent: input.intent ?? null,
    mode: input.mode,
    provider: input.provider ?? null,
    model: input.model ?? null,
    confidence_level: input.confidenceLevel ?? null,
    confidence_score: input.confidenceScore ?? null,
    correlation_id: input.correlationId ?? null,
    latency_ms: input.latencyMs ?? null,
    structured_output: input.structuredOutput ?? null,
    token_usage: input.tokenUsage ?? null,
    estimated_cost: input.estimatedCost ?? null,
  });
  if (error) {
    return {
      ok: false,
      persisted: false,
      code: "WRITE_FAILED",
      message: error.message ?? "Falha ao gravar mensagem",
    };
  }
  return { ok: true, persisted: true, data: { id } };
}

export async function insertIntelligenceEvidenceRows(
  client: PersistenceClient,
  tenantId: string,
  messageId: string,
  rows: Array<{
    id?: string;
    source: string;
    sourceType: string;
    module: string;
    entity?: string | null;
    entityId?: string | null;
    metric?: string | null;
    value?: unknown;
    unit?: string | null;
    reliability?: string | null;
    freshness?: string | null;
    calculatedAt?: string | null;
    deepLink?: string | null;
    companyId?: string | null;
    branchId?: string | null;
    metadata?: Record<string, unknown>;
  }>,
): Promise<PersistResult<{ count: number }>> {
  const probe = await ensureSchema(client);
  if (!probe.ready) {
    return { ok: false, persisted: false, ...persistenceUnavailableError(probe) };
  }
  if (rows.length === 0) {
    return { ok: true, persisted: true, data: { count: 0 } };
  }
  const payload = rows.map((r) => ({
    id: r.id ?? randomUUID(),
    message_id: messageId,
    tenant_id: tenantId,
    company_id: r.companyId ?? null,
    branch_id: r.branchId ?? null,
    source: r.source,
    source_type: r.sourceType,
    module: r.module,
    entity: r.entity ?? null,
    entity_id: r.entityId ?? null,
    metric: r.metric ?? null,
    value: r.value ?? null,
    unit: r.unit ?? null,
    reliability: r.reliability ?? null,
    freshness: r.freshness ?? null,
    calculated_at: r.calculatedAt ?? null,
    deep_link: r.deepLink ?? null,
    metadata: r.metadata ?? {},
  }));
  const { error } = await client.from("intelligence_evidence").insert(payload);
  if (error) {
    return {
      ok: false,
      persisted: false,
      code: "WRITE_FAILED",
      message: error.message ?? "Falha ao gravar evidências",
    };
  }
  return { ok: true, persisted: true, data: { count: payload.length } };
}

export async function insertIntelligenceAuditEvent(
  client: PersistenceClient,
  input: {
    tenantId: string;
    userId?: string | null;
    sessionId?: string | null;
    messageId?: string | null;
    correlationId?: string | null;
    eventType: string;
    module?: string | null;
    intent?: string | null;
    mode?: string | null;
    provider?: string | null;
    model?: string | null;
    status: string;
    latencyMs?: number | null;
    confidence?: unknown;
    limitations?: unknown;
    errorCode?: string | null;
    errorMessage?: string | null;
    estimatedCost?: number | null;
    metadata?: Record<string, unknown>;
    companyId?: string | null;
    branchId?: string | null;
  },
): Promise<PersistResult<{ id: string }>> {
  const probe = await ensureSchema(client);
  if (!probe.ready) {
    return { ok: false, persisted: false, ...persistenceUnavailableError(probe) };
  }
  const id = randomUUID();
  const { error } = await client.from("intelligence_audit_events").insert({
    id,
    tenant_id: input.tenantId,
    user_id: input.userId ?? null,
    session_id: input.sessionId ?? null,
    message_id: input.messageId ?? null,
    correlation_id: input.correlationId ?? null,
    event_type: input.eventType,
    module: input.module ?? null,
    intent: input.intent ?? null,
    mode: input.mode ?? null,
    provider: input.provider ?? null,
    model: input.model ?? null,
    status: input.status,
    latency_ms: input.latencyMs ?? null,
    confidence: input.confidence ?? null,
    limitations: input.limitations ?? null,
    error_code: input.errorCode ?? null,
    error_message: input.errorMessage ?? null,
    estimated_cost: input.estimatedCost ?? null,
    company_id: input.companyId ?? null,
    branch_id: input.branchId ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) {
    return {
      ok: false,
      persisted: false,
      code: "WRITE_FAILED",
      message: error.message ?? "Falha ao gravar auditoria",
    };
  }
  return { ok: true, persisted: true, data: { id } };
}

export async function listIntelligenceSessions(
  client: PersistenceClient,
  tenantId: string,
  userId: string,
  limit = 50,
): Promise<PersistResult<Array<Record<string, unknown>>>> {
  const probe = await ensureSchema(client);
  if (!probe.ready) {
    return { ok: false, persisted: false, ...persistenceUnavailableError(probe) };
  }
  const { data, error } = await client
    .from("intelligence_sessions")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    return {
      ok: false,
      persisted: false,
      code: "WRITE_FAILED",
      message: error.message ?? "Falha ao listar sessões",
    };
  }
  const rows = (data ?? []).filter((r: { tenant_id: string }) =>
    assertTenant(r.tenant_id, tenantId),
  );
  return { ok: true, persisted: true, data: rows };
}

export async function listIntelligenceAuditEvents(
  client: PersistenceClient,
  tenantId: string,
  limit = 50,
): Promise<PersistResult<Array<Record<string, unknown>>>> {
  const probe = await ensureSchema(client);
  if (!probe.ready) {
    return { ok: false, persisted: false, ...persistenceUnavailableError(probe) };
  }
  const { data, error } = await client
    .from("intelligence_audit_events")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    return {
      ok: false,
      persisted: false,
      code: "WRITE_FAILED",
      message: error.message ?? "Falha ao listar auditoria",
    };
  }
  const rows = (data ?? []).filter((r: { tenant_id: string }) =>
    assertTenant(r.tenant_id, tenantId),
  );
  return { ok: true, persisted: true, data: rows };
}

export async function insertIntelligenceFeedbackRow(
  client: PersistenceClient,
  input: {
    tenantId: string;
    userId: string;
    messageId: string;
    feedbackType: string;
    comment?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<PersistResult<{ id: string }>> {
  const probe = await ensureSchema(client);
  if (!probe.ready) {
    return { ok: false, persisted: false, ...persistenceUnavailableError(probe) };
  }
  const id = randomUUID();
  const { error } = await client.from("intelligence_feedback").insert({
    id,
    tenant_id: input.tenantId,
    user_id: input.userId,
    message_id: input.messageId,
    feedback_type: input.feedbackType,
    comment: input.comment ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) {
    return {
      ok: false,
      persisted: false,
      code: "WRITE_FAILED",
      message: error.message ?? "Falha ao gravar feedback",
    };
  }
  return { ok: true, persisted: true, data: { id } };
}

export async function insertActionPlanRow(
  client: PersistenceClient,
  input: {
    tenantId: string;
    createdBy: string;
    objective: string;
    steps: unknown;
    priority: string;
    status?: string;
    sessionId?: string | null;
    messageId?: string | null;
    confidence?: unknown;
    expectedImpact?: unknown;
  },
): Promise<PersistResult<{ id: string }>> {
  const probe = await ensureSchema(client);
  if (!probe.ready) {
    return { ok: false, persisted: false, ...persistenceUnavailableError(probe) };
  }
  const id = randomUUID();
  const { error } = await client.from("intelligence_action_plans").insert({
    id,
    tenant_id: input.tenantId,
    created_by: input.createdBy,
    objective: input.objective,
    steps: input.steps,
    priority: input.priority,
    status: input.status ?? "draft",
    session_id: input.sessionId ?? null,
    message_id: input.messageId ?? null,
    confidence: input.confidence ?? null,
    expected_impact: input.expectedImpact ?? null,
  });
  if (error) {
    return {
      ok: false,
      persisted: false,
      code: "WRITE_FAILED",
      message: error.message ?? "Falha ao gravar plano",
    };
  }
  return { ok: true, persisted: true, data: { id } };
}

export async function insertAutomationDraftRow(
  client: PersistenceClient,
  input: {
    tenantId: string;
    createdBy: string;
    automationType: string;
    title: string;
    description?: string | null;
    triggerDefinition: unknown;
    actionDefinition: unknown;
    status?: string;
  },
): Promise<PersistResult<{ id: string }>> {
  const probe = await ensureSchema(client);
  if (!probe.ready) {
    return { ok: false, persisted: false, ...persistenceUnavailableError(probe) };
  }
  const id = randomUUID();
  const { error } = await client.from("intelligence_automation_drafts").insert({
    id,
    tenant_id: input.tenantId,
    created_by: input.createdBy,
    automation_type: input.automationType,
    title: input.title,
    description: input.description ?? null,
    trigger_definition: input.triggerDefinition,
    action_definition: input.actionDefinition,
    status: input.status ?? "draft",
  });
  if (error) {
    return {
      ok: false,
      persisted: false,
      code: "WRITE_FAILED",
      message: error.message ?? "Falha ao gravar draft",
    };
  }
  return { ok: true, persisted: true, data: { id } };
}

export async function listIntelligenceMessages(
  client: PersistenceClient,
  tenantId: string,
  sessionId: string,
): Promise<PersistResult<Array<Record<string, unknown>>>> {
  const probe = await ensureSchema(client);
  if (!probe.ready) {
    return { ok: false, persisted: false, ...persistenceUnavailableError(probe) };
  }
  const { data, error } = await client
    .from("intelligence_messages")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("session_id", sessionId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) {
    return {
      ok: false,
      persisted: false,
      code: "WRITE_FAILED",
      message: error.message ?? "Falha ao listar mensagens",
    };
  }
  const rows = (data ?? []).filter((r: { tenant_id: string }) =>
    assertTenant(r.tenant_id, tenantId),
  );
  return { ok: true, persisted: true, data: rows };
}

export async function listEvidenceForMessage(
  client: PersistenceClient,
  tenantId: string,
  messageId: string,
): Promise<PersistResult<Array<Record<string, unknown>>>> {
  const probe = await ensureSchema(client);
  if (!probe.ready) {
    return { ok: false, persisted: false, ...persistenceUnavailableError(probe) };
  }
  const { data, error } = await client
    .from("intelligence_evidence")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("message_id", messageId)
    .order("created_at", { ascending: true });
  if (error) {
    return {
      ok: false,
      persisted: false,
      code: "WRITE_FAILED",
      message: error.message ?? "Falha ao listar evidências",
    };
  }
  const rows = (data ?? []).filter((r: { tenant_id: string }) =>
    assertTenant(r.tenant_id, tenantId),
  );
  return { ok: true, persisted: true, data: rows };
}

export async function archiveIntelligenceSession(
  client: PersistenceClient,
  tenantId: string,
  sessionId: string,
): Promise<PersistResult<{ id: string }>> {
  const probe = await ensureSchema(client);
  if (!probe.ready) {
    return { ok: false, persisted: false, ...persistenceUnavailableError(probe) };
  }
  const { error } = await client
    .from("intelligence_sessions")
    .update({
      status: "archived",
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);
  if (error) {
    return {
      ok: false,
      persisted: false,
      code: "WRITE_FAILED",
      message: error.message ?? "Falha ao arquivar sessão",
    };
  }
  return { ok: true, persisted: true, data: { id: sessionId } };
}

export async function softDeleteIntelligenceSession(
  client: PersistenceClient,
  tenantId: string,
  sessionId: string,
): Promise<PersistResult<{ id: string }>> {
  const probe = await ensureSchema(client);
  if (!probe.ready) {
    return { ok: false, persisted: false, ...persistenceUnavailableError(probe) };
  }
  const { error } = await client
    .from("intelligence_sessions")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("tenant_id", tenantId);
  if (error) {
    return {
      ok: false,
      persisted: false,
      code: "WRITE_FAILED",
      message: error.message ?? "Falha ao soft-delete sessão",
    };
  }
  return { ok: true, persisted: true, data: { id: sessionId } };
}
