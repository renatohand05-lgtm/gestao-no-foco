/**
 * Política oficial de custo NF-e — Sprint 13.22 (decisão CTO).
 *
 * - Estoque: custo médio ponderado
 * - OS direta: custo real da nota (não altera custo médio)
 * - Misto: só a parcela de estoque entra no médio; OS usa custo real
 * - custo_unitario_final já inclui rateio de frete/seguro/despesas/descontos
 */

/** Precisão interna do unitário (arredondar só na UI). */
export const CUSTO_UNIT_SCALE = 6;

export function calcCustoMedioPonderado(input: {
  saldoAtual: number;
  custoMedioAtual: number | null | undefined;
  quantidadeEntrada: number;
  custoUnitarioEntrada: number;
}): number {
  const saldo = Number(input.saldoAtual) || 0;
  const qty = Number(input.quantidadeEntrada) || 0;
  if (qty <= 0) {
    return Number(input.custoMedioAtual ?? 0);
  }
  if (saldo <= 0) {
    return Number(input.custoUnitarioEntrada);
  }
  const custoAtual = Number(input.custoMedioAtual ?? 0);
  const numerador = saldo * custoAtual + qty * Number(input.custoUnitarioEntrada);
  const denominador = saldo + qty;
  if (denominador <= 0) {
    return Number(input.custoUnitarioEntrada);
  }
  return numerador / denominador;
}

/** Formata custo para exibição (2 casas). */
export function formatCustoDisplay(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
