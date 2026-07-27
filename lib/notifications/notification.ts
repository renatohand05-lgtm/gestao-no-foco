/**
 * Sprint 21.5 — Status helpers.
 */

import type { NotificationStatusId } from "./types.ts";

export const NOTIFICATION_STATUSES = [
  "created",
  "queued",
  "scheduled",
  "processing",
  "sent",
  "delivered",
  "read",
  "failed",
  "cancelled",
  "expired",
  "suppressed",
  "deduplicated",
] as const satisfies readonly NotificationStatusId[];

export function isKnownStatus(value: string): value is NotificationStatusId {
  return (NOTIFICATION_STATUSES as readonly string[]).includes(value);
}
