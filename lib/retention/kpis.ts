import {
  resolveAgendaNature,
  type AgendaNature,
} from "./natures.ts";
import {
  classifyReturnDue,
  isKmDue,
} from "./returns.ts";
import type { CustomerReturnRow, RetentionOpsSummary } from "./types.ts";

export type AppointmentLike = {
  id: string;
  inicio: string;
  status: string;
  natureza?: string | null;
  origem?: string | null;
  tipo?: string | null;
  cliente_id?: string | null;
};

export type ClientAppointmentKpis = {
  agendadosHoje: number;
  aguardandoConfirmacao: number;
  confirmados: number;
  emAtendimento: number;
  concluidos: number;
  cancelados: number;
  naoCompareceram: number;
  reagendados: number;
};

const CLOSED_FOR_QUEUE = new Set([
  "agendado",
  "concluido",
  "cancelado",
  "ignorado",
]);

export function natureOf(row: AppointmentLike): AgendaNature {
  return resolveAgendaNature(row);
}

export function civilFromIso(iso: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function clientAppointmentKpis(
  events: AppointmentLike[],
  todayCivil: string,
  timeZone = "America/Sao_Paulo",
): ClientAppointmentKpis {
  const empty: ClientAppointmentKpis = {
    agendadosHoje: 0,
    aguardandoConfirmacao: 0,
    confirmados: 0,
    emAtendimento: 0,
    concluidos: 0,
    cancelados: 0,
    naoCompareceram: 0,
    reagendados: 0,
  };
  for (const ev of events) {
    if (natureOf(ev) !== "cliente") continue;
    const day = civilFromIso(ev.inicio, timeZone);
    if (day === todayCivil) empty.agendadosHoje += 1;
    switch (ev.status) {
      case "aguardando_confirmacao":
        empty.aguardandoConfirmacao += 1;
        break;
      case "confirmado":
        empty.confirmados += 1;
        break;
      case "em_atendimento":
      case "cliente_chegou":
        empty.emAtendimento += 1;
        break;
      case "concluido":
      case "realizado":
        empty.concluidos += 1;
        break;
      case "cancelado":
        empty.cancelados += 1;
        break;
      case "nao_compareceu":
        empty.naoCompareceram += 1;
        break;
      case "reagendado":
        empty.reagendados += 1;
        break;
      default:
        break;
    }
  }
  return empty;
}

export function retentionOpsSummary(
  rows: CustomerReturnRow[],
  todayCivil: string,
  options?: { currentKmByVehicle?: Record<string, number> },
): RetentionOpsSummary {
  const summary: RetentionOpsSummary = {
    hoje: 0,
    proximos7: 0,
    proximos30: 0,
    atrasados: 0,
    contatados: 0,
    agendados: 0,
    recuperados: 0,
    semAgendamento: 0,
    aguardandoContato: 0,
    clienteRespondeu: 0,
    receitaPotencial: null,
  };
  let valueSum = 0;
  let hasValue = false;

  for (const row of rows) {
    const classified = classifyReturnDue({
      dueAt: row.due_at,
      todayCivil,
      status: row.status,
      horizonDays: 7,
    });
    const kmHit = isKmDue({
      lastKm: row.last_km,
      nextKm: row.next_km,
      currentKm: row.veiculo_id
        ? options?.currentKmByVehicle?.[row.veiculo_id]
        : row.last_km,
    });

    if (classified === "hoje" || (kmHit && !CLOSED_FOR_QUEUE.has(row.status))) {
      summary.hoje += 1;
    }
    if (classified === "proximo") summary.proximos7 += 1;
    const d30 = classifyReturnDue({
      dueAt: row.due_at,
      todayCivil,
      status: row.status,
      horizonDays: 30,
    });
    if (d30 === "proximo" || d30 === "hoje") summary.proximos30 += 1;
    if (classified === "atrasado" || kmHit) summary.atrasados += 1;
    if (row.status === "contatado") summary.contatados += 1;
    if (row.status === "agendado") summary.agendados += 1;
    if (row.status === "agendado" || row.status === "concluido") {
      summary.recuperados += 1;
    }
    if (
      row.status === "cliente_respondeu" ||
      row.status === "cliente_respondeu_sim"
    ) {
      summary.clienteRespondeu += 1;
    }
    if (!CLOSED_FOR_QUEUE.has(row.status) && !row.appointment_id) {
      summary.semAgendamento += 1;
    }
    if (
      ["previsto", "proximo", "hoje", "atrasado"].includes(classified) &&
      row.status !== "contatado"
    ) {
      summary.aguardandoContato += 1;
    }
    if (row.estimated_value != null && Number.isFinite(Number(row.estimated_value))) {
      hasValue = true;
      valueSum += Number(row.estimated_value);
    }
  }
  summary.receitaPotencial = hasValue ? valueSum : null;
  return summary;
}
