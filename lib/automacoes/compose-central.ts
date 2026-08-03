/**
 * Sprint 30.7 — Snapshot da Central (puro).
 */

import { triggerLabel } from "./triggers.ts";
import type {
  AutomationApproval,
  AutomationAuditEvent,
  AutomationCentralSnapshot,
  AutomationExecution,
  AutomationModule,
  AutomationRule,
  InternalAutomationNotification,
} from "./types.ts";

export function composeAutomationCentral(args: {
  tenantId: string;
  schemaReady: boolean;
  rules: AutomationRule[];
  executions: AutomationExecution[];
  approvals: AutomationApproval[];
  notifications: InternalAutomationNotification[];
  audit: AutomationAuditEvent[];
  /** Soma real de minutos economizados; null se sem base. */
  timeSavedMinutes: number | null;
}): AutomationCentralSnapshot {
  const activeRules = args.rules.filter((r) => r.status === "active").length;
  const pausedRules = args.rules.filter((r) => r.status === "paused").length;
  const recent = [...args.executions]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20);
  const failures = recent.filter((e) => e.status === "failed");
  const waiting = args.approvals.filter(
    (a) => a.status === "pending" || a.status === "delegated",
  );
  const generatedTasks = args.executions.reduce((n, e) => {
    return (
      n +
      e.actionsExecuted.filter(
        (a) => a.type === "criar_tarefa" && a.status === "executed",
      ).length
    );
  }, 0);

  const moduleMap = new Map<AutomationModule, number>();
  for (const r of args.rules) {
    if (r.status === "archived") continue;
    moduleMap.set(r.module, (moduleMap.get(r.module) ?? 0) + 1);
  }
  const modulesAutomated = [...moduleMap.entries()]
    .map(([module, count]) => ({ module, count }))
    .sort((a, b) => b.count - a.count);

  const nextTriggers = args.rules
    .filter((r) => r.status === "active" || r.status === "paused")
    .slice(0, 8)
    .map((r) => ({
      triggerType: r.triggerType,
      label: triggerLabel(r.triggerType),
    }));

  let health: AutomationCentralSnapshot["health"] = "saudavel";
  let healthReason = "Sem falhas recentes.";
  if (failures.length >= 3) {
    health = "critico";
    healthReason = `${failures.length} falhas recentes.`;
  } else if (failures.length > 0 || waiting.length > 5) {
    health = "atencao";
    healthReason =
      failures.length > 0
        ? `${failures.length} falha(s) recente(s).`
        : `${waiting.length} aprovações pendentes.`;
  }

  return {
    tenantId: args.tenantId,
    schemaReady: args.schemaReady,
    activeRules,
    pausedRules,
    recentExecutions: recent,
    failures,
    waitingApproval: waiting,
    generatedTasks,
    timeSavedMinutes: args.timeSavedMinutes,
    modulesAutomated,
    nextTriggers,
    health,
    healthReason,
    rules: args.rules,
    notifications: args.notifications.slice(0, 30),
    audit: args.audit.slice(0, 40),
  };
}
