/**
 * Sprint 21.5 — Prioridades de notificação.
 */

import type { NotificationPriorityId } from "./types.ts";

export const NOTIFICATION_PRIORITIES = [
  "low",
  "normal",
  "high",
  "urgent",
  "critical",
] as const satisfies readonly NotificationPriorityId[];

export const PRIORITY_RANK: Record<NotificationPriorityId, number> = {
  low: 0,
  normal: 1,
  high: 2,
  urgent: 3,
  critical: 4,
};

export function isKnownPriority(
  value: string,
): value is NotificationPriorityId {
  return (NOTIFICATION_PRIORITIES as readonly string[]).includes(value);
}

export function comparePriority(a: string, b: string): number {
  const ra = PRIORITY_RANK[a as NotificationPriorityId] ?? -1;
  const rb = PRIORITY_RANK[b as NotificationPriorityId] ?? -1;
  return ra - rb;
}

export function meetsMinPriority(
  priority: NotificationPriorityId,
  min: NotificationPriorityId,
): boolean {
  return PRIORITY_RANK[priority] >= PRIORITY_RANK[min];
}
