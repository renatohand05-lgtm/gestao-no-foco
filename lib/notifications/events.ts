/**
 * Sprint 21.5 — Catálogo central de eventos de notificação.
 */

import type {
  NotificationCategoryId,
  NotificationChannelId,
  NotificationEventDefinition,
  NotificationPriorityId,
} from "./types.ts";

export const NOTIFICATION_EVENT_CODES = [
  "APPROVAL_REQUESTED",
  "APPROVAL_APPROVED",
  "APPROVAL_REJECTED",
  "APPROVAL_RETURNED",
  "APPROVAL_EXPIRED",
  "WORKFLOW_STARTED",
  "WORKFLOW_TRANSITIONED",
  "WORKFLOW_BLOCKED",
  "WORKFLOW_COMPLETED",
  "WORKFLOW_FAILED",
  "SECURITY_ACCESS_DENIED",
  "SECURITY_ROLE_CHANGED",
  "SECURITY_PERMISSION_CHANGED",
  "PAYMENT_DUE",
  "PAYMENT_OVERDUE",
  "PAYMENT_APPROVED",
  "PAYMENT_REJECTED",
  "STOCK_LOW",
  "STOCK_ADJUSTMENT_PENDING",
  "PURCHASE_APPROVAL_REQUIRED",
  "OS_STATUS_CHANGED",
  "OS_OVERDUE",
  "REPORT_READY",
  "SYSTEM_WARNING",
  "SYSTEM_CRITICAL",
  "USER_INVITED",
  "USER_DISABLED",
] as const;

export type NotificationEventCode = (typeof NOTIFICATION_EVENT_CODES)[number];

function ev(
  code: NotificationEventCode,
  label: string,
  description: string,
  defaultCategory: NotificationCategoryId,
  defaultPriority: NotificationPriorityId,
  defaultChannels: readonly NotificationChannelId[],
  mandatory = false,
): NotificationEventDefinition {
  return {
    code,
    label,
    description,
    defaultCategory,
    defaultPriority,
    defaultChannels,
    mandatory,
  };
}

export const NOTIFICATION_EVENT_CATALOG: readonly NotificationEventDefinition[] =
  [
    ev("APPROVAL_REQUESTED", "Aprovação solicitada", "Nova solicitação de aprovação", "approval", "high", ["in_app", "inbox", "email"]),
    ev("APPROVAL_APPROVED", "Aprovação concedida", "Solicitação aprovada", "approval", "normal", ["in_app", "inbox"]),
    ev("APPROVAL_REJECTED", "Aprovação rejeitada", "Solicitação rejeitada", "approval", "high", ["in_app", "inbox", "email"]),
    ev("APPROVAL_RETURNED", "Aprovação devolvida", "Solicitação devolvida para ajuste", "approval", "normal", ["in_app", "inbox"]),
    ev("APPROVAL_EXPIRED", "Aprovação expirada", "Solicitação expirou", "approval", "urgent", ["in_app", "inbox", "email"]),
    ev("WORKFLOW_STARTED", "Workflow iniciado", "Instância de workflow criada", "workflow", "normal", ["in_app", "inbox"]),
    ev("WORKFLOW_TRANSITIONED", "Workflow avançou", "Transição de workflow executada", "workflow", "normal", ["in_app", "inbox"]),
    ev("WORKFLOW_BLOCKED", "Workflow bloqueado", "Workflow pausado ou bloqueado", "workflow", "high", ["in_app", "inbox", "email"]),
    ev("WORKFLOW_COMPLETED", "Workflow concluído", "Workflow finalizado", "workflow", "normal", ["in_app", "inbox"]),
    ev("WORKFLOW_FAILED", "Workflow falhou", "Workflow em estado de falha", "workflow", "urgent", ["in_app", "inbox", "email"]),
    ev("SECURITY_ACCESS_DENIED", "Acesso negado", "RBAC negou ação", "security", "high", ["in_app", "inbox"], true),
    ev("SECURITY_ROLE_CHANGED", "Papel alterado", "Role atribuída/removida", "security", "urgent", ["in_app", "inbox", "email"], true),
    ev("SECURITY_PERMISSION_CHANGED", "Permissão alterada", "Permissão concedida/revogada", "security", "urgent", ["in_app", "inbox", "email"], true),
    ev("PAYMENT_DUE", "Pagamento a vencer", "Conta próxima do vencimento", "finance", "high", ["in_app", "inbox", "email"]),
    ev("PAYMENT_OVERDUE", "Pagamento vencido", "Conta em atraso", "finance", "urgent", ["in_app", "inbox", "email", "push"]),
    ev("PAYMENT_APPROVED", "Pagamento aprovado", "Pagamento liberado", "finance", "normal", ["in_app", "inbox"]),
    ev("PAYMENT_REJECTED", "Pagamento rejeitado", "Pagamento negado", "finance", "high", ["in_app", "inbox", "email"]),
    ev("STOCK_LOW", "Estoque baixo", "SKU abaixo do mínimo", "inventory", "high", ["in_app", "inbox"]),
    ev("STOCK_ADJUSTMENT_PENDING", "Ajuste pendente", "Ajuste de estoque aguarda aprovação", "inventory", "normal", ["in_app", "inbox"]),
    ev("PURCHASE_APPROVAL_REQUIRED", "Compra pendente", "Pedido de compra requer aprovação", "purchases", "high", ["in_app", "inbox", "email"]),
    ev("OS_STATUS_CHANGED", "OS atualizada", "Status de OS alterado", "service_orders", "normal", ["in_app", "inbox"]),
    ev("OS_OVERDUE", "OS atrasada", "OS ultrapassou prazo", "service_orders", "urgent", ["in_app", "inbox", "email"]),
    ev("REPORT_READY", "Relatório pronto", "Relatório disponível", "reports", "normal", ["in_app", "inbox"]),
    ev("SYSTEM_WARNING", "Alerta do sistema", "Aviso operacional", "system", "high", ["in_app", "inbox"], true),
    ev("SYSTEM_CRITICAL", "Crítico do sistema", "Incidente crítico", "system", "critical", ["in_app", "inbox", "email", "push"], true),
    ev("USER_INVITED", "Usuário convidado", "Convite enviado", "users", "normal", ["email", "inbox"]),
    ev("USER_DISABLED", "Usuário desativado", "Conta desativada", "users", "high", ["in_app", "inbox", "email"], true),
  ];

export const NOTIFICATION_EVENT_BY_CODE: ReadonlyMap<
  string,
  NotificationEventDefinition
> = new Map(NOTIFICATION_EVENT_CATALOG.map((e) => [e.code, e]));

export function isKnownNotificationEvent(
  code: string,
): code is NotificationEventCode {
  return NOTIFICATION_EVENT_BY_CODE.has(code);
}

export function getNotificationEvent(
  code: string,
): NotificationEventDefinition | undefined {
  return NOTIFICATION_EVENT_BY_CODE.get(code);
}
