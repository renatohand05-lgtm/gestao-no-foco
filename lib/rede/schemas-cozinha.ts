/**
 * Rede de lojas — formatos aceitos nas ações da cozinha central e do delivery (validação com zod).
 * Puro: as ações importam daqui e os testes exercitam cada regra sem banco.
 */
import { z } from "zod";

import { data, dinheiro, inteiro, percentual, uuid } from "./acao-comum.ts";
import { MOTIVOS_RUPTURA } from "./tipos.ts";

const texto = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `No máximo ${max} caracteres.`)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null));

/** Número opcional: vazio vira null. */
const opcional = <T extends z.ZodTypeAny>(s: T) =>
  s
    .nullable()
    .optional()
    .transform((v) => (v ?? null) as z.output<T> | null);

/* ------------------------------------------------------------------ rupturas */

export const rupturaSchema = z.object({
  lojaId: uuid,
  data,
  item: z.string().trim().min(1, "Informe o item em falta.").max(120, "No máximo 120 caracteres."),
  motivo: z.enum(MOTIVOS_RUPTURA, { message: "Escolha um dos motivos da lista." }),
  horas: z.number({ message: "Informe um número." }).min(0, "Não pode ser negativo.").max(720, "No máximo 720 horas (30 dias)."),
  acao: texto(300),
});
export type RupturaEntrada = z.input<typeof rupturaSchema>;

/* ------------------------------------------------------------------ estoque da cozinha central */

const quantidade = z.number({ message: "Informe um número." }).min(0, "Não pode ser negativo.").max(1_000_000_000, "Valor acima do limite.");

export const produtoSchema = z.object({
  id: uuid.optional(),
  item: z.string().trim().min(1, "Informe o nome do item.").max(120, "No máximo 120 caracteres."),
  unidade: z.string().trim().min(1, "Informe a unidade (kg, L, un…).").max(12, "No máximo 12 caracteres."),
  atual: quantidade,
  minimo: quantidade,
  consumoDia: quantidade,
  custo: dinheiro,
});
export type ProdutoEntrada = z.input<typeof produtoSchema>;

/** Ajuste rápido na tabela: só os números que mudaram. */
export const ajusteEstoqueSchema = z
  .object({
    id: uuid,
    atual: quantidade.optional(),
    minimo: quantidade.optional(),
    consumoDia: quantidade.optional(),
  })
  .refine((v) => v.atual !== undefined || v.minimo !== undefined || v.consumoDia !== undefined, "Informe o que mudou.");
export type AjusteEstoqueEntrada = z.input<typeof ajusteEstoqueSchema>;

/* ------------------------------------------------------------------ checklist de delivery */

const respostaRotina = z.enum(["sim", "nao", "na"], { message: "Responda Sim, Não ou N/A." });

export const deliverySchema = z
  .object({
    lojaId: uuid,
    /** Diário: o dia. Semanal: qualquer dia da semana (o registro fica na segunda-feira). */
    data,
    periodo: z.enum(["diario", "semanal"], { message: "Escolha diário ou semanal." }),
    responsavel: texto(120),
    preparo: opcional(z.number({ message: "Informe um número." }).min(0, "Não pode ser negativo.").max(600, "No máximo 600 minutos.")),
    cancelamentos: opcional(percentual),
    notaIfood: opcional(z.number({ message: "Informe um número." }).min(0, "Não pode ser negativa.").max(5, "A nota vai até 5.")),
    tempoOnline: opcional(percentual),
    rupturas: opcional(inteiro),
    pedidos: opcional(inteiro),
    ticketMedio: opcional(dinheiro),
    conversao: opcional(percentual),
    atrasos: opcional(percentual),
    comissoes: opcional(percentual),
    freteSubsidiado: opcional(dinheiro),
    promocoes: opcional(dinheiro),
    custoPedido: opcional(dinheiro),
    rotina: z.record(z.string().regex(/^[0-6]$/, "Item da rotina inexistente."), respostaRotina).default({}),
    observacoes: texto(1000),
  })
  .refine((v) => v.preparo != null || v.cancelamentos != null || v.notaIfood != null || v.tempoOnline != null || v.rupturas != null, {
    message: "Preencha pelo menos um.",
    path: ["indicadores"],
  });
export type DeliveryEntrada = z.input<typeof deliverySchema>;
