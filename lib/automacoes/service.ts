/**
 * Sprint 30.7.1 — Serviço com persistência Supabase quando schemaReady.
 * Fallback memória apenas se schema indisponível (homolog local sem migration).
 */

import { composeAutomationCentral } from "./compose-central.ts";
import { runAutomationEngine } from "./engine.ts";
import { canDecideApproval } from "./approvals.ts";
import { buildCorrelationId } from "./idempotency.ts";
import {
  memoryAddAudit,
  memoryAddExecution,
  memoryAddNotification,
  memoryGetRule,
  memoryListApprovals,
  memoryListAudit,
  memoryListExecutions,
  memoryListNotifications,
  memoryListRules,
  memoryMarkNotificationRead,
  memoryTryLock,
  memoryUnlock,
  memoryUpsertApproval,
  memoryUpsertRule,
} from "./memory-store.ts";
import {
  dbAddAudit,
  dbAddExecution,
  dbAddNotification,
  dbGetRule,
  dbListApprovals,
  dbListAudit,
  dbListExecutions,
  dbListNotifications,
  dbListRules,
  dbMarkNotificationRead,
  dbUpsertApproval,
  dbUpsertRule,
  newAutomationUuid,
  type AutomationsClient,
} from "./repository.ts";
import { getTemplate } from "./templates.ts";
import type {
  AutomationApproval,
  AutomationAuditEvent,
  AutomationCentralSnapshot,
  AutomationExecution,
  AutomationRule,
  AutomationRuleStatus,
  DryRunResult,
  InternalAutomationNotification,
} from "./types.ts";
import type { ConditionContext } from "./conditions.ts";

type StoreMode = {
  schemaReady: boolean;
  client: AutomationsClient | null;
};

async function listRules(mode: StoreMode, tenantId: string) {
  if (mode.schemaReady && mode.client) return dbListRules(mode.client, tenantId);
  return memoryListRules(tenantId);
}

async function getRule(mode: StoreMode, tenantId: string, ruleId: string) {
  if (mode.schemaReady && mode.client) {
    return dbGetRule(mode.client, tenantId, ruleId);
  }
  return memoryGetRule(tenantId, ruleId) ?? null;
}

async function upsertRule(mode: StoreMode, rule: AutomationRule) {
  if (mode.schemaReady && mode.client) return dbUpsertRule(mode.client, rule);
  return memoryUpsertRule(rule);
}

async function listExecutions(mode: StoreMode, tenantId: string, limit = 50) {
  if (mode.schemaReady && mode.client) {
    return dbListExecutions(mode.client, tenantId, limit);
  }
  return memoryListExecutions(tenantId, limit);
}

async function addExecution(mode: StoreMode, ex: AutomationExecution) {
  if (mode.schemaReady && mode.client) return dbAddExecution(mode.client, ex);
  return memoryAddExecution(ex);
}

async function listApprovals(mode: StoreMode, tenantId: string) {
  if (mode.schemaReady && mode.client) {
    return dbListApprovals(mode.client, tenantId);
  }
  return memoryListApprovals(tenantId);
}

async function upsertApproval(mode: StoreMode, a: AutomationApproval) {
  if (mode.schemaReady && mode.client) return dbUpsertApproval(mode.client, a);
  return memoryUpsertApproval(a);
}

async function addAudit(
  mode: StoreMode,
  tenantId: string,
  event: AutomationAuditEvent["event"],
  opts: {
    ruleId?: string | null;
    executionId?: string | null;
    userId?: string | null;
    result: string;
    correlationId?: string | null;
  },
) {
  const row: AutomationAuditEvent = {
    id: newAutomationUuid(),
    tenantId,
    ruleId: opts.ruleId ?? null,
    executionId: opts.executionId ?? null,
    event,
    userId: opts.userId ?? null,
    origin: "automacoes.service",
    result: opts.result,
    correlationId: opts.correlationId ?? null,
    createdAt: new Date().toISOString(),
  };
  if (mode.schemaReady && mode.client) await dbAddAudit(mode.client, row);
  else memoryAddAudit(row);
}

