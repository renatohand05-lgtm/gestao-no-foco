import { z } from "zod";

import { VENDA_STATUS_EDITAVEIS } from "@/lib/vendas/constants";

const optionalText = z.string().trim().optional().or(z.literal(""));
const optionalUuid = z.union([z.string().uuid(), z.literal("")]).default("");

const statusEditaveis = [...VENDA_STATUS_EDITAVEIS] as [
  "orcamento",
  "em_andamento",
];

export const vendaItemFormSchema = z.object({
  produto_id: z.string().uuid("Selecione um produto ou serviço."),
  quantidade: z
    .number({ error: "Informe a quantidade." })
    .positive("Quantidade deve ser maior que zero."),
  preco_unitario: z
    .number({ error: "Informe o preço unitário." })
    .min(0, "Preço não pode ser negativo."),
  desconto: z
    .number()
    .min(0, "Desconto não pode ser negativo.")
    .default(0),
});

export const vendaFormSchema = z
  .object({
    cliente_id: z.string().uuid("Selecione um cliente."),
    data_venda: z.string().min(1, "Informe a data da venda."),
    status: z.enum(statusEditaveis).default("orcamento"),
    desconto_total: z
      .number()
      .min(0, "Desconto total não pode ser negativo.")
      .default(0),
    forma_pagamento_id: optionalUuid,
    quantidade_parcelas: z
      .number()
      .int()
      .min(1, "Informe ao menos 1 parcela.")
      .max(48, "Máximo de 48 parcelas.")
      .default(1),
    categoria_financeira_id: optionalUuid,
    centro_custo_id: optionalUuid,
    observacoes: optionalText,
    itens: z
      .array(vendaItemFormSchema)
      .min(1, "Adicione pelo menos um item à venda."),
  })
  .superRefine((data, ctx) => {
    const subtotal = data.itens.reduce(
      (sum, item) =>
        sum + item.quantidade * item.preco_unitario - (item.desconto ?? 0),
      0,
    );

    if (data.desconto_total > subtotal) {
      ctx.addIssue({
        code: "custom",
        message: "Desconto total não pode ser maior que o subtotal.",
        path: ["desconto_total"],
      });
    }
  });

export type VendaItemFormInput = z.input<typeof vendaItemFormSchema>;
export type VendaItemFormValues = z.output<typeof vendaItemFormSchema>;
export type VendaFormInput = z.input<typeof vendaFormSchema>;
export type VendaFormValues = z.output<typeof vendaFormSchema>;
