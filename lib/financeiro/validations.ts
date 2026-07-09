import { z } from "zod";

import {
  CATEGORIA_FINANCEIRA_TIPO_OPTIONS,
  CONTA_BANCARIA_TIPO_OPTIONS,
  FORMA_PAGAMENTO_TIPO_OPTIONS,
  PLANO_CONTA_NATUREZA_OPTIONS,
  PLANO_CONTA_TIPO_OPTIONS,
} from "@/lib/financeiro/constants";

const optionalText = z.string().trim().optional().or(z.literal(""));

const nullableNumber = z.union([z.number(), z.null()]).default(null);

const planoContaTipos = PLANO_CONTA_TIPO_OPTIONS.map((o) => o.value) as [
  "receita",
  "despesa",
  "ativo",
  "passivo",
  "patrimonio",
];

const planoContaNaturezas = PLANO_CONTA_NATUREZA_OPTIONS.map((o) => o.value) as [
  "sintetica",
  "analitica",
];

const contaBancariaTipos = CONTA_BANCARIA_TIPO_OPTIONS.map((o) => o.value) as [
  "corrente",
  "poupanca",
  "investimento",
  "caixa",
  "outros",
];

const formaPagamentoTipos = FORMA_PAGAMENTO_TIPO_OPTIONS.map((o) => o.value) as [
  "dinheiro",
  "pix",
  "cartao_credito",
  "cartao_debito",
  "boleto",
  "transferencia",
  "cheque",
  "outros",
];

const categoriaTipos = CATEGORIA_FINANCEIRA_TIPO_OPTIONS.map((o) => o.value) as [
  "receita",
  "despesa",
  "ambos",
];

const optionalUuid = z.union([z.string().uuid(), z.literal("")]).default("");

export const planoContaFormSchema = z.object({
  codigo: z.string().trim().min(1, "Informe o código da conta."),
  nome: z.string().trim().min(2, "Informe o nome da conta."),
  tipo: z.enum(planoContaTipos),
  natureza: z.enum(planoContaNaturezas),
  conta_pai_id: optionalUuid,
  aceita_lancamento: z.boolean(),
  ordem: z.number().int().min(0).default(0),
  observacoes: optionalText,
  ativo: z.boolean(),
});

export const centroCustoFormSchema = z.object({
  codigo: z.string().trim().min(1, "Informe o código do centro."),
  nome: z.string().trim().min(2, "Informe o nome do centro de custo."),
  descricao: optionalText,
  responsavel: optionalText,
  observacoes: optionalText,
  ativo: z.boolean(),
});

export const contaBancariaFormSchema = z
  .object({
    nome: z.string().trim().min(2, "Informe o nome da conta."),
    tipo: z.enum(contaBancariaTipos),
    banco: optionalText,
    agencia: optionalText,
    conta: optionalText,
    titular: optionalText,
    saldo_inicial: z.number().default(0),
    observacoes: optionalText,
    ativo: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (Number.isNaN(data.saldo_inicial)) {
      ctx.addIssue({
        code: "custom",
        message: "Informe um saldo inicial válido.",
        path: ["saldo_inicial"],
      });
    }
  });

export const formaPagamentoFormSchema = z
  .object({
    nome: z.string().trim().min(2, "Informe o nome da forma de pagamento."),
    tipo: z.enum(formaPagamentoTipos),
    gera_financeiro: z.boolean(),
    dias_compensacao: z
      .number()
      .int()
      .min(0, "Dias de compensação não pode ser negativo.")
      .default(0),
    taxa_percent: nullableNumber,
    observacoes: optionalText,
    ativo: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (
      data.taxa_percent !== null &&
      data.taxa_percent !== undefined &&
      data.taxa_percent < 0
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Taxa não pode ser negativa.",
        path: ["taxa_percent"],
      });
    }
  });

export const categoriaFinanceiraFormSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da categoria."),
  tipo: z.enum(categoriaTipos),
  plano_conta_id: optionalUuid,
  cor: optionalText,
  observacoes: optionalText,
  ativo: z.boolean(),
});

export type PlanoContaFormInput = z.input<typeof planoContaFormSchema>;
export type PlanoContaFormValues = z.output<typeof planoContaFormSchema>;

export type CentroCustoFormInput = z.input<typeof centroCustoFormSchema>;
export type CentroCustoFormValues = z.output<typeof centroCustoFormSchema>;

export type ContaBancariaFormInput = z.input<typeof contaBancariaFormSchema>;
export type ContaBancariaFormValues = z.output<typeof contaBancariaFormSchema>;

export type FormaPagamentoFormInput = z.input<typeof formaPagamentoFormSchema>;
export type FormaPagamentoFormValues = z.output<typeof formaPagamentoFormSchema>;

export type CategoriaFinanceiraFormInput = z.input<
  typeof categoriaFinanceiraFormSchema
>;
export type CategoriaFinanceiraFormValues = z.output<
  typeof categoriaFinanceiraFormSchema
>;

const dateField = z
  .string()
  .trim()
  .min(1, "Informe a data.")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.");

