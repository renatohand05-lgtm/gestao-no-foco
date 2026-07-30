/**
 * Sprint 25.4.3 — Ledger de lote (funções puras + FEFO).
 */

export type LotStatus =
  | "disponivel"
  | "bloqueado"
  | "esgotado"
  | "vencido"
  | "baixado";

export type LotMovementType =
  | "entrada"
  | "saida"
  | "transferencia"
  | "devolucao"
  | "perda"
  | "ajuste"
  | "inventario"
  | "reserva"
  | "consumo";

export type LotBalance = {
  id: string;
  produtoId: string;
  numeroLote: string;
  quantidadeAtual: number;
  validade: string | null;
  status: LotStatus;
  bloqueado: boolean;
};

export function applyLotQuantityDelta(input: {
  quantidadeAtual: number;
  tipo: LotMovementType;
  quantidade: number;
  allowNegative?: boolean;
}): { quantidadeNova: number; error?: string } {
  const q = Number(input.quantidade);
  if (!Number.isFinite(q) || q <= 0) {
    return { quantidadeNova: input.quantidadeAtual, error: "Quantidade inválida." };
  }
  const sign =
    input.tipo === "entrada" || input.tipo === "devolucao"
      ? 1
      : input.tipo === "ajuste"
        ? 1 // ajuste usa quantidade assinalada pelo caller
        : -1;
  const delta = input.tipo === "ajuste" ? q : sign * q;
  const nova = Number((input.quantidadeAtual + delta).toFixed(4));
  if (nova < 0 && !input.allowNegative) {
    return {
      quantidadeNova: input.quantidadeAtual,
      error: "Lote não pode ficar negativo sem autorização.",
    };
  }
  return { quantidadeNova: Math.max(0, nova) };
}

/** FEFO: prioriza validade mais próxima entre lotes disponíveis. */
export function pickLotsFefo(
  lots: LotBalance[],
  qtyNeeded: number,
  todayIso: string,
): { allocations: Array<{ loteId: string; qty: number }>; shortfall: number; blocked: string[] } {
  const blocked: string[] = [];
  const eligible = lots
    .filter((l) => {
      if (l.bloqueado || l.status === "bloqueado" || l.status === "baixado") {
        blocked.push(l.id);
        return false;
      }
      if (l.quantidadeAtual <= 0) return false;
      if (l.validade && l.validade < todayIso) {
        blocked.push(l.id);
        return false;
      }
      return l.status === "disponivel" || l.status === "esgotado"
        ? l.status === "disponivel"
        : true;
    })
    .sort((a, b) => {
      if (!a.validade && !b.validade) return 0;
      if (!a.validade) return 1;
      if (!b.validade) return -1;
      return a.validade.localeCompare(b.validade);
    });

  let remaining = qtyNeeded;
  const allocations: Array<{ loteId: string; qty: number }> = [];
  for (const lot of eligible) {
    if (remaining <= 0) break;
    const take = Math.min(lot.quantidadeAtual, remaining);
    if (take > 0) {
      allocations.push({ loteId: lot.id, qty: take });
      remaining = Number((remaining - take).toFixed(4));
    }
  }
  return { allocations, shortfall: Math.max(0, remaining), blocked };
}

export function assertLotLedgerCloses(input: {
  quantidadeInicial: number;
  movimentos: Array<{ tipo: LotMovementType; quantidade: number }>;
  quantidadeAtual: number;
}): { ok: boolean; computed: number } {
  let bal = input.quantidadeInicial;
  for (const m of input.movimentos) {
    const r = applyLotQuantityDelta({
      quantidadeAtual: bal,
      tipo: m.tipo,
      quantidade: m.quantidade,
      allowNegative: true,
    });
    bal = r.quantidadeNova;
  }
  const computed = Number(bal.toFixed(4));
  return {
    ok: computed === Number(input.quantidadeAtual.toFixed(4)),
    computed,
  };
}

export function lotMovementIdempotencyKey(input: {
  tenantId: string;
  loteId: string;
  tipo: string;
  referenciaId: string;
}): string {
  return `lote:${input.tenantId}:${input.loteId}:${input.tipo}:${input.referenciaId}`;
}
