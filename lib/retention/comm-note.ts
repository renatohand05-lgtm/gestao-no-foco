import { operatorStatusLabel } from "./pipeline.ts";

export type CommChannelStatusLine = {
  channel: string;
  status: string;
};

const PREPARED = new Set([
  "draft",
  "scheduled",
  "queued",
  "pending",
  "ready",
  "processing",
  "dry_run",
]);

function channelTitle(channel: string) {
  return channel === "email" ? "Email" : "WhatsApp";
}

/**
 * Texto pós-agendamento. "Entregue" só se o status já for delivered/read.
 */
export function formatAppointmentCommNote(input: {
  channels: CommChannelStatusLine[];
  emptyNote?: string;
}): string {
  if (input.channels.length === 0) {
    return input.emptyNote ?? "Cliente sem canal disponível";
  }
  const anySent = input.channels.some((c) =>
    ["sent", "delivered", "read", "manual_opened"].includes(c.status),
  );
  const allPrepared = input.channels.every((c) => PREPARED.has(c.status));
  const header =
    allPrepared && !anySent ? "Confirmação preparada" : "Confirmação";
  const lines = input.channels.map(
    (c) => `${channelTitle(c.channel)}: ${operatorStatusLabel(c.status)}`,
  );
  return [header, ...lines].join("\n");
}
