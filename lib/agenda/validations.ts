/**
 * Sprint 28.9 — Validações agenda enterprise.
 */

import { z } from "zod";

import { AGENDA_EVENT_STATUSES } from "./agenda-service";

const optionalUuid = z
  .union([z.string().uuid(), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

export const agendaEventFormSchema = z
  .object({
    titulo: z.string().trim().min(1, "Informe o título.").max(200),
    tipo: z.string().trim().max(40).default("compromisso"),
    natureza: z.enum(["cliente", "negocio", "interno"]).default("negocio"),
    servico_id: optionalUuid,
    duracao_minutos: z.coerce.number().int().min(1).max(24 * 60).optional().nullable(),
    lembrete_minutos: z.coerce.number().int().min(0).max(7 * 24 * 60).optional().nullable(),
    meeting_url: z.string().max(500).optional().nullable(),
    return_id: optionalUuid,
    inicio: z.string().min(1, "Informe o início."),
    fim: z.string().min(1, "Informe o fim."),
    dia_inteiro: z.boolean().default(false),
    responsavel_id: optionalUuid,
    recurso_id: optionalUuid,
    cliente_id: optionalUuid,
    ordem_servico_id: optionalUuid,
    venda_id: optionalUuid,
    observacao: z.string().max(4000).optional().nullable(),
    endereco: z.string().max(500).optional().nullable(),
    filial_id: optionalUuid,
    empresa_id: optionalUuid,
    override_conflito: z.boolean().default(false),
    override_justificativa: z.string().max(500).optional().nullable(),
    recorrencia_frequency: z
      .enum(["diaria", "semanal", "mensal", "nenhuma"])
      .default("nenhuma"),
    recorrencia_count: z.coerce.number().int().min(1).max(52).default(1),
  })
  .superRefine((v, ctx) => {
    if (Date.parse(v.fim) <= Date.parse(v.inicio)) {
      ctx.addIssue({
        code: "custom",
        message: "Fim deve ser posterior ao início.",
        path: ["fim"],
      });
    }
    if (v.natureza === "cliente" && !v.cliente_id) {
      ctx.addIssue({
        code: "custom",
        message: "Cliente é obrigatório no agendamento de atendimento.",
        path: ["cliente_id"],
      });
    }
    if (v.override_conflito && !v.override_justificativa?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Justificativa obrigatória para override.",
        path: ["override_justificativa"],
      });
    }
  });

export const agendaEventStatusSchema = z.enum(AGENDA_EVENT_STATUSES);

export type AgendaEventFormValues = z.infer<typeof agendaEventFormSchema>;
