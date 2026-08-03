/**
 * Sprint 30.7 — Store em memória (homolog / schema ausente).
 * Tenant-scoped · sem efeitos externos.
 */

import type {
  AutomationApproval,
  AutomationAuditEvent,
  AutomationExecution,
  AutomationRule,
  InternalAutomationNotification,
} from "./types.ts";

type TenantBucket = {
  rules: AutomationRule[];
  executions: AutomationExecution[];
  approvals: AutomationApproval[];
  audit: AutomationAuditEvent[];
  notifications: InternalAutomationNotification[];
  locks: Set<string>;
};

const globalStore = new Map<string, TenantBucket>();

function bucket(tenantId: string): TenantBucket {
  let b = globalStore.get(tenantId);
  if (!b) {
    b = {
      rules: [],
      executions: [],
      approvals: [],
      audit: [],
      notifications: [],
      locks: new Set(),
    };
    globalStore.set(tenantId, b);
  }
  return b;
}

export function memoryResetTenant(tenantId: string) {
  globalStore.delete(tenantId);
}

export function memoryListRules(tenantId: string): AutomationRule[] {
  return [...bucket(tenantId).rules];
}

export function memoryUpsertRule(rule: AutomationRule): AutomationRule {
  const b = bucket(rule.tenantId);
  const idx = b.rules.findIndex((r) => r.id === rule.id);
  if (idx >= 0) b.rules[idx] = rule;
  else b.rules.push(rule);
  return rule;
}

export function memoryGetRule(
  tenantId: string,
  ruleId: string,
): AutomationRule | undefined {
  return bucket(tenantId).rules.find((r) => r.id === ruleId);
}

export function memoryListExecutions(
  tenantId: string,
  limit = 50,
): AutomationExecution[] {
  return [...bucket(tenantId).executions]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function memoryAddExecution(ex: AutomationExecution): AutomationExecution {
  bucket(ex.tenantId).executions.unshift(ex);
  return ex;
}

export function memoryListApprovals(tenantId: string): AutomationApproval[] {
  return [...bucket(tenantId).approvals];
}

export function memoryUpsertApproval(a: AutomationApproval): AutomationApproval {
  const b = bucket(a.tenantId);
  const idx = b.approvals.findIndex((x) => x.id === a.id);
  if (idx >= 0) b.approvals[idx] = a;
  else b.approvals.push(a);
  return a;
}

export function memoryAddAudit(e: AutomationAuditEvent) {
  bucket(e.tenantId).audit.unshift(e);
}

export function memoryListAudit(tenantId: string, limit = 100) {
  return bucket(tenantId).audit.slice(0, limit);
}

export function memoryAddNotification(n: InternalAutomationNotification) {
  bucket(n.tenantId).notifications.unshift(n);
}

export function memoryListNotifications(tenantId: string) {
  return bucket(tenantId).notifications.filter((n) => !n.archivedAt);
}

export function memoryMarkNotificationRead(
  tenantId: string,
  id: string,
): boolean {
  const n = bucket(tenantId).notifications.find((x) => x.id === id);
  if (!n) return false;
  n.readAt = new Date().toISOString();
  return true;
}

export function memoryTryLock(tenantId: string, key: string): boolean {
  const b = bucket(tenantId);
  if (b.locks.has(key)) return false;
  b.locks.add(key);
  return true;
}

export function memoryUnlock(tenantId: string, key: string) {
  bucket(tenantId).locks.delete(key);
}

/** Seed de demonstração — regras pausadas/draft, sem auto-ativação. */
export function seedDemoRules(tenantId: string, userId: string | null) {
  const b = bucket(tenantId);
  if (b.rules.length) return;
  const now = new Date().toISOString();
  const demos: AutomationRule[] = [
    {
      id: "demo-fin-conta-vencida",
      tenantId,
      companyId: null,
      branchId: null,
      name: "Conta vencida → cobrança",
      description: "Template demonstrativo (pausado).",
      module: "financeiro",
      triggerType: "fin.conta_vencida",
      triggerConfig: {},
      conditions: [
        { id: "c1", field: "diasAtraso", op: "gte", value: 1 },
      ],
      actions: [
        {
          id: "a1",
          type: "criar_tarefa",
          label: "Tarefa de cobrança",
          requiresApproval: true,
        },
      ],
      status: "paused",
      priority: "alta",
      requiresApproval: true,
      approvalRole: "diretor",
      cooldownSeconds: 3600,
      maxExecutions: 100,
      createdBy: userId,
      updatedBy: userId,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
      templateId: "tpl-fin-conta-vencida",
      segmentHints: ["*"],
    },
    {
      id: "demo-crm-lead",
      tenantId,
      companyId: null,
      branchId: null,
      name: "Lead sem retorno → follow-up",
      description: "Template demonstrativo (rascunho).",
      module: "crm",
      triggerType: "crm.lead_sem_retorno",
      triggerConfig: {},
      conditions: [
        { id: "c1", field: "diasSemContato", op: "gte", value: 3 },
      ],
      actions: [
        {
          id: "a1",
          type: "rascunho_followup",
          label: "Rascunho de follow-up",
        },
      ],
      status: "draft",
      priority: "media",
      requiresApproval: false,
      approvalRole: null,
      cooldownSeconds: 86400,
      maxExecutions: null,
      createdBy: userId,
      updatedBy: userId,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
      templateId: "tpl-crm-lead-sem-retorno",
      segmentHints: ["*"],
    },
  ];
  for (const r of demos) b.rules.push(r);
}
