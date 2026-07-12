import {
  CATEGORIA_FINANCEIRA_TIPO_OPTIONS,
  CONTA_PAGAR_STATUS_OPTIONS,
  CONTA_RECEBER_STATUS_OPTIONS,
  CONTA_BANCARIA_TIPO_OPTIONS,
  FORMA_PAGAMENTO_TIPO_OPTIONS,
  MOVIMENTACAO_BANCARIA_ORIGEM_OPTIONS,
  MOVIMENTACAO_BANCARIA_TIPO_OPTIONS,
  PLANO_CONTA_NATUREZA_OPTIONS,
  PLANO_CONTA_TIPO_OPTIONS,
} from "@/lib/financeiro/constants";
import type { ContaPagarStatus } from "@/types/contas-pagar";
import type { ContaReceberStatus } from "@/types/contas-receber";
import type {
  MovimentacaoBancariaOrigem,
  MovimentacaoBancariaTipo,
} from "@/types/movimentacoes-bancarias";
import type {
  CategoriaFinanceiraTipo,
  ContaBancariaTipo,
  FormaPagamentoTipo,
  PlanoContaNatureza,
  PlanoContaTipo,
} from "@/types/financeiro";

export function formatFinanceiroDate(date: string) {
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

export function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value / 100);
}

export function getPlanoContaTipoLabel(tipo: PlanoContaTipo) {
  return (
    PLANO_CONTA_TIPO_OPTIONS.find((option) => option.value === tipo)?.label ??
    tipo
  );
}

export function getPlanoContaNaturezaLabel(natureza: PlanoContaNatureza) {
  return (
    PLANO_CONTA_NATUREZA_OPTIONS.find((option) => option.value === natureza)
      ?.label ?? natureza
  );
}

export function getContaBancariaTipoLabel(tipo: ContaBancariaTipo) {
  return (
    CONTA_BANCARIA_TIPO_OPTIONS.find((option) => option.value === tipo)
      ?.label ?? tipo
  );
}

export function getFormaPagamentoTipoLabel(tipo: FormaPagamentoTipo) {
  return (
    FORMA_PAGAMENTO_TIPO_OPTIONS.find((option) => option.value === tipo)
      ?.label ?? tipo
  );
}

export function getCategoriaFinanceiraTipoLabel(tipo: CategoriaFinanceiraTipo) {
  return (
    CATEGORIA_FINANCEIRA_TIPO_OPTIONS.find((option) => option.value === tipo)
      ?.label ?? tipo
  );
}

export function formatDateOnly(date: string | null | undefined) {
  if (!date) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(`${date}T12:00:00`));
}

export function getContaReceberStatusLabel(status: ContaReceberStatus) {
  return (
    CONTA_RECEBER_STATUS_OPTIONS.find((option) => option.value === status)
      ?.label ?? status
  );
}

export function getContaPagarStatusLabel(status: ContaPagarStatus) {
  return (
    CONTA_PAGAR_STATUS_OPTIONS.find((option) => option.value === status)
      ?.label ?? status
  );
}

export function getMovimentacaoBancariaTipoLabel(tipo: MovimentacaoBancariaTipo) {
  return (
    MOVIMENTACAO_BANCARIA_TIPO_OPTIONS.find((option) => option.value === tipo)
      ?.label ?? tipo
  );
}

export function getMovimentacaoBancariaOrigemLabel(
  origem: MovimentacaoBancariaOrigem,
) {
  return (
    MOVIMENTACAO_BANCARIA_ORIGEM_OPTIONS.find((option) => option.value === origem)
      ?.label ?? origem
  );
}
