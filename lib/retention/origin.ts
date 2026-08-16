export const COMMUNICATION_ORIGINS = [
  "appointment",
  "reminder",
  "return",
  "service_ready",
  "pickup",
  "manual",
  "other",
] as const;
export type CommunicationOrigin = (typeof COMMUNICATION_ORIGINS)[number];

export const ORIGIN_LABELS: Record<CommunicationOrigin, string> = {
  appointment: "Confirmação de agendamento",
  reminder: "Lembrete de agendamento",
  return: "Retorno/fidelização",
  service_ready: "Serviço pronto",
  pickup: "Confirmação de retirada",
  manual: "Mensagem manual",
  other: "Outros",
};

export function originFromTemplate(code: string): CommunicationOrigin {
  if (code === "LEMBRETE") return "reminder";
  if (code.startsWith("AGENDAMENTO") || code === "REAGENDAMENTO" || code === "CANCELAMENTO") {
    return "appointment";
  }
  if (code.startsWith("RETORNO") || code === "REENGAJAMENTO") return "return";
  if (code === "SERVICE_READY") return "service_ready";
  if (code === "SERVICE_DELIVERED") return "pickup";
  if (code === "MANUAL" || code.endsWith("_MANUAL")) return "manual";
  return "other";
}

export function originLabel(kind?: string | null, templateCode?: string | null): string {
  const key = (kind ?? originFromTemplate(templateCode ?? "")) as CommunicationOrigin;
  return ORIGIN_LABELS[key] ?? ORIGIN_LABELS.other;
}
