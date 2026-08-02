/**
 * Fase 28.1 — Fila de follow-ups (tarefas + agenda).
 */

export type FollowUpItem = {
  id: string;
  tipo: string;
  titulo: string;
  clienteId: string;
  clienteNome: string;
  responsavelId: string | null;
  dataRef: string; // YYYY-MM-DD
  status: string;
  origem: "tarefa" | "agenda";
};

export type FollowUpBucket = "vencidos" | "hoje" | "proximos_7" | "sem_retorno";

export function bucketFollowUp(
  item: FollowUpItem,
  hojeIso: string,
): FollowUpBucket {
  if (!item.dataRef) return "sem_retorno";
  if (item.dataRef < hojeIso) return "vencidos";
  if (item.dataRef === hojeIso) return "hoje";
  const lim = shiftDays(hojeIso, 7);
  if (item.dataRef <= lim) return "proximos_7";
  return "sem_retorno";
}

function shiftDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function groupFollowUps(
  items: FollowUpItem[],
  hojeIso: string,
): Record<FollowUpBucket, FollowUpItem[]> {
  const out: Record<FollowUpBucket, FollowUpItem[]> = {
    vencidos: [],
    hoje: [],
    proximos_7: [],
    sem_retorno: [],
  };
  for (const item of items) {
    if (item.status === "concluida" || item.status === "cancelada") continue;
    out[bucketFollowUp(item, hojeIso)].push(item);
  }
  return out;
}
