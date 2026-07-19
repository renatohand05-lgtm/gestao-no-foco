import type {
  CategoriaFinanceiraFormValues,
  CentroCustoFormValues,
  ContaBancariaFormValues,
  ContaPagarFormValues,
  ContaReceberFormValues,
  FormaPagamentoFormValues,
  MovimentacaoBancariaFormValues,
  PagarContaFormValues,
  PlanoContaFormValues,
  ReceberContaFormValues,
  TransferenciaBancariaFormValues,
  EstornarMovimentacaoBancariaFormValues,
} from "@/lib/financeiro/validations";
import type {
  CreateContaPagarInput,
  PagarContaInput,
} from "@/types/contas-pagar";
import type { ContaPagarDetail } from "@/types/contas-pagar";
import type {
  CreateMovimentacaoBancariaInput,
  CreateTransferenciaBancariaInput,
  EstornarMovimentacaoBancariaInput,
} from "@/types/movimentacoes-bancarias";
import type {
  CreateContaReceberInput,
  ReceberContaInput,
} from "@/types/contas-receber";
import type { ContaReceberDetail } from "@/types/contas-receber";
import type {
  CategoriaFinanceira,
  CentroCusto,
  ContaBancaria,
  CreateCategoriaFinanceiraInput,
  CreateCentroCustoInput,
  CreateContaBancariaInput,
  CreateFormaPagamentoInput,
  CreatePlanoContaInput,
  FormaPagamento,
  PlanoConta,
} from "@/types/financeiro";

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function normalizePlanoContaFormValues(
  values: PlanoContaFormValues,
): CreatePlanoContaInput {
  return {
    codigo: values.codigo.trim(),
    nome: values.nome.trim(),
    tipo: values.tipo,
    natureza: values.natureza,
    conta_pai_id: emptyToNull(values.conta_pai_id),
    aceita_lancamento: values.aceita_lancamento,
    ordem: values.ordem ?? 0,
    observacoes: emptyToNull(values.observacoes),
    dre_linha: emptyToNull(values.dre_linha),
    dre_detalhe: emptyToNull(values.dre_detalhe),
    dre_classificacao_origem: emptyToNull(values.dre_linha)
      ? "manual"
      : null,
    ativo: values.ativo,
  };
}

export function planoContaToFormValues(item: PlanoConta): PlanoContaFormValues {
  return {
    codigo: item.codigo,
    nome: item.nome,
    tipo: item.tipo,
    natureza: item.natureza,
    conta_pai_id: item.conta_pai_id ?? "",
    aceita_lancamento: item.aceita_lancamento,
    ordem: item.ordem,
    observacoes: item.observacoes ?? "",
    dre_linha: item.dre_linha ?? "",
    dre_detalhe: item.dre_detalhe ?? "",
    ativo: item.ativo,
  };
}

export function buildPlanoContaPayload(input: CreatePlanoContaInput) {
  return {
    codigo: input.codigo,
    nome: input.nome,
    tipo: input.tipo,
    natureza: input.natureza,
    conta_pai_id: input.conta_pai_id ?? null,
    aceita_lancamento: input.aceita_lancamento,
    ordem: input.ordem ?? 0,
    observacoes: input.observacoes ?? null,
    dre_linha: input.dre_linha ?? null,
    dre_detalhe: input.dre_detalhe ?? null,
    dre_classificacao_origem: input.dre_linha
      ? (input.dre_classificacao_origem ?? "manual")
      : null,
    dre_classificacao_em: input.dre_linha
      ? new Date().toISOString()
      : null,
    ativo: input.ativo,
  };
}

export function normalizeCentroCustoFormValues(
  values: CentroCustoFormValues,
): CreateCentroCustoInput {
  return {
    codigo: values.codigo.trim(),
    nome: values.nome.trim(),
    descricao: emptyToNull(values.descricao),
    responsavel: emptyToNull(values.responsavel),
    observacoes: emptyToNull(values.observacoes),
    ativo: values.ativo,
  };
}

export function centroCustoToFormValues(
  item: CentroCusto,
): CentroCustoFormValues {
  return {
    codigo: item.codigo,
    nome: item.nome,
    descricao: item.descricao ?? "",
    responsavel: item.responsavel ?? "",
    observacoes: item.observacoes ?? "",
    ativo: item.ativo,
  };
}

