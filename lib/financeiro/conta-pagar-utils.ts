import type {
  ContaPagarStatus,
  ContaPagarStatusPersistido,
} from "@/types/contas-pagar";

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
  return conta.valor_original - conta.desconto + conta.juros + conta.multa;
}

export function calcSaldoPendente(conta: {
  valor_original: number;
  desconto: number;
  juros: number;
  multa: number;
  valor_pago: number;
}): number {
  return Math.max(calcValorLiquido(conta) - conta.valor_pago, 0);
}

export function resolveStatusExibicao(conta: {
  status: ContaPagarStatusPersistido;
  data_vencimento: string;
}): ContaPagarStatus {
  if (conta.status === "parcial") {
    return "parcial";
  }

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
    amounts[amounts.length - 1] = (baseCents + remainder) / 100;
  }

  return amounts;
}

type ContaPagarStatusInput = {
  status: ContaPagarStatusPersistido;
  data_vencimento: string;
};

export function canEditContaPagar(conta: ContaPagarStatusInput): boolean {
  const status = resolveStatusExibicao(conta);
  return status === "aberto" || status === "vencido" || status === "parcial";
}

export function canPagarContaPagar(conta: ContaPagarStatusInput): boolean {
  const status = resolveStatusExibicao(conta);
  return status === "aberto" || status === "vencido" || status === "parcial";
}

export function canCancelarContaPagar(conta: ContaPagarStatusInput): boolean {
  const status = resolveStatusExibicao(conta);
  return status === "aberto" || status === "vencido" || status === "parcial";
}

export function formatContaPagarNumero(numero: number): string {
  return `#${String(numero).padStart(6, "0")}`;
}

export function resolveFornecedorNome(conta: {
  fornecedor?: { nome: string } | null;
  fornecedor_nome: string | null;
}): string {
  return conta.fornecedor?.nome ?? conta.fornecedor_nome ?? "—";
}
