/**
 * Fase 25 — Desempenho de fornecedores (sobre cadastro Finance Core).
 * Não duplica `fornecedores` — apenas métricas derivadas.
 */

export type SupplierPerformanceInput = {
  fornecedorId: string;
  nome: string;
  leadTimeMedioDias: number | null;
  pedidosAtendidos: number;
  pedidosComAtraso: number;
  rejeicoesQualidade: number;
  pedidosTotais: number;
  slaAlvoDias: number | null;
};

export type SupplierPerformanceScore = {
  fornecedorId: string;
  nome: string;
  score: number | null;
  rankingHint: "A" | "B" | "C" | "indisponivel";
  otifPct: number | null;
  qualidadePct: number | null;
  leadTimeMedioDias: number | null;
  unavailableReason?: string;
};

function finite(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  return n;
}

export function scoreSupplierPerformance(
  input: SupplierPerformanceInput,
): SupplierPerformanceScore {
  const total = input.pedidosTotais;
  if (total <= 0) {
    return {
      fornecedorId: input.fornecedorId,
      nome: input.nome,
      score: null,
      rankingHint: "indisponivel",
      otifPct: null,
      qualidadePct: null,
      leadTimeMedioDias: finite(input.leadTimeMedioDias),
      unavailableReason: "Sem histórico de pedidos canônico.",
    };
  }

  const onTime = Math.max(0, input.pedidosAtendidos - input.pedidosComAtraso);
  const otifPct = onTime / total;
  const qualidadePct = Math.max(0, 1 - input.rejeicoesQualidade / total);

  let leadScore = 1;
  const lead = finite(input.leadTimeMedioDias);
  const sla = finite(input.slaAlvoDias);
  if (lead != null && sla != null && sla > 0) {
    leadScore = Math.max(0, Math.min(1, sla / Math.max(lead, 0.01)));
  } else if (lead == null) {
    leadScore = 0.5;
  }

  const score = otifPct * 0.45 + qualidadePct * 0.35 + leadScore * 0.2;
  let rankingHint: SupplierPerformanceScore["rankingHint"] = "C";
  if (score >= 0.85) rankingHint = "A";
  else if (score >= 0.65) rankingHint = "B";

  return {
    fornecedorId: input.fornecedorId,
    nome: input.nome,
    score: Number.isFinite(score) ? Math.round(score * 1000) / 1000 : null,
    rankingHint,
    otifPct: Number.isFinite(otifPct) ? otifPct : null,
    qualidadePct: Number.isFinite(qualidadePct) ? qualidadePct : null,
    leadTimeMedioDias: lead,
  };
}

export function rankSuppliers(
  rows: SupplierPerformanceInput[],
): SupplierPerformanceScore[] {
  return rows
    .map(scoreSupplierPerformance)
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}
