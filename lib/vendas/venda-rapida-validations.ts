import { z } from "zod";

import { DESCONTO_TIPOS } from "@/lib/permissoes/constants";

export const vendaRapidaItemSchema = z.object({
  produto_id: z.string().uuid("Selecione o produto."),
  quantidade: z.coerce.number().positive("Quantidade inválida."),
  preco_unitario: z.coerce.number().min(0, "Preço inválido."),
  desconto: z.coerce.number().min(0).default(0),
});

export const vendaRapidaFormSchema = z
  .object({
    modo_cliente: z.enum(["nao_identificado", "existente", "rapido"]),
    cliente_id: z.union([z.string().uuid(), z.literal("")]).optional(),
    cliente_rapido: z
      .object({
        nome: z.string().min(1),
        telefone: z.string().optional().nullable(),
        documento: z.string().optional().nullable(),
      })
      .optional(),
    itens: z.array(vendaRapidaItemSchema).min(1, "Adicione ao menos um produto."),
    desconto_total: z.coerce.number().min(0).default(0),
    desconto_percentual: z.coerce.number().min(0).max(100).default(0),
    desconto_motivo: z.string().optional().nullable(),
    desconto_tipo: z.enum(DESCONTO_TIPOS).optional().nullable(),
    forma_pagamento_id: z.string().uuid("Selecione a forma de pagamento."),
    conta_bancaria_id: z.union([z.string().uuid(), z.literal("")]).optional(),
    receber_agora: z.boolean().default(true),
    observacoes: z.string().optional().nullable(),
    force_create_cliente: z.boolean().default(false),
    pagamentos: z
      .array(
        z.object({
          forma_pagamento_id: z.string().uuid(),
          valor: z.coerce.number().positive(),
          quantidade_parcelas: z.coerce.number().int().min(1).max(48).default(1),
        }),
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.modo_cliente === "existente" && !data.cliente_id) {
      ctx.addIssue({
        code: "custom",
        message: "Selecione o cliente.",
        path: ["cliente_id"],
      });
    }
    if (data.modo_cliente === "rapido" && !data.cliente_rapido?.nome?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Informe o nome do cliente.",
        path: ["cliente_rapido", "nome"],
      });
    }
    const hasDesconto =
      data.desconto_total > 0 || data.desconto_percentual > 0;
    if (hasDesconto && !data.desconto_motivo?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Informe o motivo do desconto.",
        path: ["desconto_motivo"],
      });
    }
    if (data.receber_agora && !data.conta_bancaria_id) {
      ctx.addIssue({
        code: "custom",
        message: "Selecione a conta para receber agora.",
        path: ["conta_bancaria_id"],
      });
    }
    if (data.pagamentos && data.pagamentos.length > 0) {
      const itensSubtotal = data.itens.reduce(
        (s, i) => s + i.quantidade * i.preco_unitario - (i.desconto || 0),
        0,
      );
      const desconto =
        data.desconto_total > 0
          ? data.desconto_total
          : data.desconto_percentual > 0
            ? Number(((itensSubtotal * data.desconto_percentual) / 100).toFixed(2))
            : 0;
      const total = Math.max(0, Number((itensSubtotal - desconto).toFixed(2)));
      const soma = Number(
        data.pagamentos.reduce((s, p) => s + Number(p.valor), 0).toFixed(2),
      );
      if (Math.abs(soma - total) > 0.01) {
        ctx.addIssue({
          code: "custom",
          message: `Soma dos pagamentos (R$ ${soma.toFixed(2)}) deve igualar o total (R$ ${total.toFixed(2)}).`,
          path: ["pagamentos"],
        });
      }
    }
  });

export type VendaRapidaFormValues = z.output<typeof vendaRapidaFormSchema>;

export const vendaDevolucaoFormSchema = z.object({
  motivo: z.string().min(1, "Informe o motivo da devolução."),
  observacao: z.string().optional().nullable(),
  itens: z
    .array(
      z.object({
        venda_item_id: z.string().uuid(),
        quantidade: z.coerce.number().positive(),
      }),
    )
    .min(1),
});