async function listAudit(mode: StoreMode, tenantId: string) {
  if (mode.schemaReady && mode.client) return dbListAudit(mode.client, tenantId);
  return memoryListAudit(tenantId);
}

async function addNotification(
  mode: StoreMode,
  n: InternalAutomationNotification,
) {
  if (mode.schemaReady && mode.client) await dbAddNotification(mode.client, n);
  else memoryAddNotification(n);
}

async function listNotifications(mode: StoreMode, tenantId: string) {
  if (mode.schemaReady && mode.client) {
    return dbListNotifications(mode.client, tenantId);
  }
  return memoryListNotifications(tenantId);
}

export async function loadAutomationCentral(args: {
  tenantId: string;
  userId: string | null;
  schemaReady: boolean;
  client: AutomationsClient | null;
}): Promise<AutomationCentralSnapshot> {
  const mode: StoreMode = {
    schemaReady: args.schemaReady,
    client: args.client,
  };
  if (!args.schemaReady) {
    // Sprint 34.5 — sem seed demo: empresa permanece vazia até o usuário criar regras.
  }

  const rules = await listRules(mode, args.tenantId);
  const executions = await listExecutions(mode, args.tenantId, 50);
  let timeSavedMinutes: number | null = null;
  const timed = executions.filter(
    (e) => e.finishedAt && e.startedAt && e.status === "completed" && !e.dryRun,
  );
  if (timed.length) {
    const ms = timed.reduce((s, e) => {
      const d = Date.parse(e.finishedAt!) - Date.parse(e.startedAt!);
      return s + (Number.isFinite(d) && d > 0 ? d : 0);
    }, 0);
    timeSavedMinutes = Math.round(timed.length * 5 + ms / 60000);
  }

  return composeAutomationCentral({
    tenantId: args.tenantId,
    schemaReady: args.schemaReady,
    rules,
    executions,
    approvals: await listApprovals(mode, args.tenantId),
    notifications: await listNotifications(mode, args.tenantId),
    audit: await listAudit(mode, args.tenantId),
    timeSavedMinutes,
  });
}

export async function createRuleFromTemplate(args: {
  tenantId: string;
  templateId: string;
  userId: string | null;
  name?: string;
  schemaReady: boolean;
  client: AutomationsClient | null;
}): Promise<AutomationRule> {
  const tpl = getTemplate(args.templateId);
  if (!tpl) throw new Error("Template não encontrado.");
  const mode: StoreMode = {
    schemaReady: args.schemaReady,
    client: args.client,
  };
  const now = new Date().toISOString();
  const rule: AutomationRule = {
    id: newAutomationUuid(),
    tenantId: args.tenantId,
    companyId: null,
    branchId: null,
    name: args.name ?? tpl.name,
    description: tpl.description,
    module: tpl.module,
    triggerType: tpl.triggerType,
    triggerConfig: {},
    conditions: tpl.conditions.map((c) => ({ ...c })),
    actions: tpl.actions.map((a) => ({ ...a })),
    status: "draft",
    priority: "media",
    requiresApproval: tpl.requiresApproval,
    approvalRole: tpl.requiresApproval ? "diretor" : null,
    cooldownSeconds: 3600,
    maxExecutions: 200,
    createdBy: args.userId,
    updatedBy: args.userId,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    templateId: tpl.id,
    segmentHints: [...tpl.segments],
  };
  const saved = await upsertRule(mode, rule);
  await addAudit(mode, args.tenantId, "rule_created", {
    ruleId: saved.id,
    userId: args.userId,
    result: `Criada a partir de ${tpl.id}`,
  });
  return saved;
}

