import { z } from "zod";

import {
  PRODUTO_TIPO_OPTIONS,
  UNIDADE_MEDIDA_OPTIONS,
} from "@/lib/produtos/constants";

const optionalText = z.string().trim().optional().or(z.literal(""));

const nullableNumber = z.union([z.number(), z.null()]).default(null);

const produtoTipos = PRODUTO_TIPO_OPTIONS.map((option) => option.value) as [
  "produto",
  "servico",
  "kit",
  "combo",
  "materia_prima",
];

const unidades = UNIDADE_MEDIDA_OPTIONS.map((option) => option.value);

export const produtoFormSchema = z
  .object({
    nome: z.string().trim().min(2, "Informe o nome do item."),
    tipo: z.enum(produtoTipos),
    codigo_interno: optionalText,
    sku: optionalText,
    codigo_barras: optionalText,
    categoria: optionalText,
    subcategoria: optionalText,
    marca: optionalText,
    unidade_medida: z
      .string()
      .trim()
      .min(1, "Informe a unidade de medida.")
      .refine(
        (value) => unidades.includes(value as (typeof unidades)[number]),
        "Informe uma unidade de medida válida.",
      ),
    custo: nullableNumber,
    preco_venda: nullableNumber,
    estoque_atual: z.number().min(0, "Estoque não pode ser negativo.").default(0),
    estoque_minimo: nullableNumber,
    estoque_maximo: nullableNumber,
    localizacao: optionalText,
    fornecedor_principal: optionalText,
    observacoes: optionalText,
    ativo: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (
      data.estoque_minimo !== null &&
      data.estoque_maximo !== null &&
      data.estoque_minimo !== undefined &&
      data.estoque_maximo !== undefined &&
      data.estoque_minimo > data.estoque_maximo
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Estoque mínimo não pode ser maior que o máximo.",
        path: ["estoque_minimo"],
      });
    }

    if (
      data.custo !== null &&
      data.custo !== undefined &&
      data.custo < 0
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Custo não pode ser negativo.",
        path: ["custo"],
      });
    }

    if (
      data.preco_venda !== null &&
      data.preco_venda !== undefined &&
      data.preco_venda < 0
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Preço de venda não pode ser negativo.",
        path: ["preco_venda"],
      });
    }
  });

export type ProdutoFormInput = z.input<typeof produtoFormSchema>;
export type ProdutoFormValues = z.output<typeof produtoFormSchema>;
