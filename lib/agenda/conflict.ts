/**
 * Fase 28.5 — Detecção de conflitos de agenda (puro).
 */

export type AgendaInterval = {
  id?: string;
  inicio: string; // ISO
  fim: string;
  responsavelId?: string | null;
  recursoId?: string | null;
  capacidadeRecurso?: number;
};

export type AgendaConflict =
  | { type: "profissional_ocupado"; withId?: string }
  | { type: "recurso_ocupado"; withId?: string }
  | { type: "capacidade_excedida"; count: number; capacidade: number }
  | { type: "intervalo_invalido" };

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && aEnd > bStart;
}

export function detectAgendaConflicts(
  candidate: AgendaInterval,
  existing: AgendaInterval[],
): AgendaConflict[] {
  const start = Date.parse(candidate.inicio);
  const end = Date.parse(candidate.fim);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return [{ type: "intervalo_invalido" }];
  }

  const conflicts: AgendaConflict[] = [];
  let recursoCount = 0;

  for (const row of existing) {
    if (candidate.id && row.id === candidate.id) continue;
    const rs = Date.parse(row.inicio);
    const re = Date.parse(row.fim);
    if (!Number.isFinite(rs) || !Number.isFinite(re)) continue;
    if (!overlaps(start, end, rs, re)) continue;

    if (
      candidate.responsavelId &&
      row.responsavelId &&
      candidate.responsavelId === row.responsavelId
    ) {
      conflicts.push({ type: "profissional_ocupado", withId: row.id });
    }

    if (
      candidate.recursoId &&
      row.recursoId &&
      candidate.recursoId === row.recursoId
    ) {
      recursoCount += 1;
      conflicts.push({ type: "recurso_ocupado", withId: row.id });
    }
  }

  const cap = candidate.capacidadeRecurso ?? 1;
  if (candidate.recursoId && recursoCount + 1 > cap) {
    conflicts.push({
      type: "capacidade_excedida",
      count: recursoCount + 1,
      capacidade: cap,
    });
  }

  return conflicts;
}

export function buildRecurrenceDates(input: {
  start: string;
  frequency: "diaria" | "semanal" | "mensal";
  count: number;
}): string[] {
  const out: string[] = [];
  const base = new Date(`${input.start}T12:00:00`);
  if (Number.isNaN(base.getTime()) || input.count <= 0) return out;
  for (let i = 0; i < input.count; i += 1) {
    const d = new Date(base);
    if (input.frequency === "diaria") d.setDate(base.getDate() + i);
    else if (input.frequency === "semanal") d.setDate(base.getDate() + i * 7);
    else d.setMonth(base.getMonth() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${day}`);
  }
  return out;
}