export async function updateRuleStatus(args: {
  tenantId: string;
  ruleId: string;
  status: AutomationRuleStatus;
  userId: string | null;
  schemaReady: boolean;
  client: AutomationsClient | null;
}): Promise<AutomationRule> {
  const mode: StoreMode = {
    schemaReady: args.schemaReady,
    client: args.client,
  };
  const rule = await getRule(mode, args.tenantId, args.ruleId);
  if (!rule || rule.tenantId !== args.tenantId) {
    throw new Error("Regra não encontrada neste tenant.");
  }
  const next: AutomationRule = {
    ...rule,
    status: args.status,
    updatedBy: args.userId,
    updatedAt: new Date().toISOString(),
    archivedAt:
      args.status === "archived" ? new Date().toISOString() : rule.archivedAt,
  };
  const saved = await upsertRule(mode, next);
  const event =
    args.status === "active"
      ? "rule_activated"
      : args.status === "paused"
        ? "rule_paused"
        : args.status === "archived"
          ? "rule_archived"
          : "rule_edited";
  await addAudit(mode, args.tenantId, event, {
    ruleId: rule.id,
    userId: args.userId,
    result: `status=${args.status}`,
  });
  return saved;
}

export async function dryRunRule(args: {
  tenantId: string;
  ruleId: string;
  ctx: ConditionContext;
  userId: string | null;
  schemaReady: boolean;
  client: AutomationsClient | null;
}): Promise<{ executionId: string; dryRun: DryRunResult }> {
  const mode: StoreMode = {
    schemaReady: args.schemaReady,
    client: args.client,
  };
  const rule = await getRule(mode, args.tenantId, args.ruleId);
  if (!rule || rule.tenantId !== args.tenantId) {
    throw new Error("Regra não encontrada neste tenant.");
  }
  if (args.ctx.tenantId !== args.tenantId) {
    throw new Error("Cross-tenant bloqueado.");
  }
  const recent = await listExecutions(mode, args.tenantId, 100);
  const result = runAutomationEngine({
    rule,
    ctx: args.ctx,
    dryRun: true,
    recentExecutions: recent,
  });
  const execution: AutomationExecution = {
    ...result.execution,
    id: newAutomationUuid(),
  };
  await addExecution(mode, execution);
  await addAudit(mode, args.tenantId, "simulation", {
    ruleId: rule.id,
    executionId: execution.id,
    userId: args.userId,
    result: result.dryRunResult?.matched ? "matched" : "not_matched",
    correlationId: execution.correlationId,
  });
  return {
    executionId: execution.id,
    dryRun: result.dryRunResult!,
  };
}

export async function requestExecutionApproval(args: {
  tenantId: string;
  ruleId: string;
  userId: string;
  ctx: ConditionContext;
  schemaReady: boolean;
  client: AutomationsClient | null;
  tenantSlug?: string;
}): Promise<AutomationApproval> {
  const mode: StoreMode = {
    schemaReady: args.schemaReady,
    client: args.client,
  };
  const rule = await getRule(mode, args.tenantId, args.ruleId);
  if (!rule) throw new Error("Regra não encontrada.");
  const now = new Date().toISOString();
  const approval: AutomationApproval = {
    id: newAutomationUuid(),
    tenantId: args.tenantId,
    ruleId: rule.id,
    executionId: null,
    status: "pending",
    requestedBy: args.userId,
    decidedBy: null,
    justification: null,
    createdAt: now,
    decidedAt: null,
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    history: [],
  };
  await upsertApproval(mode, approval);
  const recent = await listExecutions(mode, args.tenantId, 100);
  const engine = runAutomationEngine({
    rule,
    ctx: args.ctx,
    dryRun: false,
    recentExecutions: recent,
    approval,
    actorUserId: args.userId,
  });
  const execution: AutomationExecution = {
    ...engine.execution,
    id: newAutomationUuid(),
  };
  await addExecution(mode, execution);
  for (const n of engine.notificationHints) {
    await addNotification(mode, {
      id: newAutomationUuid(),
      tenantId: args.tenantId,
      userId: null,
      title: n.title,
      body: n.body,
      priority: "alta",
      category: n.category === "aprovacao" ? "aprovacao" : "execucao",
      href: args.tenantSlug
        ? `/${args.tenantSlug}/automacoes`
        : null,
      readAt: null,
      archivedAt: null,
      createdAt: now,
    });
  }
  await addAudit(mode, args.tenantId, "approval", {
    ruleId: rule.id,
    executionId: execution.id,
    userId: args.userId,
    result: "requested",
    correlationId: execution.correlationId,
  });
  return approval;
}

