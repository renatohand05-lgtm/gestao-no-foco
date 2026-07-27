/**
 * Sprint 21.5 — Categorias de notificação.
 */

import type { NotificationCategoryId } from "./types.ts";

export const NOTIFICATION_CATEGORIES = [
  "system",
  "security",
  "approval",
  "workflow",
  "finance",
  "purchases",
  "inventory",
  "sales",
  "crm",
  "service_orders",
  "users",
  "reports",
  "dashboard",
  "configuration",
  "audit",
] as const satisfies readonly NotificationCategoryId[];

export function isKnownCategory(
  value: string,
): value is NotificationCategoryId {
  return (NOTIFICATION_CATEGORIES as readonly string[]).includes(value);
}

export const MANDATORY_CATEGORIES: readonly NotificationCategoryId[] = [
  "security",
  "system",
];
