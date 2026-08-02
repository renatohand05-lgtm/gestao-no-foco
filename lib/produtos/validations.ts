import { z } from "zod";

import {
  PRODUTO_TIPO_OPTIONS,
  UNIDADE_MEDIDA_OPTIONS,
} from "@/lib/produtos/constants";

const optionalText = z.string().trim().optional().or(z.literal(""));

const nullableNumber = z.union([z.number(), z.null()]).default(null);

const produtoTipos = PRODUTO_TIPO_OPTIONS.map((option) => option.value) as [
  "produto",
  "peca",
  "servico",
  "kit",
  "combo",
  "materia_prima",
  "composto",
  "ativo_consumo",
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
    fabricante: optionalText,
    descricao_resumida: optionalText,
    unidade_medida: z
      .string()
      .trim()
      .min(1, "Informe a unidade de medida.")
      .refine(
        (value) => unidades.includes(value as (typeof unidades)[number]),
        "Informe uma unidade de medida válida.",
      ),
    ncm: optionalText,
    cest: optionalText,
    origem_mercadoria: optionalText,
    peso_kg: nullableNumber,
    dimensoes: optionalText,
    altura_cm: nullableNumber,
    largura_cm: nullableNumber,
    comprimento_cm: nullableNumber,
    custo: nullableNumber,
    custo_reposicao: nullableNumber,
    preco_venda: nullableNumber,
    preco_minimo: nullableNumber,
    margem_alvo: nullableNumber,
    estoque_atual: z.number().min(0, "Estoque não pode ser negativo.").default(0),
    estoque_minimo: nullableNumber,
    estoque_maximo: nullableNumber,
    estoque_seguranca: nullableNumber,
    localizacao: optionalText,
    fornecedor_principal: optionalText,
    fornecedor_alternativo: optionalText,
    controla_estoque: z.boolean().default(true),
    controla_lote: z.boolean().default(false),
    controla_serie: z.boolean().default(false),
    controla_validade: z.boolean().default(false),
    observacoes: optionalText,
    ativo: z.boolean(),
    tempo_estimado_minutos: nullableNumber,
    preco_sugerido: nullableNumber,
    especialidade: optionalText,
    equipe_ou_profissional: optionalText,
    unidade_cobranca: optionalText,
  })
  .superRefine((data, ctx) => {
    if (data.tipo === "servico") {
      if (data.controla_estoque) {
        ctx.addIssue({
          code: "custom",
          message: "Serviço não controla estoque.",
          path: ["controla_estoque"],
        });
      }
    }

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

    for (const [key, label] of [
      ["custo", "Custo"],
      ["custo_reposicao", "Custo de reposição"],
      ["preco_venda", "Preço de venda"],
      ["preco_sugerido", "Preço sugerido"],
      ["preco_minimo", "Preço mínimo"],
      ["tempo_estimado_minutos", "Tempo estimado"],
      ["peso_kg", "Peso"],
      ["altura_cm", "Altura"],
      ["largura_cm", "Largura"],
      ["comprimento_cm", "Comprimento"],
      ["estoque_seguranca", "Estoque de segurança"],
    ] as const) {
      const v = data[key];
      if (v !== null && v !== undefined && v < 0) {
        ctx.addIssue({
          code: "custom",
          message: `${label} não pode ser negativo.`,
          path: [key],
        });
      }
    }

    if (
      data.margem_alvo !== null &&
      data.margem_alvo !== undefined &&
      (data.margem_alvo < 0 || data.margem_alvo > 1)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Margem alvo deve estar entre 0 e 1 (ex.: 0,35 = 35%).",
        path: ["margem_alvo"],
      });
    }

    if (
      data.preco_venda != null &&
      data.preco_minimo != null &&
      data.preco_venda < data.preco_minimo
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Preço de venda abaixo do preço mínimo.",
        path: ["preco_venda"],
      });
    }

    if (data.ncm && data.ncm.trim() !== "" && !/^\d{8}$/.test(data.ncm.trim())) {
      ctx.addIssue({
        code: "custom",
        message: "NCM deve ter 8 dígitos quando informado.",
        path: ["ncm"],
      });
    }
  });

export type ProdutoFormInput = z.input<typeof produtoFormSchema>;
export type ProdutoFormValues = z.output<typeof produtoFormSchema>;
