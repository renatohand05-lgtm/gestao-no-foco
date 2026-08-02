/**
 * Sprint 28.9 — Validações orçamento empresarial.
 */

import { z } from "zod";

import {
  FINANCE_BUDGET_NATUREZAS,
  FINANCE_BUDGET_STATUSES,
} from "./budget-service";

const optionalUuid = z
  .union([z.string().uuid(), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

export const financeBudgetLineSchema = z.object({
  mes: z.coerce.number().int().min(1).max(12),
  natureza: z.enum(FINANCE_BUDGET_NATUREZAS),
  valor_orcado: z.coerce.number().finite().min(0),
  justificativa: z.string().max(2000).optional().nullable(),
  centro_custo_id: optionalUuid,
  centro_resultado_id: optionalUuid,
  categoria_id: optionalUuid,
  plano_conta_id: optionalUuid,
});

export const financeBudgetFormSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome.").max(200),
  ano: z.coerce
    .number()
    .int()
    .min(2000)
    .max(2100),
  observacao: z.string().max(4000).optional().nullable(),
  filial_id: optionalUuid,
  empresa_id: optionalUuid,
  lines: z.array(financeBudgetLineSchema).max(120).default([]),
});

export const financeBudgetStatusSchema = z.enum(FINANCE_BUDGET_STATUSES);

export type FinanceBudgetFormValues = z.infer<typeof financeBudgetFormSchema>;
