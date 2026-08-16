/**
 * Sprint 35.2.2 — régua de lembretes de agenda.
 * Offsets configuráveis. Default vazio = não dispara.
 */

import { communicationIdempotencyKey } from "./idempotency.ts";
import type { PlannedNotification } from "./job.ts";

export const SUGGESTED_REMINDER_OFFSETS = ["D-1", "H-2"] as const;

export type ReminderEvent = {
  id: string;
  clienteId: string;
  startsAt: string;
};

export function parseReminderOffset(raw: string): {
  key: string;
  msBefore: number;
} | null {
  const key = raw.trim().toUpperCase();
  const day = key.match(/^D-(\d+)$/);
  if (day) {
    return { key, msBefore: Number(day[1]) * 86_400_000 };
  }
  const hour = key.match(/^H-(\d+)$/);
  if (hour) {
    return { key, msBefore: Number(hour[1]) * 3_600_000 };
  }
  return null;
}

export function planAppointmentReminders(input: {
  tenantId: string;
  now: Date;
  events: ReminderEvent[];
  reminderOffsets: string[];
  existingKeys: Iterable<string>;
}): PlannedNotification[] {
  if (!input.reminderOffsets.length) return [];
  const existing = new Set(input.existingKeys);
  const now = input.now.getTime();
  const out: PlannedNotification[] = [];
  const parsed = input.reminderOffsets
    .map(parseReminderOffset)
    .filter((x): x is NonNullable<typeof x> => x != null);

  for (const event of input.events) {
    const start = Date.parse(event.startsAt);
    if (!Number.isFinite(start)) continue;
    for (const offset of parsed) {
      const fireAt = start - offset.msBefore;
      if (now < fireAt || now >= fireAt + 3_600_000) continue;
      const key = communicationIdempotencyKey({
        tenantId: input.tenantId,
        clienteId: event.clienteId,
        entityType: "agendamento",
        entityId: event.id,
        templateCode: "LEMBRETE",
        offsetKey: offset.key,
        channel: "whatsapp",
      });
      if (existing.has(key)) continue;
      existing.add(key);
      out.push({
        clienteId: event.clienteId,
        entityId: event.id,
        templateCode: "LEMBRETE",
        offsetKey: offset.key,
        channel: "whatsapp",
        idempotencyKey: key,
        dueAt: event.startsAt,
      });
    }
  }
  return out;
}
