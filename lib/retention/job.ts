import { offsetsForSegment } from "./returns.ts";
import { addDaysCivil } from "./returns.ts";
import { communicationIdempotencyKey, isSendWindow } from "./idempotency.ts";
import type { MessageTemplateCode } from "./templates.ts";
import type { CustomerReturnRow } from "./types.ts";

export type PlannedNotification = {
  clienteId: string;
  entityId: string;
  templateCode: MessageTemplateCode;
  offsetKey: string;
  channel: "whatsapp" | "email";
  idempotencyKey: string;
  dueAt: string;
};

export function localHourInTimezone(
  date: Date,
  timeZone: string,
): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number.parseInt(
    parts.find((p) => p.type === "hour")?.value ?? "0",
    10,
  );
  return Number.isFinite(hour) ? hour : 0;
}

export function planRetentionNotifications(input: {
  tenantId: string;
  todayCivil: string;
  hourLocal: number;
  segment: string | null;
  returns: CustomerReturnRow[];
  existingKeys: Iterable<string>;
  windowStartHour?: number;
  windowEndHour?: number;
}): PlannedNotification[] {
  if (
    !isSendWindow({
      hourLocal: input.hourLocal,
      startHour: input.windowStartHour,
      endHour: input.windowEndHour,
    })
  ) {
    return [];
  }
  const existing = new Set(input.existingKeys);
  const offsets = offsetsForSegment(input.segment);
  const out: PlannedNotification[] = [];
  const skip = new Set([
    "cancelado",
    "ignorado",
    "concluido",
    "agendado",
  ]);

  for (const row of input.returns) {
    if (skip.has(row.status)) continue;
    for (const offset of offsets) {
      const fireOn = addDaysCivil(row.due_at, offset.days);
      if (fireOn !== input.todayCivil) continue;
      for (const channel of ["whatsapp", "email"] as const) {
        const key = communicationIdempotencyKey({
          tenantId: input.tenantId,
          clienteId: row.cliente_id,
          entityType: "retorno",
          entityId: row.id,
          templateCode: offset.template,
          offsetKey: offset.key,
          channel,
        });
        if (existing.has(key)) continue;
        existing.add(key);
        out.push({
          clienteId: row.cliente_id,
          entityId: row.id,
          templateCode: offset.template as MessageTemplateCode,
          offsetKey: offset.key,
          channel,
          idempotencyKey: key,
          dueAt: row.due_at,
        });
      }
    }
  }
  return out;
}