export async function decideAutomationApproval(args: {
  tenantId: string;
  approvalId: string;
  actorUserId: string;
  decision: "approved" | "rejected" | "returned" | "cancelled";
  justification?: string | null;
  allowSelfApproval?: boolean;
  ctx: ConditionContext;
  schemaReady: boolean;
  client: AutomationsClient | null;
}) {
  const mode: StoreMode = {
    schemaReady: args.schemaReady,
    client: args.client,
  };
  const approval = (await listApprovals(mode, args.tenantId)).find(
    (a) => a.id === args.approvalId,
  );
  if (!approval || approval.tenantId !== args.tenantId) {
    throw new Error("Aprovação não encontrada neste tenant.");
  }
  const decided = canDecideApproval({
    approval,
    actorUserId: args.actorUserId,
    decision: args.decision,
    justification: args.justification,
    allowSelfApproval: args.allowSelfApproval,
  });
  if (!decided.ok) throw new Error(decided.message);
  await upsertApproval(mode, decided.approval);
  await addAudit(
    mode,
    args.tenantId,
    args.decision === "approved" ? "approval" : "rejection",
    {
      ruleId: approval.ruleId,
      userId: args.actorUserId,
      result: args.decision,
    },
  );

  if (args.decision === "approved" && approval.ruleId) {
    const rule = await getRule(mode, args.tenantId, approval.ruleId);
    if (rule) {
      const lockKey = `exec:${rule.id}`;
      if (!mode.schemaReady) {
        if (!memoryTryLock(args.tenantId, lockKey)) {
          throw new Error("Lock de execução ativo.");
        }
      }
      try {
        const recent = await listExecutions(mode, args.tenantId, 100);
        const engine = runAutomationEngine({
          rule,
          ctx: args.ctx,
          dryRun: false,
          recentExecutions: recent,
          approval: decided.approval,
          actorUserId: args.actorUserId,
        });
        const execution: AutomationExecution = {
          ...engine.execution,
          id: newAutomationUuid(),
        };
        await addExecution(mode, execution);
        if (engine.pauseRule) {
          await upsertRule(mode, {
            ...rule,
            status: "paused",
            updatedAt: new Date().toISOString(),
          });
          await addNotification(mode, {
            id: newAutomationUuid(),
            tenantId: args.tenantId,
            userId: null,
            title: "Regra pausada",
            body: `Regra “${rule.name}” pausada por segurança.`,
            priority: "alta",
            category: "pausa",
            href: null,
            readAt: null,
            archivedAt: null,
            createdAt: new Date().toISOString(),
          });
        }
      } finally {
        if (!mode.schemaReady) memoryUnlock(args.tenantId, lockKey);
      }
    }
  }
  return decided.approval;
}

export async function markNotificationRead(
  tenantId: string,
  id: string,
  schemaReady: boolean,
  client: AutomationsClient | null,
) {
  if (schemaReady && client) {
    return dbMarkNotificationRead(client, tenantId, id);
  }
  return memoryMarkNotificationRead(tenantId, id);
}

export async function duplicateRule(args: {
  tenantId: string;
  ruleId: string;
  userId: string | null;
  schemaReady: boolean;
  client: AutomationsClient | null;
  namePrefix?: string;
}): Promise<AutomationRule> {
  const mode: StoreMode = {
    schemaReady: args.schemaReady,
    client: args.client,
  };
  const rule = await getRule(mode, args.tenantId, args.ruleId);
  if (!rule) throw new Error("Regra não encontrada.");
  const now = new Date().toISOString();
  const copy: AutomationRule = {
    ...rule,
    id: newAutomationUuid(),
    name: args.namePrefix
      ? `${args.namePrefix}${rule.name}`
      : `${rule.name} (cópia)`,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    createdBy: args.userId,
    updatedBy: args.userId,
    archivedAt: null,
  };
  const saved = await upsertRule(mode, copy);
  await addAudit(mode, args.tenantId, "rule_created", {
    ruleId: saved.id,
    userId: args.userId,
    result: `duplicated_from=${rule.id}`,
  });
  return saved;
}

export { buildCorrelationId };
