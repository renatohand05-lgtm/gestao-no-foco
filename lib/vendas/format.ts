import { LEGACY_FORMA_PAGAMENTO_LABELS } from "@/lib/vendas/constants";
import { formatDateOnly } from "@/lib/format";
import type { VendaStatus } from "@/types/vendas";

export { formatCurrency, formatQuantity } from "@/lib/format";
export { formatDateTime as formatVendaDateTime } from "@/lib/format";

/** Data de venda (ISO date) — mesmo núcleo de `formatDateOnly`. */
export function formatVendaDate(date: string) {
  return formatDateOnly(date);
}

export function formatVendaNumero(numero: number) {
  return `#${String(numero).padStart(6, "0")}`;
}

export function getStatusLabel(status: VendaStatus) {
  const labels: Record<VendaStatus, string> = {
    orcamento: "Orçamento",
    em_andamento: "Em andamento",
    faturado: "Faturado",
    cancelado: "Cancelado",
  };

  return labels[status];
}

export function getFormaPagamentoLabel(value: string | null | undefined) {
  if (!value) return "—";
  return LEGACY_FORMA_PAGAMENTO_LABELS[value] ?? value;
}

export function resolveFormaPagamentoDisplay(venda: {
  forma_pagamento: string | null;
  forma_pagamento_id?: string | null;
  forma_pagamento_ref?: { nome: string } | null;
}) {
  if (venda.forma_pagamento_ref?.nome) {
    return venda.forma_pagamento_ref.nome;
  }

  return getFormaPagamentoLabel(venda.forma_pagamento);
}

export function calcItemTotal(
  quantidade: number,
  precoUnitario: number,
  desconto = 0,
) {
  return Number((quantidade * precoUnitario - desconto).toFixed(2));
}

export function calcItemMargem(
  quantidade: number,
  precoUnitario: number,
  custoUnitario: number | null | undefined,
  desconto = 0,
) {
  if (custoUnitario === null || custoUnitario === undefined) return null;

  return Number(
    (quantidade * precoUnitario - quantidade * custoUnitario - desconto).toFixed(2),
  );
}

export function calcVendaTotais(
  itens: Array<{
    quantidade: number;
    preco_unitario: number;
    desconto?: number;
    custo_unitario?: number | null;
  }>,
  descontoTotal = 0,
) {
  const subtotal = itens.reduce(
    (sum, item) =>
      sum +
      calcItemTotal(
        item.quantidade,
        item.preco_unitario,
        item.desconto ?? 0,
      ),
    0,
  );

  const margemTotal = itens.reduce((sum, item) => {
    const margem = calcItemMargem(
      item.quantidade,
      item.preco_unitario,
      item.custo_unitario,
      item.desconto ?? 0,
    );
    return sum + (margem ?? 0);
  }, 0);

  const total = Number((subtotal - descontoTotal).toFixed(2));
  const hasMargem = itens.some(
    (item) => item.custo_unitario !== null && item.custo_unitario !== undefined,
  );

  return {
    subtotal: Number(subtotal.toFixed(2)),
    total,
    margem_total: hasMargem ? Number(margemTotal.toFixed(2)) : null,
  };
}

export function toDateInputValue(date?: string) {
  if (!date) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.slice(0, 10);
}