export const contaReceberFormSchema = z
  .object({
    cliente_id: z.string().uuid("Selecione um cliente."),
    venda_id: optionalUuid,
    forma_pagamento_id: optionalUuid,
    categoria_financeira_id: optionalUuid,
    centro_custo_id: optionalUuid,
    descricao: z.string().trim().min(2, "Informe a descrição do título."),
    valor_original: z.number().min(0.01, "Informe o valor original."),
    desconto: z.number().min(0).default(0),
    juros: z.number().min(0).default(0),
    multa: z.number().min(0).default(0),
    data_emissao: dateField,
    data_vencimento: dateField,
    parcelas: z.number().int().min(1).max(48).default(1),
    observacoes: optionalText,
  })
  .superRefine((data, ctx) => {
    if (data.data_vencimento < data.data_emissao) {
      ctx.addIssue({
        code: "custom",
        message: "Vencimento não pode ser anterior à emissão.",
        path: ["data_vencimento"],
      });
    }
  });

export const receberContaFormSchema = z.object({
  data_recebimento: dateField,
  valor_recebido: z.number().min(0).optional(),
  desconto: z.number().min(0).optional(),
  juros: z.number().min(0).optional(),
  multa: z.number().min(0).optional(),
});

export type ContaReceberFormInput = z.input<typeof contaReceberFormSchema>;
export type ContaReceberFormValues = z.output<typeof contaReceberFormSchema>;
export type ReceberContaFormInput = z.input<typeof receberContaFormSchema>;
export type ReceberContaFormValues = z.output<typeof receberContaFormSchema>;

export const contaPagarFormSchema = z
  .object({
    fornecedor_id: optionalUuid,
    fornecedor_nome: optionalText,
    forma_pagamento_id: optionalUuid,
    categoria_financeira_id: optionalUuid,
    centro_custo_id: optionalUuid,
    plano_conta_id: optionalUuid,
    descricao: z.string().trim().min(2, "Informe a descrição do título."),
    valor_original: z.number().min(0.01, "Informe o valor original."),
    desconto: z.number().min(0).default(0),
    juros: z.number().min(0).default(0),
    multa: z.number().min(0).default(0),
    data_emissao: dateField,
    data_competencia: dateField,
    data_vencimento: dateField,
    parcelas: z.number().int().min(1).max(48).default(1),
    observacoes: optionalText,
  })
  .superRefine((data, ctx) => {
    if (data.data_vencimento < data.data_emissao) {
      ctx.addIssue({
        code: "custom",
        message: "Vencimento não pode ser anterior à emissão.",
        path: ["data_vencimento"],
      });
    }
  });

export const pagarContaFormSchema = z.object({
  data_pagamento: dateField,
  valor_pagamento: z.number().min(0.01).optional(),
  desconto: z.number().min(0).optional(),
  juros: z.number().min(0).optional(),
  multa: z.number().min(0).optional(),
  forma_pagamento_id: optionalUuid,
  conta_bancaria_id: optionalUuid,
});

export type ContaPagarFormInput = z.input<typeof contaPagarFormSchema>;
export type ContaPagarFormValues = z.output<typeof contaPagarFormSchema>;
export type PagarContaFormInput = z.input<typeof pagarContaFormSchema>;
export type PagarContaFormValues = z.output<typeof pagarContaFormSchema>;

const movimentacaoBancariaTiposManuais = ["entrada", "saida", "ajuste"] as const;

export const movimentacaoBancariaFormSchema = z
  .object({
    conta_bancaria_id: z.string().uuid("Selecione uma conta bancária."),
    tipo: z.enum(movimentacaoBancariaTiposManuais),
    valor: z.number().min(0, "Informe um valor válido."),
    data_movimentacao: dateField,
    descricao: z.string().trim().min(2, "Informe a descrição."),
    observacoes: optionalText,
  })
  .superRefine((data, ctx) => {
    if (data.tipo !== "ajuste" && data.valor <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "Informe um valor maior que zero.",
        path: ["valor"],
      });
    }
  });

export const transferenciaBancariaFormSchema = z
  .object({
    conta_origem_id: z.string().uuid("Selecione a conta de origem."),
    conta_destino_id: z.string().uuid("Selecione a conta de destino."),
    valor: z.number().min(0.01, "Informe um valor maior que zero."),
    data_movimentacao: dateField,
    descricao: z.string().trim().min(2, "Informe a descrição."),
    observacoes: optionalText,
  })
  .superRefine((data, ctx) => {
    if (data.conta_origem_id === data.conta_destino_id) {
      ctx.addIssue({
        code: "custom",
        message: "Selecione contas diferentes.",
        path: ["conta_destino_id"],
      });
    }
  });

export const estornarMovimentacaoBancariaFormSchema = z.object({
  data_movimentacao: dateField,
  observacoes: optionalText,
});

export type MovimentacaoBancariaFormInput = z.input<
  typeof movimentacaoBancariaFormSchema
>;
export type MovimentacaoBancariaFormValues = z.output<
  typeof movimentacaoBancariaFormSchema
>;
export type TransferenciaBancariaFormInput = z.input<
  typeof transferenciaBancariaFormSchema
>;
export type TransferenciaBancariaFormValues = z.output<
  typeof transferenciaBancariaFormSchema
>;
export type EstornarMovimentacaoBancariaFormInput = z.input<
  typeof estornarMovimentacaoBancariaFormSchema
>;
export type EstornarMovimentacaoBancariaFormValues = z.output<
  typeof estornarMovimentacaoBancariaFormSchema
>;
