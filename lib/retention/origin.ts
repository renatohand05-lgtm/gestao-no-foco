export const COMMUNICATION_ORIGINS = [
  "appointment",
  "appointment_created",
  "appointment_confirmed",
  "budget_published",
  "reminder",
  "return",
  "service_ready",
  "pickup",
  "manual",
  "other",
] as const;
export type CommunicationOrigin = (typeof COMMUNICATION_ORIGINS)[number];

export const ORIGIN_LABELS: Record<CommunicationOrigin, string> = {
  appointment: "Agendamento",
  appointment_created: "Agendamento criado",
  appointment_confirmed: "Agendamento confirmado",
  budget_published: "Orçamento",
  reminder: "Lembrete de agendamento",
  return: "Retorno/fidelização",
  service_ready: "Serviço pronto",
  pickup: "Confirmação de retirada",
  manual: "Mensagem manual",
  other: "Outros",
};

export function originFromTemplate(code: string): CommunicationOrigin {
  if (code === "LEMBRETE") return "reminder";
  if (code === "AGENDAMENTO_CRIADO") return "appointment_created";
  if (code === "AGENDAMENTO_CONFIRMADO") return "appointment_confirmed";
  if (code === "BUDGET_PUBLISHED") return "budget_published";
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
