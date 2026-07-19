import type { ContaReceberStatus } from "@/types/contas-receber";

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function addMonths(dateStr: string, months: number): string {
  const date = new Date(`${dateStr}T12:00:00`);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

export function calcValorLiquido(conta: {
  valor_original: number;
  desconto: number;
  juros: number;
  multa: number;
}): number {
  return (
    conta.valor_original - conta.desconto + conta.juros + conta.multa
  );
}

export function calcSaldoPendente(conta: {
  valor_original: number;
  desconto: number;
  juros: number;
  multa: number;
  valor_recebido: number;
}): number {
  return Math.max(calcValorLiquido(conta) - conta.valor_recebido, 0);
}

export function resolveStatusExibicao(conta: {
  status: ContaReceberStatus;
  data_vencimento: string;
}): ContaReceberStatus {
  if (
    conta.status === "aberto" &&
    conta.data_vencimento < todayISO()
  ) {
    return "vencido";
  }

  return conta.status;
}

export function splitValorParcelas(total: number, parcelas: number): number[] {
  if (parcelas <= 1) return [total];

  const centsTotal = Math.round(total * 100);
  const baseCents = Math.floor(centsTotal / parcelas);
  const remainder = centsTotal - baseCents * parcelas;
  const amounts = Array.from({ length: parcelas }, () => baseCents / 100);

  if (remainder > 0) {
    amounts[amounts.length - 1] =
      (baseCents + remainder) / 100;
  }

  return amounts;
}

type ContaReceberStatusInput = {
  status: ContaReceberStatus;
  data_vencimento: string;
  valor_recebido?: number;
};

export function canEditContaReceber(conta: ContaReceberStatusInput): boolean {
  const status = resolveStatusExibicao(conta);
  return status === "aberto" || status === "vencido";
}

export function canEditDescritivoContaReceber(
  conta: ContaReceberStatusInput,
): boolean {
  return conta.status === "recebido";
}

/** Permite corrigir classificação contábil (inclui títulos já recebidos). */
export function canEditClassificacaoContaReceber(
  conta: ContaReceberStatusInput,
): boolean {
  return conta.status !== "cancelado";
}

export function canReceberContaReceber(conta: ContaReceberStatusInput): boolean {
  const status = resolveStatusExibicao(conta);
  return status === "aberto" || status === "vencido";
}

export function canCancelarContaReceber(conta: ContaReceberStatusInput): boolean {
  const status = resolveStatusExibicao(conta);
  if (Number(conta.valor_recebido ?? 0) > 0) return false;
  return status === "aberto" || status === "vencido";
}

export function canSoftDeleteContaReceber(
  conta: ContaReceberStatusInput,
): boolean {
  if (Number(conta.valor_recebido ?? 0) > 0) return false;
  if (conta.status === "recebido") return false;
  const status = resolveStatusExibicao(conta);
  return (
    status === "aberto" ||
    status === "vencido" ||
    conta.status === "cancelado"
  );
}

export function canEstornarContaReceber(
  conta: ContaReceberStatusInput,
): boolean {
  if (conta.status === "cancelado") return false;
  return (
    Number(conta.valor_recebido ?? 0) > 0 || conta.status === "recebido"
  );
}

export function canDuplicarContaReceber(): boolean {
  return true;
}

export function formatContaReceberNumero(numero: number): string {
  return `#${String(numero).padStart(6, "0")}`;
}