export function buildCentroCustoPayload(input: CreateCentroCustoInput) {
  return {
    codigo: input.codigo,
    nome: input.nome,
    descricao: input.descricao ?? null,
    responsavel: input.responsavel ?? null,
    observacoes: input.observacoes ?? null,
    ativo: input.ativo,
  };
}

export function normalizeContaBancariaFormValues(
  values: ContaBancariaFormValues,
): CreateContaBancariaInput {
  return {
    nome: values.nome.trim(),
    tipo: values.tipo,
    banco: emptyToNull(values.banco),
    agencia: emptyToNull(values.agencia),
    conta: emptyToNull(values.conta),
    titular: emptyToNull(values.titular),
    saldo_inicial: values.saldo_inicial ?? 0,
    observacoes: emptyToNull(values.observacoes),
    ativo: values.ativo,
  };
}

export function contaBancariaToFormValues(
  item: ContaBancaria,
): ContaBancariaFormValues {
  return {
    nome: item.nome,
    tipo: item.tipo,
    banco: item.banco ?? "",
    agencia: item.agencia ?? "",
    conta: item.conta ?? "",
    titular: item.titular ?? "",
    saldo_inicial: item.saldo_inicial,
    observacoes: item.observacoes ?? "",
    ativo: item.ativo,
  };
}

export function buildContaBancariaPayload(input: CreateContaBancariaInput) {
  return {
    nome: input.nome,
    tipo: input.tipo,
    banco: input.banco ?? null,
    agencia: input.agencia ?? null,
    conta: input.conta ?? null,
    titular: input.titular ?? null,
    saldo_inicial: input.saldo_inicial ?? 0,
    observacoes: input.observacoes ?? null,
    ativo: input.ativo,
  };
}

export function normalizeFormaPagamentoFormValues(
  values: FormaPagamentoFormValues,
): CreateFormaPagamentoInput {
  return {
    nome: values.nome.trim(),
    tipo: values.tipo,
    gera_financeiro: values.gera_financeiro,
    dias_compensacao: values.dias_compensacao ?? 0,
    taxa_percent: values.taxa_percent ?? null,
    observacoes: emptyToNull(values.observacoes),
    ativo: values.ativo,
  };
}

export function formaPagamentoToFormValues(
  item: FormaPagamento,
): FormaPagamentoFormValues {
  return {
    nome: item.nome,
    tipo: item.tipo,
    gera_financeiro: item.gera_financeiro,
    dias_compensacao: item.dias_compensacao,
    taxa_percent: item.taxa_percent,
    observacoes: item.observacoes ?? "",
    ativo: item.ativo,
  };
}

export function buildFormaPagamentoPayload(input: CreateFormaPagamentoInput) {
  return {
    nome: input.nome,
    tipo: input.tipo,
    gera_financeiro: input.gera_financeiro,
    dias_compensacao: input.dias_compensacao ?? 0,
    taxa_percent: input.taxa_percent ?? null,
    observacoes: input.observacoes ?? null,
    ativo: input.ativo,
  };
}

export function normalizeCategoriaFinanceiraFormValues(
  values: CategoriaFinanceiraFormValues,
): CreateCategoriaFinanceiraInput {
  return {
    nome: values.nome.trim(),
    tipo: values.tipo,
    plano_conta_id: emptyToNull(values.plano_conta_id),
    dre_linha: emptyToNull(values.dre_linha),
    dre_detalhe: emptyToNull(values.dre_detalhe),
    dre_classificacao_origem: emptyToNull(values.dre_linha)
      ? "manual"
      : null,
    cor: emptyToNull(values.cor),
    observacoes: emptyToNull(values.observacoes),
    ativo: values.ativo,
  };
}

export function categoriaFinanceiraToFormValues(
  item: CategoriaFinanceira,
): CategoriaFinanceiraFormValues {
  return {
    nome: item.nome,
    tipo: item.tipo,
    plano_conta_id: item.plano_conta_id ?? "",
    dre_linha: item.dre_linha ?? "",
    dre_detalhe: item.dre_detalhe ?? "",
    cor: item.cor ?? "",
    observacoes: item.observacoes ?? "",
    ativo: item.ativo,
  };
}

