/**
 * Ranking por responsável — métricas reais de opps + follow-ups + atividades.
 */

import type { CrmOportunidadeRow } from "@/types/crm-enterprise";
import type { OwnerRankingRow } from "./types";

export function buildOwnerRanking(args: {
  opps: CrmOportunidadeRow[];
  followUpsByOwner: Map<string, number>;
  activitiesByOwner: Map<string, number>;
  nameByOwner: Map<string, string>;
}): OwnerRankingRow[] {
  const { opps, followUpsByOwner, activitiesByOwner, nameByOwner } = args;
  const ids = new Set<string>();
  for (const o of opps) {
    if (o.responsavel_id) ids.add(o.responsavel_id);
  }
  for (const k of followUpsByOwner.keys()) if (k !== "sem") ids.add(k);
  for (const k of activitiesByOwner.keys()) if (k !== "sem") ids.add(k);

  const rows: OwnerRankingRow[] = [];

  for (const id of ids) {
    const mine = opps.filter((o) => o.responsavel_id === id);
    const abertas = mine.filter((o) => o.status === "aberta");
    const closed = mine.filter((o) => o.status === "ganha" || o.status === "perdida");
    const won = mine.filter((o) => o.status === "ganha");
    const pipeline = abertas.reduce((a, o) => a + Number(o.valor_estimado ?? 0), 0);
    const receita = won.reduce((a, o) => a + Number(o.valor_estimado ?? 0), 0);
    const conversao =
      closed.length > 0 ? Math.round((won.length / closed.length) * 1000) / 10 : 0;
    const ticket =
      won.length > 0 ? Math.round((receita / won.length) * 100) / 100 : 0;

    let tempoSum = 0;
    let tempoN = 0;
    for (const o of won) {
      const start = Date.parse(o.created_at);
      const end = Date.parse(o.data_fechamento ?? o.updated_at);
      if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
        tempoSum += (end - start) / 86_400_000;
        tempoN += 1;
      }
    }

    rows.push({
      responsavelId: id,
      nome: nameByOwner.get(id) ?? id.slice(0, 8),
      pipeline: Math.round(pipeline * 100) / 100,
      conversao,
      receita: Math.round(receita * 100) / 100,
      atividades: activitiesByOwner.get(id) ?? 0,
      followUps: followUpsByOwner.get(id) ?? 0,
      ticket,
      tempoMedioDias: tempoN > 0 ? Math.round((tempoSum / tempoN) * 10) / 10 : null,
      rank: 0,
    });
  }

  rows.sort((a, b) => b.receita - a.receita || b.pipeline - a.pipeline);
  rows.forEach((r, i) => {
    r.rank = i + 1;
  });
  return rows;
}
