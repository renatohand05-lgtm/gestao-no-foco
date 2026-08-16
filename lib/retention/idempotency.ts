/**
 * Sprint 35.2 — Idempotência de comunicação.
 * retry do mesmo evento não gera segunda linha lógica.
 */

export function communicationIdempotencyKey(input: {
  tenantId: string;
  clienteId: string;
  entityType: "retorno" | "agendamento" | "os";
  entityId: string;
  templateCode: string;
  offsetKey: string;
  channel: string;
}): string {
  return [
    input.tenantId,
    input.clienteId,
    input.entityType,
    input.entityId,
    input.templateCode,
    input.offsetKey,
    input.channel,
  ].join(":");
}

export function isSendWindow(input: {
  hourLocal: number;
  startHour?: number;
  endHour?: number;
}): boolean {
  const start = input.startHour ?? 8;
  const end = input.endHour ?? 19;
  return input.hourLocal >= start && input.hourLocal < end;
}
