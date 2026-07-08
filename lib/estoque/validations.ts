import { z } from "zod";

import {
  MOVIMENTACAO_ORIGEM_OPTIONS,
  MOVIMENTACAO_TIPO_OPTIONS,
} from "@/lib/estoque/constants";

const optionalText = z.string().trim().optional().or(z.literal(""));

const movimentacaoTipos = MOVIMENTACAO_TIPO_OPTIONS.map((option) => option.value) as [
  "entrada",
  "saida",
  "ajuste",
];

const origens = MOVIMENTACAO_ORIGEM_OPTIONS.map((option) => option.value);

export const movimentacaoFormSchema = z.object({
  produto_id: z.string().uuid("Selecione um produto válido."),
  tipo: z.enum(movimentacaoTipos),
  quantidade: z
    .number({ error: "Informe a quantidade." })
    .min(0, "Quantidade não pode ser negativa."),
  motivo: optionalText,
  origem: z
    .string()
    .trim()
    .min(1, "Informe a origem.")
    .refine(
      (value) => origens.includes(value as (typeof origens)[number]),
      "Informe uma origem válida.",
    ),
  observacoes: optionalText,
});

export type MovimentacaoFormInput = z.input<typeof movimentacaoFormSchema>;
export type MovimentacaoFormValues = z.output<typeof movimentacaoFormSchema>;
