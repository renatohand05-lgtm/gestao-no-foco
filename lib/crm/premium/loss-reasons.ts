/**
 * Categorização determinística de motivos de perda (texto livre → categorias).
 */

import {
  LOSS_REASON_CATEGORIES,
  LOSS_REASON_TOKEN_MAP,
  type LossReasonCategory,
} from "@/config/crm/commercial-score";
import type { CrmOportunidadeRow } from "@/types/crm-enterprise";
import type { LossReasonBucket } from "./types";

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export function categorizeLossReason(raw: string | null | undefined): LossReasonCategory {
  if (!raw?.trim()) return "Outro";
  const n = normalize(raw);
  for (const entry of LOSS_REASON_TOKEN_MAP) {
    for (const token of entry.tokens) {
      if (n.includes(normalize(token))) return entry.category;
    }
  }
  return "Outro";
}

export function buildLossReasonAnalysis(
  opps: CrmOportunidadeRow[],
  eventMotivos: Array<{ motivo: string; total: number }> = [],
): LossReasonBucket[] {
  const counts = new Map<LossReasonCategory, number>();
  for (const c of LOSS_REASON_CATEGORIES) counts.set(c, 0);

  for (const o of opps) {
    if (o.status !== "perdida") continue;
    const cat = categorizeLossReason(o.motivo_perda);
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }

  // Complementa com eventos clássicos quando não há opps perdidas com motivo.
  const oppLost = opps.filter((o) => o.status === "perdida").length;
  if (oppLost === 0 && eventMotivos.length) {
    for (const e of eventMotivos) {
      const cat = categorizeLossReason(e.motivo);
      counts.set(cat, (counts.get(cat) ?? 0) + e.total);
    }
  }

  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  return LOSS_REASON_CATEGORIES.map((category) => {
    const t = counts.get(category) ?? 0;
    return {
      category,
      total: t,
      share: total > 0 ? Math.round((t / total) * 1000) / 10 : 0,
    };
  });
}
