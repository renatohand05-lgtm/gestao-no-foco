import { z } from "zod";

export const manualReturnSchema = z.object({
  clienteId: z.string().uuid(),
  presetDays: z.coerce.number().int().min(1).max(400).optional().nullable(),
  specificDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  motivo: z.string().max(200).optional().nullable(),
  observacao: z.string().max(2000).optional().nullable(),
  produtoId: z.string().uuid().optional().nullable(),
  profissionalId: z.string().uuid().optional().nullable(),
  veiculoId: z.string().uuid().optional().nullable(),
  lastKm: z.coerce.number().int().min(0).optional().nullable(),
  mileageKm: z.coerce.number().int().min(0).optional().nullable(),
  placa: z.string().max(20).optional().nullable(),
  veiculoLabel: z.string().max(120).optional().nullable(),
  lastServiceLabel: z.string().max(200).optional().nullable(),
  estimatedValue: z.coerce.number().min(0).optional().nullable(),
  hideProcedure: z.boolean().optional(),
});

export const returnStatusActionSchema = z.object({
  id: z.string().uuid(),
  status: z.enum([
    "previsto",
    "proximo",
    "hoje",
    "atrasado",
    "contatado",
    "cliente_respondeu",
    "cliente_respondeu_sim",
    "agendado",
    "concluido",
    "cancelado",
    "ignorado",
  ]),
  appointmentId: z.string().uuid().optional().nullable(),
});

export const prefsSchema = z.object({
  clienteId: z.string().uuid(),
  whatsappEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  optOut: z.boolean().optional(),
});

export const serviceRuleSchema = z.object({
  produtoId: z.string().uuid(),
  returnEnabled: z.boolean(),
  returnType: z.enum(["data", "km", "data_ou_km", "sessao", "follow_up"]),
  intervalDays: z.coerce.number().int().min(0).optional().nullable(),
  intervalMonths: z.coerce.number().int().min(0).optional().nullable(),
  mileageKm: z.coerce.number().int().min(0).optional().nullable(),
  hideProcedure: z.boolean().optional(),
  messageTemplate: z.string().max(2000).optional().nullable(),
});
