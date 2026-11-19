/**
 * Rede de lojas — formatos aceitos nas ações de talentos (Nine Box, liderança, critérios de carreira), com zod.
 * Puro: as ações importam daqui e os testes exercitam cada regra sem banco.
 * Nenhum campo tem valor padrão: nível ou nota em branco é erro, nunca "médio" ou "zero" por omissão.
 */
import { z } from "zod";

import { mes, uuid } from "./acao-comum.ts";

const texto = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `No máximo ${max} caracteres.`)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null));

const nivel = (nome: string) =>
  z
    .number({ message: `Escolha o ${nome}.` })
    .int(`Escolha o ${nome}.`)
    .min(1, `Escolha o ${nome}.`)
    .max(3, `Escolha o ${nome}.`);

export const nineBoxSchema = z.object({
  lojaId: uuid,
  colaboradorId: uuid,
  desempenho: nivel("desempenho"),
  potencial: nivel("potencial"),
  observacoes: texto(500),
});
export type NineBoxEntrada = z.input<typeof nineBoxSchema>;

export const liderancaSchema = z.object({
  lojaId: uuid,
  colaboradorId: uuid,
  mes,
  nota: z
    .number({ message: "Informe a nota de 0 a 5." })
    .min(0, "A nota vai de 0 a 5.")
    .max(5, "A nota vai de 0 a 5.")
    .refine((v) => Math.abs(v * 10 - Math.round(v * 10)) < 1e-6, "No máximo uma casa decimal."),
  observacoes: texto(500),
});
export type LiderancaEntrada = z.input<typeof liderancaSchema>;

const CARGOS = ["gerente_loja", "chefe_cozinha", "lider_delivery", "auxiliar_cozinha", "atendente", "supervisor_regional"] as const;

export const criterioCargoSchema = z.object({
  cargo: z.enum(CARGOS, { message: "Escolha o cargo." }),
  tempoMinimoMeses: z
    .number({ message: "Informe o tempo mínimo em meses." })
    .int("Deve ser inteiro.")
    .min(0, "Não pode ser negativo.")
    .max(120, "No máximo 120 meses.")
    .nullable(),
  criterio: z.string({ message: "Descreva o critério." }).trim().min(1, "Descreva o critério.").max(500, "No máximo 500 caracteres."),
});
export type CriterioCargoEntrada = z.input<typeof criterioCargoSchema>;

export const cargoCriterioSchema = z.object({ cargo: z.enum(CARGOS, { message: "Escolha o cargo." }) });
export type CargoCriterioEntrada = z.input<typeof cargoCriterioSchema>;
