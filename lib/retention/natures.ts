/**
 * Sprint 35.2 — Natureza de evento de agenda.
 * Reusa `agenda_eventos.origem` até a migration 35.2 (coluna natureza).
 * Métricas de atendimento só usam `cliente`.
 */

export const AGENDA_NATURES = ["cliente", "negocio", "interno"] as const;
export type AgendaNature = (typeof AGENDA_NATURES)[number];

export const CLIENT_APPOINTMENT_STATUSES = [
  "agendado",
  "aguardando_confirmacao",
  "confirmado",
  "cliente_chegou",
  "em_atendimento",
  "concluido",
  "realizado",
  "cancelado",
  "nao_compareceu",
  "reagendado",
] as const;
export type ClientAppointmentStatus =
  (typeof CLIENT_APPOINTMENT_STATUSES)[number];

export const CLIENT_APPOINTMENT_STATUS_LABELS: Record<
  ClientAppointmentStatus,
  string
> = {
  agendado: "Agendado",
  aguardando_confirmacao: "Aguardando confirmação",
  confirmado: "Confirmado",
  cliente_chegou: "Cliente chegou",
  em_atendimento: "Em atendimento",
  concluido: "Concluído",
  realizado: "Concluído",
  cancelado: "Cancelado",
  nao_compareceu: "Não compareceu",
  reagendado: "Reagendado",
};

export const BUSINESS_EVENT_TYPES = [
  "reuniao_presencial",
  "reuniao_interna",
  "call",
  "videoconferencia",
  "reuniao_comercial",
  "reuniao_fornecedor",
  "reuniao_parceiro",
  "visita_externa",
  "treinamento",
  "entrevista",
  "apresentacao",
  "follow_up",
  "mentoria",
  "planejamento",
  "evento",
  "tarefa_horario",
  "compromisso",
  "outro",
] as const;

export const BUSINESS_EVENT_TYPE_LABELS: Record<
  (typeof BUSINESS_EVENT_TYPES)[number],
  string
> = {
  reuniao_presencial: "Reunião presencial",
  reuniao_interna: "Reunião interna",
  call: "Call",
  videoconferencia: "Videoconferência",
  reuniao_comercial: "Reunião comercial",
  reuniao_fornecedor: "Reunião com fornecedor",
  reuniao_parceiro: "Reunião com parceiro",
  visita_externa: "Visita externa",
  treinamento: "Treinamento",
  entrevista: "Entrevista",
  apresentacao: "Apresentação",
  follow_up: "Follow-up",
  mentoria: "Mentoria",
  planejamento: "Planejamento",
  evento: "Evento",
  tarefa_horario: "Tarefa com horário",
  compromisso: "Compromisso",
  outro: "Outro",
};

export const INTERNAL_EVENT_TYPES = [
  "bloqueio",
  "almoco",
  "intervalo",
  "folga",
  "ferias",
  "ausencia",
  "treinamento_interno",
  "administrativo",
  "manutencao",
  "indisponivel",
] as const;

export const INTERNAL_EVENT_TYPE_LABELS: Record<
  (typeof INTERNAL_EVENT_TYPES)[number],
  string
> = {
  bloqueio: "Bloqueio de horário",
  almoco: "Almoço",
  intervalo: "Intervalo",
  folga: "Folga",
  ferias: "Férias",
  ausencia: "Ausência",
  treinamento_interno: "Treinamento interno",
  administrativo: "Administrativo",
  manutencao: "Manutenção",
  indisponivel: "Horário indisponível",
};

const INTERNAL_SET = new Set<string>(INTERNAL_EVENT_TYPES);
const CLIENT_KPI_STATUSES = new Set<string>([
  "agendado",
  "aguardando_confirmacao",
  "confirmado",
  "cliente_chegou",
  "em_atendimento",
  "concluido",
  "realizado",
  "cancelado",
  "nao_compareceu",
  "reagendado",
]);

export const NON_BLOCKING_STATUSES = new Set([
  "cancelado",
  "nao_compareceu",
  "concluido",
  "realizado",
]);

export function isInternalEventType(tipo: string | null | undefined): boolean {
  return INTERNAL_SET.has((tipo ?? "").trim());
}

export function natureRequiresCliente(natureza: AgendaNature): boolean {
  return natureza === "cliente";
}

export function resolveAgendaNature(row: {
  natureza?: string | null;
  origem?: string | null;
  tipo?: string | null;
  cliente_id?: string | null;
}): AgendaNature {
  const explicit = (row.natureza ?? "").trim();
  if ((AGENDA_NATURES as readonly string[]).includes(explicit)) {
    return explicit as AgendaNature;
  }
  const origem = (row.origem ?? "").trim();
  if ((AGENDA_NATURES as readonly string[]).includes(origem)) {
    return origem as AgendaNature;
  }
  if (isInternalEventType(row.tipo)) return "interno";
  if (row.cliente_id) return "cliente";
  return "negocio";
}

export function isClientAppointmentKpiStatus(status: string): boolean {
  return CLIENT_KPI_STATUSES.has(status);
}

export function countsAsStaffBlock(row: {
  status?: string | null;
  tipo?: string | null;
  natureza?: string | null;
  origem?: string | null;
  cliente_id?: string | null;
}): boolean {
  if (NON_BLOCKING_STATUSES.has(row.status ?? "")) return false;
  return true;
}

export function endIsoFromDuration(
  startIso: string,
  durationMinutes: number,
): string {
  const start = Date.parse(startIso);
  const mins = Math.max(1, Math.round(durationMinutes));
  return new Date(start + mins * 60_000).toISOString();
}

export function durationMinutesBetween(startIso: string, endIso: string): number {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.round((end - start) / 60_000);
}
