/**
 * Previsão de receita a partir de oportunidades reais.
 * Provável = Σ (valor × probabilidade/100) em abertas.
 */

import type { CrmOportunidadeRow } from "@/types/crm-enterprise";
import type { RevenueForecastPanel } from "./types";

function monthKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function inMonth(iso: string | null | undefined, key: string): boolean {
  return monthKey(iso) === key;
}

export function buildRevenueForecast(
  opps: CrmOportunidadeRow[],
  opts: {
    periodMonth?: string;
    nameByOwner?: Map<string, string>;
  } = {},
): RevenueForecastPanel {
  const now = new Date();
  const period =
    opts.periodMonth ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const names = opts.nameByOwner ?? new Map<string, string>();

  const abertas = opps.filter((o) => o.status === "aberta");
  const ganhasPeriodo = opps.filter(
    (o) => o.status === "ganha" && inMonth(o.data_fechamento ?? o.updated_at, period),
  );

  let receitaPrevista = 0;
  let receitaProvavel = 0;
  for (const o of abertas) {
    const v = Number(o.valor_estimado ?? 0);
    receitaPrevista += v;
    const p = o.probabilidade == null ? null : Number(o.probabilidade);
    if (p != null && Number.isFinite(p)) {
      receitaProvavel += v * (clampPct(p) / 100);
    }
  }

  const receitaFechada = ganhasPeriodo.reduce(
    (a, o) => a + Number(o.valor_estimado ?? 0),
    0,
  );

  const stageMap = new Map<
    string,
    { count: number; valor: number; ponderado: number }
  >();
  for (const o of abertas) {
    const stage = o.stage_key || "lead";
    const cur = stageMap.get(stage) ?? { count: 0, valor: 0, ponderado: 0 };
    const v = Number(o.valor_estimado ?? 0);
    const p = o.probabilidade == null ? 0 : clampPct(Number(o.probabilidade));
    cur.count += 1;
    cur.valor += v;
    cur.ponderado += v * (p / 100);
    stageMap.set(stage, cur);
  }

  const closed = opps.filter((o) => o.status === "ganha" || o.status === "perdida");
  const won = closed.filter((o) => o.status === "ganha").length;
  const conversao = closed.length > 0 ? Math.round((won / closed.length) * 1000) / 10 : 0;

  const byOwner = new Map<
    string,
    { prevista: number; provavel: number; fechada: number }
  >();
  for (const o of abertas) {
    const key = o.responsavel_id ?? "sem";
    const cur = byOwner.get(key) ?? { prevista: 0, provavel: 0, fechada: 0 };
    const v = Number(o.valor_estimado ?? 0);
    const p = o.probabilidade == null ? 0 : clampPct(Number(o.probabilidade));
    cur.prevista += v;
    cur.provavel += v * (p / 100);
    byOwner.set(key, cur);
  }
  for (const o of ganhasPeriodo) {
    const key = o.responsavel_id ?? "sem";
    const cur = byOwner.get(key) ?? { prevista: 0, provavel: 0, fechada: 0 };
    cur.fechada += Number(o.valor_estimado ?? 0);
    byOwner.set(key, cur);
  }

  return {
    receitaPrevista: round2(receitaPrevista),
    receitaProvavel: round2(receitaProvavel),
    receitaFechada: round2(receitaFechada),
    funil: [...stageMap.entries()]
      .map(([stage, s]) => ({
        stage,
        count: s.count,
        valor: round2(s.valor),
        ponderado: round2(s.ponderado),
      }))
      .sort((a, b) => b.valor - a.valor),
    conversao,
    porResponsavel: [...byOwner.entries()]
      .map(([id, s]) => ({
        responsavelId: id === "sem" ? null : id,
        nome:
          id === "sem"
            ? "Sem responsável"
            : (names.get(id) ?? id.slice(0, 8)),
        prevista: round2(s.prevista),
        provavel: round2(s.provavel),
        fechada: round2(s.fechada),
      }))
      .sort((a, b) => b.provavel - a.provavel),
  };
}

function clampPct(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
