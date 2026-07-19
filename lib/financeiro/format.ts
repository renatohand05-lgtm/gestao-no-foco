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

export { formatCurrency, formatDateOnly } from "@/lib/format";
export { formatDateTime as formatFinanceiroDate } from "@/lib/format";
/** Taxa financeira (2–4 casas) — não usar `formatPercent` do Dashboard/Produtos. */
export { formatPercentTaxa as formatPercent } from "@/lib/format";

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
