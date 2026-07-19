/**
 * Validação de rateio — soma 100%, sem perda de centavos.
 */

export type RateioInput = {
  centroCustoId: string;
  percentual: number;
};

export type RateioAllocated = {
  centroCustoId: string;
  percentual: number;
  valor: number;
};

export function validateRateioPercentuais(
  parts: RateioInput[],
): { ok: true } | { ok: false; message: string } {
  if (parts.length === 0) {
    return { ok: true };
  }
  const ids = new Set<string>();
  for (const part of parts) {
    if (!part.centroCustoId) {
      return { ok: false, message: "Centro de custo obrigatório no rateio." };
    }
    if (ids.has(part.centroCustoId)) {
      return { ok: false, message: "Centro de custo duplicado no rateio." };
    }
    ids.add(part.centroCustoId);
    if (!(part.percentual > 0) || part.percentual > 100) {
      return { ok: false, message: "Percentual de rateio inválido." };
    }
  }
  const sum = parts.reduce((acc, p) => acc + p.percentual, 0);
  if (Math.abs(sum - 100) > 0.0001) {
    return {
      ok: false,
      message: `A soma dos percentuais deve ser 100% (atual: ${sum.toFixed(4)}%).`,
    };
  }
  return { ok: true };
}

/** Distribui valor sem deixar sobra de centavos na última fatia. */
export function allocateRateioValues(
  total: number,
  parts: RateioInput[],
): RateioAllocated[] {
  if (parts.length === 0) return [];
  const sorted = [...parts];
  const raw = sorted.map((p) => ({
    centroCustoId: p.centroCustoId,
    percentual: p.percentual,
    valor: Math.round(((total * p.percentual) / 100) * 100) / 100,
  }));
  const allocated = raw.reduce((acc, r) => acc + r.valor, 0);
  const diff = Math.round((total - allocated) * 100) / 100;
  if (raw.length > 0 && diff !== 0) {
    raw[raw.length - 1]!.valor =
      Math.round((raw[raw.length - 1]!.valor + diff) * 100) / 100;
  }
  return raw;
}
