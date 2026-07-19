import {
  allocateRateioValues,
  validateRateioPercentuais,
} from "@/lib/dre";

export type RateioLineInput = {
  centro_custo_id: string;
  percentual: number;
  descricao?: string | null;
};

export function normalizeRateioLines(
  total: number,
  lines: RateioLineInput[],
): Array<{
  centro_custo_id: string;
  percentual: number;
  valor: number;
  descricao: string | null;
}> {
  const check = validateRateioPercentuais(
    lines.map((l) => ({
      centroCustoId: l.centro_custo_id,
      percentual: l.percentual,
    })),
  );
  if (!check.ok) {
    throw new Error(check.message);
  }
  if (lines.length === 0) return [];

  const allocated = allocateRateioValues(
    total,
    lines.map((l) => ({
      centroCustoId: l.centro_custo_id,
      percentual: l.percentual,
    })),
  );

  return allocated.map((row, index) => ({
    centro_custo_id: row.centroCustoId,
    percentual: row.percentual,
    valor: row.valor,
    descricao: lines[index]?.descricao?.trim() || null,
  }));
}
