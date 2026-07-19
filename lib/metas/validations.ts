import { z } from "zod";

import { toCompetenciaMonthStart } from "@/lib/metas/projection";

const optionalText = z.string().trim().optional().or(z.literal(""));

/**
 * Centro opcional: UUID | "" | null | undefined → normalizado para string | null.
 * Meta geral = null no banco.
 */
const optionalCentroCustoId = z
  .union([
    z.string().uuid("Selecione um centro de custo válido."),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform((value) => {
    if (value === undefined || value === null || value === "") return null;
    return value;
  });

const competenciaField = z
  .string()
  .trim()
  .min(1, "Informe a competência.")
  .refine(
    (value) => /^\d{4}-\d{2}(-\d{2})?$/.test(value),
    "Competência inválida.",
  )
  .transform((value) =>
    toCompetenciaMonthStart(value.length === 7 ? `${value}-01` : value),
  );

export const metaVendasFormSchema = z.object({
  competencia: competenciaField,
  valor_meta: z.number().min(0, "A meta não pode ser negativa."),
  centro_custo_id: optionalCentroCustoId,
  observacao: optionalText,
});

export const metaVendasUpdateSchema = z.object({
  valor_meta: z.number().min(0, "A meta não pode ser negativa."),
  centro_custo_id: optionalCentroCustoId,
  observacao: optionalText,
});

export type MetaVendasFormInput = z.input<typeof metaVendasFormSchema>;
export type MetaVendasFormValues = z.output<typeof metaVendasFormSchema>;
export type MetaVendasUpdateInput = z.input<typeof metaVendasUpdateSchema>;
export type MetaVendasUpdateValues = z.output<typeof metaVendasUpdateSchema>;

/** Mensagem amigável a partir de ZodError (sem JSON bruto). */
export function formatMetaVendasZodError(error: z.ZodError): string {
  const first = error.issues[0];
  if (!first) return "Dados inválidos. Verifique o formulário.";
  const field = first.path.join(".");
  const label =
    field === "centro_custo_id"
      ? "Centro de custo"
      : field === "valor_meta"
        ? "Valor da meta"
        : field === "competencia"
          ? "Competência"
          : field === "observacao"
            ? "Observação"
            : null;

  if (label && first.message) return `${label}: ${first.message}`;
  return first.message || "Dados inválidos. Verifique o formulário.";
}
