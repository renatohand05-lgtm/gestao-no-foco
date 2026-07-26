/**
 * Sprint 21.2 — Alvos (targets) de auditoria.
 */

import type { AuditTargetType } from "./types.ts";

export const AUDIT_TARGET_TYPES = [
  "user",
  "role",
  "permission",
  "finance",
  "payment",
  "purchase",
  "stock",
  "os",
  "crm",
  "report",
  "config",
  "dashboard",
  "tenant",
  "session",
  "other",
  "none",
] as const satisfies readonly AuditTargetType[];

export function isKnownTargetType(value: string): value is AuditTargetType {
  return (AUDIT_TARGET_TYPES as readonly string[]).includes(value);
}

export function normalizeTargetType(
  value: string | null | undefined,
): AuditTargetType {
  if (value && isKnownTargetType(value)) return value;
  return "none";
}

/** Inferência leve a partir do código do evento. */
export function inferTargetTypeFromEvent(event: string): AuditTargetType {
  if (event.startsWith("AUTH_")) return "session";
  if (event.startsWith("USER_")) return "user";
  if (event.startsWith("ROLE_")) return "role";
  if (event.startsWith("PERMISSION_")) return "permission";
  if (event.startsWith("FINANCE_") || event.startsWith("PAYMENT_")) {
    return event.startsWith("PAYMENT_") ? "payment" : "finance";
  }
  if (event.startsWith("PURCHASE_")) return "purchase";
  if (event.startsWith("STOCK_")) return "stock";
  if (event.startsWith("OS_")) return "os";
  if (event.startsWith("CRM_")) return "crm";
  if (event.startsWith("REPORT_")) return "report";
  if (event.startsWith("CONFIG_")) return "config";
  if (event.startsWith("DASHBOARD_") || event.startsWith("EXECUTIVE_")) {
    return "dashboard";
  }
  return "other";
}