export function buildCategoriaFinanceiraPayload(
  input: CreateCategoriaFinanceiraInput,
) {
  return {
    nome: input.nome,
    tipo: input.tipo,
    plano_conta_id: input.plano_conta_id ?? null,
    dre_linha: input.dre_linha ?? null,
    dre_detalhe: input.dre_detalhe ?? null,
    dre_classificacao_origem: input.dre_linha
      ? (input.dre_classificacao_origem ?? "manual")
      : null,
    dre_classificacao_em: input.dre_linha
      ? new Date().toISOString()
      : null,
    cor: input.cor ?? null,
    observacoes: input.observacoes ?? null,
    ativo: input.ativo,
  };
}

export function normalizeContaReceberFormValues(
  values: ContaReceberFormValues,
): CreateContaReceberInput {
  return {
    cliente_id: values.cliente_id,
    venda_id: emptyToNull(values.venda_id),
    forma_pagamento_id: emptyToNull(values.forma_pagamento_id),
    categoria_financeira_id: values.categoria_financeira_id,
    centro_custo_id: values.centro_custo_id,
    plano_conta_id: values.plano_conta_id,
    descricao: values.descricao.trim(),
    valor_original: values.valor_original,
    desconto: values.desconto ?? 0,
    juros: values.juros ?? 0,
    multa: values.multa ?? 0,
    data_emissao: values.data_emissao,
    data_competencia: values.data_competencia,
    data_vencimento: values.data_vencimento,
    parcelas: values.parcelas ?? 1,
    observacoes: emptyToNull(values.observacoes),
  };
}

export function contaReceberToFormValues(
  item: ContaReceberDetail,
): ContaReceberFormValues {
  return {
    cliente_id: item.cliente_id,
    venda_id: item.venda_id ?? "",
    forma_pagamento_id: item.forma_pagamento_id ?? "",
    categoria_financeira_id: item.categoria_financeira_id ?? "",
    centro_custo_id: item.centro_custo_id ?? "",
    plano_conta_id: item.plano_conta_id ?? "",
    descricao: item.descricao,
    valor_original: item.valor_original,
    desconto: item.desconto,
    juros: item.juros,
    multa: item.multa,
    data_emissao: item.data_emissao,
    data_competencia: item.data_competencia ?? item.data_emissao,
    data_vencimento: item.data_vencimento,
    parcelas: item.parcela_total,
    observacoes: item.observacoes ?? "",
  };
}

export function buildContaReceberPayload(input: CreateContaReceberInput) {
  return {
    cliente_id: input.cliente_id,
    venda_id: input.venda_id ?? null,
    forma_pagamento_id: input.forma_pagamento_id ?? null,
    categoria_financeira_id: input.categoria_financeira_id,
    centro_custo_id: input.centro_custo_id,
    plano_conta_id: input.plano_conta_id,
    descricao: input.descricao,
    valor_original: input.valor_original,
    desconto: input.desconto ?? 0,
    juros: input.juros ?? 0,
    multa: input.multa ?? 0,
    data_emissao: input.data_emissao,
    data_competencia: input.data_competencia,
    data_vencimento: input.data_vencimento,
    observacoes: input.observacoes ?? null,
  };
}

export function normalizeReceberContaFormValues(
  values: ReceberContaFormValues,
): ReceberContaInput {
  return {
    data_recebimento: values.data_recebimento,
    valor_recebido: values.valor_recebido,
    desconto: values.desconto,
    juros: values.juros,
    multa: values.multa,
    conta_bancaria_id: values.conta_bancaria_id,
  };
}

export function normalizeContaPagarFormValues(
  values: ContaPagarFormValues,
): CreateContaPagarInput {
  return {
    fornecedor_id: emptyToNull(values.fornecedor_id),
    fornecedor_nome: emptyToNull(values.fornecedor_nome),
    forma_pagamento_id: emptyToNull(values.forma_pagamento_id),
    categoria_financeira_id: values.categoria_financeira_id,
    centro_custo_id: values.centro_custo_id,
    plano_conta_id: values.plano_conta_id,
    descricao: values.descricao.trim(),
    valor_original: values.valor_original,
    desconto: values.desconto ?? 0,
    juros: values.juros ?? 0,
    multa: values.multa ?? 0,
    data_emissao: values.data_emissao,
    data_competencia: values.data_competencia,
    data_vencimento: values.data_vencimento,
    parcelas: values.parcelas ?? 1,
    observacoes: emptyToNull(values.observacoes),
    rateios: (values.rateios ?? [])
      .filter((line) => line.centro_custo_id)
      .map((line) => ({
        centro_custo_id: line.centro_custo_id,
        percentual: line.percentual,
        descricao: emptyToNull(line.descricao),
      })),
  };
}

