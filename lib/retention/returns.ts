/**
 * Sprint 35.2 — Retorno previsto (≠ agendamento).
 * Não reserva horário.
 */

export const RETURN_STATUSES = [
  "previsto",
  "proximo",
  "hoje",
  "atrasado",
  "contatado",
  "cliente_respondeu",
  "cliente_respondeu_sim",
  "agendado",
  "concluido",
  "cancelado",
  "ignorado",
] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  previsto: "Previsto",
  proximo: "Próximo",
  hoje: "Hoje",
  atrasado: "Atrasado",
  contatado: "Contatado",
  cliente_respondeu: "Cliente respondeu",
  cliente_respondeu_sim: "Aguardando agendamento",
  agendado: "Agendado",
  concluido: "Concluído",
  cancelado: "Cancelado",
  ignorado: "Ignorado",
};

export const RETURN_PRESET_DAYS = [7, 15, 30, 60, 90, 182, 365] as const;

export const RETURN_PRESET_LABELS: Record<number, string> = {
  7: "em 7 dias",
  15: "em 15 dias",
  30: "em 30 dias",
  60: "em 60 dias",
  90: "em 90 dias",
  182: "em 6 meses",
  365: "em 12 meses",
};

export type ReturnRule = {
  returnEnabled: boolean;
  returnType: "data" | "km" | "data_ou_km" | "sessao" | "follow_up";
  intervalDays: number | null;
  intervalMonths: number | null;
  mileageKm: number | null;
  hideProcedure: boolean;
  messageTemplate: string | null;
};

export const EMPTY_RETURN_RULE: ReturnRule = {
  returnEnabled: false,
  returnType: "data",
  intervalDays: null,
  intervalMonths: null,
  mileageKm: null,
  hideProcedure: false,
  messageTemplate: null,
};

/** Defaults de segmento — sugeridos, não obrigatórios. */
export function defaultReturnRuleForSegment(
  segment: string | null,
): ReturnRule {
  switch (segment) {
    case "oficina":
      return {
        ...EMPTY_RETURN_RULE,
        returnEnabled: true,
        returnType: "data_ou_km",
        intervalMonths: 6,
        mileageKm: 10000,
      };
    case "lava_rapido":
      return {
        ...EMPTY_RETURN_RULE,
        returnEnabled: true,
        returnType: "data",
        intervalDays: 15,
      };
    case "barbearia":
      return {
        ...EMPTY_RETURN_RULE,
        returnEnabled: true,
        returnType: "data",
        intervalDays: 30,
      };
    case "clinica_estetica":
      return {
        ...EMPTY_RETURN_RULE,
        returnEnabled: true,
        returnType: "sessao",
        intervalDays: 21,
        hideProcedure: true,
      };
    case "consultorio_odontologico":
      return {
        ...EMPTY_RETURN_RULE,
        returnEnabled: true,
        returnType: "data",
        intervalMonths: 6,
        hideProcedure: true,
      };
    case "consultoria":
      return {
        ...EMPTY_RETURN_RULE,
        returnEnabled: true,
        returnType: "follow_up",
        intervalDays: 30,
      };
    default:
      return { ...EMPTY_RETURN_RULE };
  }
}

export function addMonthsCivil(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + months, d));
  return date.toISOString().slice(0, 10);
}

export function addDaysCivil(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

export function computeDueDate(input: {
  fromCivilDate: string;
  rule: Pick<ReturnRule, "intervalDays" | "intervalMonths">;
  specificDate?: string | null;
}): string {
  if (input.specificDate && /^\d{4}-\d{2}-\d{2}$/.test(input.specificDate)) {
    return input.specificDate;
  }
  if (input.rule.intervalMonths && input.rule.intervalMonths > 0) {
    return addMonthsCivil(input.fromCivilDate, input.rule.intervalMonths);
  }
  const days = input.rule.intervalDays && input.rule.intervalDays > 0
    ? input.rule.intervalDays
    : 30;
  return addDaysCivil(input.fromCivilDate, days);
}

export function computeNextKm(
  lastKm: number | null | undefined,
  intervalKm: number | null | undefined,
): number | null {
  if (lastKm == null || intervalKm == null) return null;
  if (!Number.isFinite(lastKm) || !Number.isFinite(intervalKm)) return null;
  if (intervalKm <= 0) return null;
  return Math.round(lastKm + intervalKm);
}

export function classifyReturnDue(input: {
  dueAt: string;
  todayCivil: string;
  status: string;
  horizonDays?: number;
}): ReturnStatus {
  const closed = new Set([
    "agendado",
    "concluido",
    "cancelado",
    "ignorado",
    "contatado",
    "cliente_respondeu",
    "cliente_respondeu_sim",
  ]);
  if (closed.has(input.status)) return input.status as ReturnStatus;
  if (input.dueAt < input.todayCivil) return "atrasado";
  if (input.dueAt === input.todayCivil) return "hoje";
  const horizon = input.horizonDays ?? 7;
  const limit = addDaysCivil(input.todayCivil, horizon);
  if (input.dueAt <= limit) return "proximo";
  return "previsto";
}

export function isKmDue(input: {
  lastKm: number | null;
  nextKm: number | null;
  currentKm?: number | null;
}): boolean {
  if (input.nextKm == null) return false;
  const current = input.currentKm ?? input.lastKm;
  if (current == null) return false;
  return current >= input.nextKm;
}

export const DEFAULT_COMM_OFFSETS = [
  { key: "D-10", days: -10, template: "RETORNO_D10" },
  { key: "D-3", days: -3, template: "RETORNO_D3" },
  { key: "D0", days: 0, template: "RETORNO_HOJE" },
  { key: "D+7", days: 7, template: "RETORNO_ATRASADO" },
] as const;

export function offsetsForSegment(segment: string | null): typeof DEFAULT_COMM_OFFSETS {
  if (segment === "consultoria") {
    return [
      { key: "D-10", days: -10, template: "RETORNO_D10" },
      { key: "D-3", days: -3, template: "RETORNO_D3" },
      { key: "D0", days: 0, template: "RETORNO_HOJE" },
      { key: "D+7", days: 7, template: "REENGAJAMENTO" },
    ] as unknown as typeof DEFAULT_COMM_OFFSETS;
  }
  return DEFAULT_COMM_OFFSETS;
}
