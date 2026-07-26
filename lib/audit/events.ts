/**
 * Sprint 21.2 — Catálogo central de eventos de auditoria.
 */

import type { AuditCategoryId } from "./categories.ts";
import type { AuditSeverityId } from "./severity.ts";

export const AUDIT_EVENT_CODES = [
  "AUTH_LOGIN",
  "AUTH_LOGOUT",
  "USER_CREATED",
  "USER_UPDATED",
  "USER_DELETED",
  "ROLE_GRANTED",
  "ROLE_REMOVED",
  "PERMISSION_GRANTED",
  "PERMISSION_DENIED",
  "FINANCE_CREATED",
  "FINANCE_UPDATED",
  "FINANCE_DELETED",
  "PAYMENT_APPROVED",
  "PAYMENT_CANCELLED",
  "PURCHASE_CREATED",
  "PURCHASE_APPROVED",
  "STOCK_MOVEMENT",
  "STOCK_ADJUSTMENT",
  "OS_CREATED",
  "OS_UPDATED",
  "OS_FINISHED",
  "CRM_CREATED",
  "CRM_UPDATED",
  "REPORT_EXPORTED",
  "CONFIG_CHANGED",
  "DASHBOARD_OPENED",
  "EXECUTIVE_ACTION_EXECUTED",
] as const;

export type AuditEventCode = (typeof AUDIT_EVENT_CODES)[number];

export type AuditEventDefinition = {
  code: AuditEventCode;
  label: string;
  description: string;
  defaultCategory: AuditCategoryId;
  defaultSeverity: AuditSeverityId;
};

export const AUDIT_EVENT_CATALOG: readonly AuditEventDefinition[] = [
  { code: "AUTH_LOGIN", label: "Login", description: "Usuário autenticou", defaultCategory: "Authentication", defaultSeverity: "Info" },
  { code: "AUTH_LOGOUT", label: "Logout", description: "Usuário encerrou sessão", defaultCategory: "Authentication", defaultSeverity: "Info" },
  { code: "USER_CREATED", label: "Usuário criado", description: "Novo usuário criado", defaultCategory: "Users", defaultSeverity: "Success" },
  { code: "USER_UPDATED", label: "Usuário atualizado", description: "Dados de usuário alterados", defaultCategory: "Users", defaultSeverity: "Info" },
  { code: "USER_DELETED", label: "Usuário removido", description: "Usuário excluído ou desativado", defaultCategory: "Users", defaultSeverity: "Warning" },
  { code: "ROLE_GRANTED", label: "Papel concedido", description: "Papel atribuído a usuário", defaultCategory: "Security", defaultSeverity: "Warning" },
  { code: "ROLE_REMOVED", label: "Papel removido", description: "Papel removido de usuário", defaultCategory: "Security", defaultSeverity: "Warning" },
  { code: "PERMISSION_GRANTED", label: "Permissão concedida", description: "Permissão adicional concedida", defaultCategory: "Security", defaultSeverity: "Warning" },
  { code: "PERMISSION_DENIED", label: "Permissão negada", description: "Tentativa de ação negada pelo RBAC", defaultCategory: "Security", defaultSeverity: "Warning" },
  { code: "FINANCE_CREATED", label: "Lançamento financeiro criado", description: "Registro financeiro criado", defaultCategory: "Finance", defaultSeverity: "Success" },
  { code: "FINANCE_UPDATED", label: "Lançamento financeiro atualizado", description: "Registro financeiro alterado", defaultCategory: "Finance", defaultSeverity: "Info" },
  { code: "FINANCE_DELETED", label: "Lançamento financeiro excluído", description: "Registro financeiro removido", defaultCategory: "Finance", defaultSeverity: "Warning" },
  { code: "PAYMENT_APPROVED", label: "Pagamento aprovado", description: "Pagamento aprovado", defaultCategory: "Finance", defaultSeverity: "Success" },
  { code: "PAYMENT_CANCELLED", label: "Pagamento cancelado", description: "Pagamento cancelado", defaultCategory: "Finance", defaultSeverity: "Warning" },
  { code: "PURCHASE_CREATED", label: "Compra criada", description: "Pedido de compra criado", defaultCategory: "Inventory", defaultSeverity: "Success" },
  { code: "PURCHASE_APPROVED", label: "Compra aprovada", description: "Pedido de compra aprovado", defaultCategory: "Inventory", defaultSeverity: "Success" },
  { code: "STOCK_MOVEMENT", label: "Movimentação de estoque", description: "Movimentação de estoque registrada", defaultCategory: "Inventory", defaultSeverity: "Info" },
  { code: "STOCK_ADJUSTMENT", label: "Ajuste de estoque", description: "Ajuste de estoque realizado", defaultCategory: "Inventory", defaultSeverity: "Warning" },
  { code: "OS_CREATED", label: "OS criada", description: "Ordem de serviço criada", defaultCategory: "Orders", defaultSeverity: "Success" },
  { code: "OS_UPDATED", label: "OS atualizada", description: "Ordem de serviço atualizada", defaultCategory: "Orders", defaultSeverity: "Info" },
  { code: "OS_FINISHED", label: "OS finalizada", description: "Ordem de serviço finalizada", defaultCategory: "Orders", defaultSeverity: "Success" },
  { code: "CRM_CREATED", label: "CRM criado", description: "Registro de CRM criado", defaultCategory: "CRM", defaultSeverity: "Success" },
  { code: "CRM_UPDATED", label: "CRM atualizado", description: "Registro de CRM atualizado", defaultCategory: "CRM", defaultSeverity: "Info" },
  { code: "REPORT_EXPORTED", label: "Relatório exportado", description: "Relatório exportado", defaultCategory: "Reports", defaultSeverity: "Info" },
  { code: "CONFIG_CHANGED", label: "Configuração alterada", description: "Configuração do tenant alterada", defaultCategory: "Configuration", defaultSeverity: "Warning" },
  { code: "DASHBOARD_OPENED", label: "Dashboard aberto", description: "Dashboard visualizado", defaultCategory: "Dashboard", defaultSeverity: "Trace" },
  { code: "EXECUTIVE_ACTION_EXECUTED", label: "Ação executiva", description: "Ação do cockpit executivo executada", defaultCategory: "Dashboard", defaultSeverity: "Info" },
] as const;

export const AUDIT_EVENT_BY_CODE: ReadonlyMap<string, AuditEventDefinition> =
  new Map(AUDIT_EVENT_CATALOG.map((e) => [e.code, e]));

export function isKnownAuditEvent(code: string): code is AuditEventCode {
  return AUDIT_EVENT_BY_CODE.has(code);
}

export function getAuditEventDefinition(
  code: string,
): AuditEventDefinition | undefined {
  return AUDIT_EVENT_BY_CODE.get(code);
}

export function listAuditEvents(): readonly AuditEventDefinition[] {
  return AUDIT_EVENT_CATALOG;
}
