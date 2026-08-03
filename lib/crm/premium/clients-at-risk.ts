/**
 * Clientes em risco — sinais reais (contato, parado, follow-up, frio).
 */

import type { ClientAtRisk, ClientRiskKind } from "./types";

export type RiskClienteInput = {
  id: string;
  nome: string;
  estagio: string;
  updatedAt: string;
  ultimoContatoAt: string | null;
  followUpVencido: boolean;
  openOppStale: boolean;
  activityCount30d: number;
  commercialScore: number;
};

export function buildClientsAtRisk(
  rows: RiskClienteInput[],
  now = new Date(),
): ClientAtRisk[] {
  const out: ClientAtRisk[] = [];

  for (const r of rows) {
    const kinds: ClientRiskKind[] = [];
    const daysContact = daysSince(r.ultimoContatoAt, now);
    const stalled = daysSince(r.updatedAt, now) ?? 0;

    if (daysContact == null || daysContact >= 21) kinds.push("sem_contato");
    if (stalled >= 14 && !["fechado", "perdido"].includes(r.estagio)) {
      kinds.push("negocio_parado");
    }
    if (r.followUpVencido) kinds.push("followup_vencido");
    if (r.openOppStale) kinds.push("oportunidade_fria");
    if (r.activityCount30d === 0 && stalled >= 7) kinds.push("sem_atividade");

    if (!kinds.length) continue;

    let priority: ClientAtRisk["priority"] = "baixa";
    if (
      kinds.includes("followup_vencido") ||
      kinds.length >= 3 ||
      (daysContact != null && daysContact >= 45)
    ) {
      priority = "alta";
    } else if (kinds.length >= 2 || stalled >= 21) {
      priority = "media";
    }

    out.push({
      clienteId: r.id,
      nome: r.nome,
      kinds,
      priority,
      score: r.commercialScore,
      lastContactAt: r.ultimoContatoAt,
      stalledDays: stalled,
    });
  }

  const order = { alta: 0, media: 1, baixa: 2 };
  return out
    .sort(
      (a, b) =>
        order[a.priority] - order[b.priority] ||
        (b.stalledDays ?? 0) - (a.stalledDays ?? 0),
    )
    .slice(0, 40);
}

function daysSince(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((now.getTime() - t) / 86_400_000));
}