export function contaPagarToFormValues(
  item: ContaPagarDetail,
): ContaPagarFormValues {
  return {
    fornecedor_id: item.fornecedor_id ?? "",
    fornecedor_nome: item.fornecedor_nome ?? "",
    forma_pagamento_id: item.forma_pagamento_id ?? "",
    categoria_financeira_id: item.categoria_financeira_id ?? "",
    centro_custo_id: item.centro_custo_id ?? "",
    plano_conta_id: item.plano_conta_id ?? "",
    descricao: item.descricao,
    valor_original: item.valor_original,
    desconto: item.desconto,
    juros: item.juros,
    multa: item.multa,
    data_emissao: item.data_emissao,
    data_competencia: item.data_competencia,
    data_vencimento: item.data_vencimento,
    parcelas: item.parcela_total,
    observacoes: item.observacoes ?? "",
    rateios: (item.rateios ?? []).map((line) => ({
      centro_custo_id: line.centro_custo_id,
      percentual: line.percentual,
      descricao: line.descricao ?? "",
    })),
  };
}

export function buildContaPagarPayload(input: CreateContaPagarInput) {
  return {
    fornecedor_id: input.fornecedor_id ?? null,
    fornecedor_nome: input.fornecedor_nome ?? null,
    forma_pagamento_id: input.forma_pagamento_id ?? null,
    categoria_financeira_id: input.categoria_financeira_id,
    centro_custo_id: input.centro_custo_id,
    plano_conta_id: input.plano_conta_id,
    descricao: input.descricao,
    valor_original: input.valor_original,
    desconto: input.desconto ?? 0,
    juros: input.juros ?? 0,
    multa: input.multa ?? 0,
    data_emissao: input.data_emissao,
    data_competencia: input.data_competencia,
    data_vencimento: input.data_vencimento,
    observacoes: input.observacoes ?? null,
  };
}

export function normalizePagarContaFormValues(
  values: PagarContaFormValues,
): PagarContaInput {
  return {
    data_pagamento: values.data_pagamento,
    valor_pagamento: values.valor_pagamento,
    desconto: values.desconto,
    juros: values.juros,
    multa: values.multa,
    forma_pagamento_id: emptyToNull(values.forma_pagamento_id),
    conta_bancaria_id: emptyToNull(values.conta_bancaria_id),
  };
}

export function normalizeMovimentacaoBancariaFormValues(
  values: MovimentacaoBancariaFormValues,
): CreateMovimentacaoBancariaInput {
  return {
    conta_bancaria_id: values.conta_bancaria_id,
    tipo: values.tipo,
    valor: values.valor,
    data_movimentacao: values.data_movimentacao,
    descricao: values.descricao.trim(),
    observacoes: emptyToNull(values.observacoes),
    origem: "manual",
  };
}

export function buildMovimentacaoBancariaPayload(
  input: CreateMovimentacaoBancariaInput,
) {
  return {
    conta_bancaria_id: input.conta_bancaria_id,
    tipo: input.tipo,
    valor: input.valor,
    data_movimentacao: input.data_movimentacao,
    descricao: input.descricao,
    conta_pagar_id: input.conta_pagar_id ?? null,
    conta_receber_id: input.conta_receber_id ?? null,
    observacoes: input.observacoes ?? null,
  };
}

export function normalizeTransferenciaBancariaFormValues(
  values: TransferenciaBancariaFormValues,
): CreateTransferenciaBancariaInput {
  return {
    conta_origem_id: values.conta_origem_id,
    conta_destino_id: values.conta_destino_id,
    valor: values.valor,
    data_movimentacao: values.data_movimentacao,
    descricao: values.descricao.trim(),
    observacoes: emptyToNull(values.observacoes),
  };
}

export function buildTransferenciaBancariaPayload(
  input: CreateTransferenciaBancariaInput,
) {
  return {
    data_movimentacao: input.data_movimentacao,
    descricao: input.descricao,
    observacoes: input.observacoes ?? null,
  };
}

export function normalizeEstornarMovimentacaoBancariaFormValues(
  values: EstornarMovimentacaoBancariaFormValues,
): EstornarMovimentacaoBancariaInput {
  return {
    data_movimentacao: values.data_movimentacao,
    observacoes: emptyToNull(values.observacoes),
  };
}
