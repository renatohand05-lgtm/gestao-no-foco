/**
 * Sprint 35.2.2 — settings de comunicação do tenant. Defaults seguros OFF.
 */

export type CommunicationTenantSettings = {
  whatsappMode: "disabled" | "manual_link" | "provider";
  emailMode: "disabled" | "provider";
  sendAppointmentCreated: boolean;
  sendAppointmentReminder: boolean;
  sendAppointmentCancelled: boolean;
  sendAppointmentRescheduled: boolean;
  sendReturn: boolean;
  sendServiceReady: boolean;
  sendDelivery: boolean;
  notifyReadyAuto: boolean;
  preferredChannel: "whatsapp" | "email";
  fallbackEmail: boolean;
  windowStartHour: number;
  windowEndHour: number;
  reminderOffsets: string[];
};

export const DEFAULT_COMMUNICATION_SETTINGS: CommunicationTenantSettings = {
  /** Link manual disponível; provider real permanece OFF via env/kill switch. */
  whatsappMode: "manual_link",
  emailMode: "disabled",
  sendAppointmentCreated: false,
  sendAppointmentReminder: false,
  sendAppointmentCancelled: false,
  sendAppointmentRescheduled: false,
  sendReturn: false,
  sendServiceReady: false,
  sendDelivery: false,
  notifyReadyAuto: false,
  preferredChannel: "whatsapp",
  fallbackEmail: false,
  windowStartHour: 8,
  windowEndHour: 19,
  reminderOffsets: [],
};

export function parseCommunicationSettings(
  raw: unknown,
): CommunicationTenantSettings {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const wa = o.whatsapp_mode ?? o.whatsappMode;
  const em = o.email_mode ?? o.emailMode;
  const preferred = o.preferred_channel ?? o.preferredChannel;
  const offsets = o.reminder_offsets ?? o.reminderOffsets;
  return {
    whatsappMode:
      wa === "manual_link" || wa === "provider" ? wa : "disabled",
    emailMode: em === "provider" ? "provider" : "disabled",
    sendAppointmentCreated: bool(o.send_appointment_created ?? o.sendAppointmentCreated),
    sendAppointmentReminder: bool(o.send_appointment_reminder ?? o.sendAppointmentReminder),
    sendAppointmentCancelled: bool(o.send_appointment_cancelled ?? o.sendAppointmentCancelled),
    sendAppointmentRescheduled: bool(
      o.send_appointment_rescheduled ?? o.sendAppointmentRescheduled,
    ),
    sendReturn: bool(o.send_return ?? o.sendReturn),
    sendServiceReady: bool(o.send_service_ready ?? o.sendServiceReady),
    sendDelivery: bool(o.send_delivery ?? o.sendDelivery),
    notifyReadyAuto: bool(o.notify_ready_auto ?? o.notifyReadyAuto),
    preferredChannel: preferred === "email" ? "email" : "whatsapp",
    fallbackEmail: bool(o.fallback_email ?? o.fallbackEmail),
    windowStartHour: hour(o.window_start_hour ?? o.windowStartHour, 8),
    windowEndHour: hour(o.window_end_hour ?? o.windowEndHour, 19),
    reminderOffsets: Array.isArray(offsets)
      ? offsets.filter((x): x is string => typeof x === "string")
      : [],
  };
}

export function settingsToRow(tenantId: string, s: CommunicationTenantSettings) {
  return {
    tenant_id: tenantId,
    whatsapp_mode: s.whatsappMode,
    email_mode: s.emailMode,
    send_appointment_created: s.sendAppointmentCreated,
    send_appointment_reminder: s.sendAppointmentReminder,
    send_appointment_cancelled: s.sendAppointmentCancelled,
    send_appointment_rescheduled: s.sendAppointmentRescheduled,
    send_return: s.sendReturn,
    send_service_ready: s.sendServiceReady,
    send_delivery: s.sendDelivery,
    notify_ready_auto: s.notifyReadyAuto,
    preferred_channel: s.preferredChannel,
    fallback_email: s.fallbackEmail,
    window_start_hour: s.windowStartHour,
    window_end_hour: s.windowEndHour,
    reminder_offsets: s.reminderOffsets,
    updated_at: new Date().toISOString(),
  };
}

function bool(value: unknown): boolean {
  return value === true;
}

function hour(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 23) return fallback;
  return n;
}

export function pickChannels(input: {
  settings: CommunicationTenantSettings;
  preferred: "whatsapp" | "email";
  whatsappAvailable: boolean;
  emailAvailable: boolean;
  /** Operador explícito ignora canal “desligado” do tenant, não o opt-out. */
  explicit?: boolean;
}): Array<"whatsapp" | "email"> {
  const waMode = input.settings.whatsappMode;
  const emMode = input.settings.emailMode;
  const waOk =
    input.whatsappAvailable &&
    (input.explicit || waMode === "manual_link" || waMode === "provider");
  const emOk = input.emailAvailable && (input.explicit || emMode === "provider");
  const first = input.settings.preferredChannel || input.preferred;
  const channels: Array<"whatsapp" | "email"> = [];
  if (waOk) channels.push("whatsapp");
  if (emOk) channels.push("email");
  if (channels.length === 0) return [];
  if (first === "email" && channels.includes("email")) {
    return ["email", ...channels.filter((c) => c !== "email")];
  }
  return channels;
}

export function automationEventEnabled(
  settings: CommunicationTenantSettings,
  templateCode: string,
): boolean {
  if (templateCode === "AGENDAMENTO_CRIADO" || templateCode === "AGENDAMENTO_CONFIRMADO") {
    return settings.sendAppointmentCreated;
  }
  if (templateCode === "LEMBRETE") return settings.sendAppointmentReminder;
  if (templateCode === "CANCELAMENTO") return settings.sendAppointmentCancelled;
  if (templateCode === "REAGENDAMENTO") return settings.sendAppointmentRescheduled;
  if (templateCode.startsWith("RETORNO") || templateCode === "REENGAJAMENTO") {
    return settings.sendReturn;
  }
  if (templateCode === "SERVICE_READY") return settings.sendServiceReady;
  if (templateCode === "SERVICE_DELIVERED") return settings.sendDelivery;
  return false;
}
