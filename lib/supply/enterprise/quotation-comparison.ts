/**
 * Sprint 25.4.3 — Comparação Enterprise de cotações (funções puras).
 * Não escolhe fornecedor automaticamente.
 */

export type QuotationLineCompare = {
  produtoId: string | null;
  descricao: string;
  fornecedorId: string;
  fornecedorNome: string;
  precoUnitario: number;
  quantidade: number;
  desconto: number;
  freteInformado: number | null;
  impostosInformados: number | null;
  prazoDias: number | null;
  leadTimeDias: number | null;
  validadeProposta: string | null;
  qualidadeHistorica: number | null;
  entregaNoPrazoHistorica: number | null;
};

export type QuotationCompareRow = {
  produtoKey: string;
  descricao: string;
  offers: Array<{
    fornecedorId: string;
    fornecedorNome: string;
    precoUnitario: number;
    custoTotal: number;
    desconto: number;
    freteInformado: number | null;
    impostosInformados: number | null;
    prazoDias: number | null;
    leadTimeDias: number | null;
    scoreSugestao: number | null;
    motivoSugestao: string | null;
  }>;
  suggestedFornecedorId: string | null;
  financialDeltaVsBest: number;
};

function lineTotal(o: QuotationLineCompare): number {
  const base = o.precoUnitario * o.quantidade - (o.desconto || 0);
  const frete = o.freteInformado ?? 0;
  const imp = o.impostosInformados ?? 0;
  return Number((base + frete + imp).toFixed(2));
}

function suggestionScore(o: QuotationLineCompare): {
  score: number;
  reason: string;
} {
  const cost = lineTotal(o);
  const quality = o.qualidadeHistorica ?? 0.5;
  const onTime = o.entregaNoPrazoHistorica ?? 0.5;
  const lead = o.leadTimeDias ?? 30;
  const leadFactor = Math.max(0.2, 1 - lead / 90);
  const score = Number(
    (1 / Math.max(cost, 0.01)) * 1000 * (0.5 + 0.25 * quality + 0.15 * onTime + 0.1 * leadFactor),
  );
  return {
    score,
    reason: `Custo ${cost.toFixed(2)} · qualidade ${quality} · pontualidade ${onTime} · lead ${lead}d`,
  };
}

export function buildQuotationComparison(
  lines: QuotationLineCompare[],
): QuotationCompareRow[] {
  const byProduct = new Map<string, QuotationLineCompare[]>();
  for (const line of lines) {
    const key = line.produtoId ?? `desc:${line.descricao.trim().toLowerCase()}`;
    const list = byProduct.get(key) ?? [];
    list.push(line);
    byProduct.set(key, list);
  }

  const rows: QuotationCompareRow[] = [];
  for (const [produtoKey, offersRaw] of byProduct) {
    const offers = offersRaw.map((o) => {
      const sug = suggestionScore(o);
      return {
        fornecedorId: o.fornecedorId,
        fornecedorNome: o.fornecedorNome,
        precoUnitario: o.precoUnitario,
        custoTotal: lineTotal(o),
        desconto: o.desconto,
        freteInformado: o.freteInformado,
        impostosInformados: o.impostosInformados,
        prazoDias: o.prazoDias,
        leadTimeDias: o.leadTimeDias,
        scoreSugestao: sug.score,
        motivoSugestao: sug.reason,
      };
    });
    offers.sort((a, b) => a.custoTotal - b.custoTotal);
    const best = offers[0];
    const suggested = [...offers].sort(
      (a, b) => (b.scoreSugestao ?? 0) - (a.scoreSugestao ?? 0),
    )[0];
    rows.push({
      produtoKey,
      descricao: offersRaw[0]?.descricao ?? produtoKey,
      offers,
      suggestedFornecedorId: suggested?.fornecedorId ?? null,
      financialDeltaVsBest: best
        ? Number(
            (
              Math.max(...offers.map((o) => o.custoTotal)) - best.custoTotal
            ).toFixed(2),
          )
        : 0,
    });
  }
  return rows;
}

export type WinnerDecision = {
  mode: "geral" | "por_item" | "dividido";
  selections: Array<{ produtoKey: string; fornecedorId: string; justificativa: string }>;
};

export function assertHumanWinnerDecision(decision: WinnerDecision) {
  if (!decision.selections.length) {
    throw new Error("Selecione o vencedor manualmente — sem escolha automática.");
  }
  for (const s of decision.selections) {
    if (!s.justificativa.trim()) {
      throw new Error("Justificativa obrigatória para cada escolha de fornecedor.");
    }
  }
}
