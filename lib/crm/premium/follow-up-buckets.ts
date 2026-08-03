/**
 * Buckets Premium de follow-up (extensão determinística da fila Fase 28).
 */

import type { FollowUpItem } from "@/lib/crm/phase28/follow-up-queue";
import type { PremiumFollowUpBucket } from "./types";

function shiftDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Fim da semana civil (domingo) a partir de hojeIso YYYY-MM-DD. */
function endOfWeek(hojeIso: string): string {
  const d = new Date(`${hojeIso}T12:00:00`);
  const day = d.getDay(); // 0=dom
  const add = day === 0 ? 0 : 7 - day;
  return shiftDays(hojeIso, add);
}

export function premiumBucketFollowUp(
  item: FollowUpItem,
  hojeIso: string,
): PremiumFollowUpBucket {
  if (!item.responsavelId) return "sem_responsavel";
  if (!item.dataRef) return "sem_data";
  if (item.dataRef < hojeIso) return "atrasados";
  if (item.dataRef === hojeIso) return "hoje";
  const amanha = shiftDays(hojeIso, 1);
  if (item.dataRef === amanha) return "amanha";
  const weekEnd = endOfWeek(hojeIso);
  if (item.dataRef <= weekEnd) return "esta_semana";
  return "esta_semana";
}

export function groupPremiumFollowUps(
  items: FollowUpItem[],
  hojeIso: string,
): Record<PremiumFollowUpBucket, FollowUpItem[]> {
  const out: Record<PremiumFollowUpBucket, FollowUpItem[]> = {
    atrasados: [],
    hoje: [],
    amanha: [],
    esta_semana: [],
    sem_responsavel: [],
    sem_data: [],
  };
  for (const item of items) {
    if (item.status === "concluida" || item.status === "cancelada") continue;
    // Sem responsável / sem data têm prioridade de bucket dedicado.
    if (!item.responsavelId) {
      out.sem_responsavel.push(item);
      continue;
    }
    if (!item.dataRef) {
      out.sem_data.push(item);
      continue;
    }
    const b = premiumBucketFollowUp(item, hojeIso);
    if (b === "sem_responsavel" || b === "sem_data") {
      out[b].push(item);
      continue;
    }
    out[b].push(item);
  }
  return out;
}
