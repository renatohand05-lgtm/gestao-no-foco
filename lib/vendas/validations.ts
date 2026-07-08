import { z } from "zod";

import {
  VENDA_FORMA_PAGAMENTO_OPTIONS,
  VENDA_STATUS_EDITAVEIS,
} from "@/lib/vendas/constants";

const optionalText = z.string().trim().optional().or(z.literal(""));

const formasPagamento = VENDA_FORMA_PAGAMENTO_OPTIONS.map((option) => option.value);
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
    forma_pagamento: optionalText,
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

    if (
      data.forma_pagamento &&
      !formasPagamento.includes(
        data.forma_pagamento as (typeof formasPagamento)[number],
      )
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Forma de pagamento inválida.",
        path: ["forma_pagamento"],
      });
    }
  });

export type VendaItemFormInput = z.input<typeof vendaItemFormSchema>;
export type VendaItemFormValues = z.output<typeof vendaItemFormSchema>;
export type VendaFormInput = z.input<typeof vendaFormSchema>;
export type VendaFormValues = z.output<typeof vendaFormSchema>;
