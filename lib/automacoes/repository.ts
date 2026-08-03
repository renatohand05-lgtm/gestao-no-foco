/**
 * Sprint 30.7.1 — Persistência Supabase (automation_*).
 * Tipos via cast (`as never`) até regenerate types.
 */

import { randomUUID } from "node:crypto";

import type {
  AutomationApproval,
  AutomationAuditEvent,
  AutomationExecution,
  AutomationRule,
  InternalAutomationNotification,
} from "./types.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AutomationsClient = { from: (table: string) => any };

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function ruleFromRow(row: Record<string, unknown>): AutomationRule {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    companyId: row.company_id ? String(row.company_id) : null,
    branchId: row.branch_id ? String(row.branch_id) : null,
    name: String(row.name ?? ""),
    description: String(row.description ?? ""),
    module: row.module as AutomationRule["module"],
    triggerType: row.trigger_type as AutomationRule["triggerType"],
    triggerConfig: asRecord(row.trigger_config),
    conditions: Array.isArray(row.conditions) ? (row.conditions as AutomationRule["conditions"]) : [],
    actions: Array.isArray(row.actions) ? (row.actions as AutomationRule["actions"]) : [],
    status: row.status as AutomationRule["status"],
    priority: row.priority as AutomationRule["priority"],
    requiresApproval: Boolean(row.requires_approval),
    approvalRole: row.approval_role ? String(row.approval_role) : null,
    cooldownSeconds: Number(row.cooldown_seconds ?? 3600),
    maxExecutions:
      row.max_executions == null ? null : Number(row.max_executions),
    createdBy: row.created_by ? String(row.created_by) : null,
    updatedBy: row.updated_by ? String(row.updated_by) : null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
    archivedAt: row.archived_at ? String(row.archived_at) : null,
    templateId: row.template_id ? String(row.template_id) : null,
    segmentHints: Array.isArray(row.segment_hints)
      ? (row.segment_hints as string[])
      : [],
  };
}

function ruleToRow(rule: AutomationRule) {
  return {
    id: rule.id,
    tenant_id: rule.tenantId,
    company_id: rule.companyId,
    branch_id: rule.branchId,
    name: rule.name,
    description: rule.description,
    module: rule.module,
    trigger_type: rule.triggerType,
    trigger_config: rule.triggerConfig,
    conditions: rule.conditions,
    actions: rule.actions,
    status: rule.status,
    priority: rule.priority,
    requires_approval: rule.requiresApproval,
    approval_role: rule.approvalRole,
    cooldown_seconds: rule.cooldownSeconds,
    max_executions: rule.maxExecutions,
    created_by: rule.createdBy,
    updated_by: rule.updatedBy,
    created_at: rule.createdAt,
    updated_at: rule.updatedAt,
    archived_at: rule.archivedAt,
    template_id: rule.templateId,
    segment_hints: rule.segmentHints,
  };
}

function executionFromRow(row: Record<string, unknown>): AutomationExecution {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    ruleId: String(row.rule_id),
    triggerType: row.trigger_type as AutomationExecution["triggerType"],
    triggerPayload: asRecord(row.trigger_payload),
    matchedConditions: Array.isArray(row.matched_conditions)
      ? (row.matched_conditions as AutomationExecution["matchedConditions"])
      : [],
    actionsRequested: Array.isArray(row.actions_requested)
      ? (row.actions_requested as AutomationExecution["actionsRequested"])
      : [],
    actionsExecuted: Array.isArray(row.actions_executed)
      ? (row.actions_executed as AutomationExecution["actionsExecuted"])
      : [],
    status: row.status as AutomationExecution["status"],
    errorCode: row.error_code ? String(row.error_code) : null,
    errorMessage: row.error_message ? String(row.error_message) : null,
    retryCount: Number(row.retry_count ?? 0),
    idempotencyKey: String(row.idempotency_key),
    correlationId: String(row.correlation_id),
    dryRun: Boolean(row.dry_run),
    startedAt: row.started_at ? String(row.started_at) : null,
    finishedAt: row.finished_at ? String(row.finished_at) : null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function executionToRow(ex: AutomationExecution) {
  return {
    id: ex.id,
    tenant_id: ex.tenantId,
    rule_id: ex.ruleId,
    trigger_type: ex.triggerType,
    trigger_payload: ex.triggerPayload,
    matched_conditions: ex.matchedConditions,
    actions_requested: ex.actionsRequested,
    actions_executed: ex.actionsExecuted,
    status: ex.status,
    error_code: ex.errorCode,
    error_message: ex.errorMessage,
    retry_count: ex.retryCount,
    idempotency_key: ex.idempotencyKey,
    correlation_id: ex.correlationId,
    dry_run: ex.dryRun,
    started_at: ex.startedAt,
    finished_at: ex.finishedAt,
    created_at: ex.createdAt,
  };
}

function approvalFromRow(row: Record<string, unknown>): AutomationApproval {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    ruleId: row.rule_id ? String(row.rule_id) : null,
    executionId: row.execution_id ? String(row.execution_id) : null,
    status: row.status as AutomationApproval["status"],
    requestedBy: String(row.requested_by),
    decidedBy: row.decided_by ? String(row.decided_by) : null,
    justification: row.justification ? String(row.justification) : null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    decidedAt: row.decided_at ? String(row.decided_at) : null,
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    history: Array.isArray(row.history)
      ? (row.history as AutomationApproval["history"])
      : [],
  };
}

