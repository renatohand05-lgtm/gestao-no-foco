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

/** Canal do cliente ≠ provider configurado. */
export function formatCustomerChannelAvailability(input: {
  whatsappAvailable: boolean;
  emailAvailable: boolean;
  whatsappProviderConfigured?: boolean;
  emailProviderConfigured?: boolean;
}): string {
  if (!input.whatsappAvailable && !input.emailAvailable) {
    return "Cliente sem canal disponível";
  }
  const waProvider = input.whatsappProviderConfigured === true;
  const emProvider = input.emailProviderConfigured === true;
  const wa = input.whatsappAvailable
    ? waProvider
      ? "WhatsApp: disponível"
      : "WhatsApp: disponível · provider não configurado"
    : "WhatsApp: sem número";
  const em = input.emailAvailable
    ? emProvider
      ? "Email: disponível"
      : "Email: disponível · provider não configurado"
    : "Email: sem endereço";
  return ["Confirmação preparada", wa, em].join("\n");
}
