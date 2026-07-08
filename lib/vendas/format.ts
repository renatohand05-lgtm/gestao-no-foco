import type { VendaStatus } from "@/types/vendas";

export function formatVendaDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(`${date}T12:00:00`));
}

export function formatVendaDateTime(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));
}

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatVendaNumero(numero: number) {
  return `#${String(numero).padStart(6, "0")}`;
}

export function formatQuantity(value: number | null | undefined, unidade?: string | null) {
  if (value === null || value === undefined) return "—";

  const formatted = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value);

  return unidade ? `${formatted} ${unidade}` : formatted;
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

  const labels: Record<string, string> = {
    dinheiro: "Dinheiro",
    pix: "PIX",
    cartao_credito: "Cartão de crédito",
    cartao_debito: "Cartão de débito",
    boleto: "Boleto",
    transferencia: "Transferência",
    outro: "Outro",
  };

  return labels[value] ?? value;
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