function approvalToRow(a: AutomationApproval) {
  return {
    id: a.id,
    tenant_id: a.tenantId,
    rule_id: a.ruleId,
    execution_id: a.executionId,
    status: a.status,
    requested_by: a.requestedBy,
    decided_by: a.decidedBy,
    justification: a.justification,
    created_at: a.createdAt,
    decided_at: a.decidedAt,
    expires_at: a.expiresAt,
    history: a.history,
  };
}

function auditFromRow(row: Record<string, unknown>): AutomationAuditEvent {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    ruleId: row.rule_id ? String(row.rule_id) : null,
    executionId: row.execution_id ? String(row.execution_id) : null,
    event: row.event as AutomationAuditEvent["event"],
    userId: row.user_id ? String(row.user_id) : null,
    origin: String(row.origin ?? "system"),
    result: String(row.result ?? ""),
    correlationId: row.correlation_id ? String(row.correlation_id) : null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function notificationFromRow(
  row: Record<string, unknown>,
): InternalAutomationNotification {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    userId: row.user_id ? String(row.user_id) : null,
    title: String(row.title ?? ""),
    body: String(row.body ?? ""),
    priority: row.priority as InternalAutomationNotification["priority"],
    category: row.category as InternalAutomationNotification["category"],
    href: row.href ? String(row.href) : null,
    readAt: row.read_at ? String(row.read_at) : null,
    archivedAt: row.archived_at ? String(row.archived_at) : null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export function newAutomationUuid(): string {
  return randomUUID();
}

export async function dbListRules(
  client: AutomationsClient,
  tenantId: string,
): Promise<AutomationRule[]> {
  const { data, error } = await client
    .from("automation_rules" as never)
    .select("*")
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message ?? "Falha ao listar regras");
  return (data ?? []).map((r: Record<string, unknown>) => ruleFromRow(r));
}

export async function dbGetRule(
  client: AutomationsClient,
  tenantId: string,
  ruleId: string,
): Promise<AutomationRule | null> {
  const { data, error } = await client
    .from("automation_rules" as never)
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", ruleId)
    .maybeSingle();
  if (error) throw new Error(error.message ?? "Falha ao obter regra");
  return data ? ruleFromRow(data as Record<string, unknown>) : null;
}

export async function dbUpsertRule(
  client: AutomationsClient,
  rule: AutomationRule,
): Promise<AutomationRule> {
  if (rule.tenantId !== rule.tenantId) {
    throw new Error("Cross-tenant bloqueado.");
  }
  const { data, error } = await client
    .from("automation_rules" as never)
    .upsert(ruleToRow(rule) as never, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw new Error(error.message ?? "Falha ao salvar regra");
  const saved = ruleFromRow(data as Record<string, unknown>);
  if (saved.tenantId !== rule.tenantId) {
    throw new Error("Cross-tenant bloqueado no upsert.");
  }
  return saved;
}

export async function dbListExecutions(
  client: AutomationsClient,
  tenantId: string,
  limit = 50,
): Promise<AutomationExecution[]> {
  const { data, error } = await client
    .from("automation_executions" as never)
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message ?? "Falha ao listar execuções");
  return (data ?? []).map((r: Record<string, unknown>) => executionFromRow(r));
}

export async function dbAddExecution(
  client: AutomationsClient,
  ex: AutomationExecution,
): Promise<AutomationExecution> {
  const { data, error } = await client
    .from("automation_executions" as never)
    .upsert(executionToRow(ex) as never, { onConflict: "id" })
    .select("*")
    .single();
  if (error) {
    // unique idempotency — treat as skip/ok by reloading
    if (String(error.message ?? "").toLowerCase().includes("duplicate") ||
        error.code === "23505") {
      const { data: existing } = await client
        .from("automation_executions" as never)
        .select("*")
        .eq("tenant_id", ex.tenantId)
        .eq("idempotency_key", ex.idempotencyKey)
        .maybeSingle();
      if (existing) return executionFromRow(existing as Record<string, unknown>);
    }
    throw new Error(error.message ?? "Falha ao salvar execução");
  }
  return executionFromRow(data as Record<string, unknown>);
}

export async function dbListApprovals(
  client: AutomationsClient,
  tenantId: string,
): Promise<AutomationApproval[]> {
  const { data, error } = await client
    .from("automation_approvals" as never)
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message ?? "Falha ao listar aprovações");
  return (data ?? []).map((r: Record<string, unknown>) => approvalFromRow(r));
}

export async function dbUpsertApproval(
  client: AutomationsClient,
  a: AutomationApproval,
): Promise<AutomationApproval> {
  const { data, error } = await client
    .from("automation_approvals" as never)
    .upsert(approvalToRow(a) as never, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw new Error(error.message ?? "Falha ao salvar aprovação");
  return approvalFromRow(data as Record<string, unknown>);
}

export async function dbAddAudit(
  client: AutomationsClient,
  e: AutomationAuditEvent,
): Promise<void> {
  const { error } = await client.from("automation_audit" as never).insert({
    id: e.id,
    tenant_id: e.tenantId,
    rule_id: e.ruleId,
    execution_id: e.executionId,
    event: e.event,
    user_id: e.userId,
    origin: e.origin,
    result: e.result,
    correlation_id: e.correlationId,
    created_at: e.createdAt,
  } as never);
  if (error) throw new Error(error.message ?? "Falha ao gravar auditoria");
}

export async function dbListAudit(
  client: AutomationsClient,
  tenantId: string,
  limit = 100,
): Promise<AutomationAuditEvent[]> {
  const { data, error } = await client
    .from("automation_audit" as never)
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message ?? "Falha ao listar auditoria");
  return (data ?? []).map((r: Record<string, unknown>) => auditFromRow(r));
}

export async function dbAddNotification(
  client: AutomationsClient,
  n: InternalAutomationNotification,
): Promise<void> {
  const { error } = await client
    .from("automation_internal_notifications" as never)
    .insert({
      id: n.id,
      tenant_id: n.tenantId,
      user_id: n.userId,
      title: n.title,
      body: n.body,
      priority: n.priority,
      category: n.category,
      href: n.href,
      read_at: n.readAt,
      archived_at: n.archivedAt,
      created_at: n.createdAt,
    } as never);
  if (error) throw new Error(error.message ?? "Falha ao notificar");
}

export async function dbListNotifications(
  client: AutomationsClient,
  tenantId: string,
): Promise<InternalAutomationNotification[]> {
  const { data, error } = await client
    .from("automation_internal_notifications" as never)
    .select("*")
    .eq("tenant_id", tenantId)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message ?? "Falha ao listar notificações");
  return (data ?? []).map((r: Record<string, unknown>) =>
    notificationFromRow(r),
  );
}

export async function dbMarkNotificationRead(
  client: AutomationsClient,
  tenantId: string,
  id: string,
): Promise<boolean> {
  const { error } = await client
    .from("automation_internal_notifications" as never)
    .update({ read_at: new Date().toISOString() } as never)
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) throw new Error(error.message ?? "Falha ao marcar lida");
  return true;
}

export async function dbDeleteQaRules(
  client: AutomationsClient,
  tenantId: string,
  namePrefix: string,
): Promise<number> {
  const { data, error } = await client
    .from("automation_rules" as never)
    .select("id,name")
    .eq("tenant_id", tenantId)
    .ilike("name", `${namePrefix}%`);
  if (error) throw new Error(error.message ?? "Falha ao buscar QA");
  const ids = (data ?? [])
    .map((r: { id: string; name: string }) => r.id)
    .filter(Boolean);
  if (!ids.length) return 0;
  const { error: delErr } = await client
    .from("automation_rules" as never)
    .delete()
    .eq("tenant_id", tenantId)
    .in("id", ids);
  if (delErr) throw new Error(delErr.message ?? "Falha ao limpar QA");
  return ids.length;
}
