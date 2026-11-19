/**
 * Rede de lojas — formatos aceitos nas ações do checklist de qualidade e dos planos de ação (validação com zod).
 * Puro: as ações importam daqui e os testes exercitam cada regra sem banco.
 */
import { z } from "zod";

import { data, uuid } from "./acao-comum.ts";
import { dataValida } from "./filtros.ts";
import { lerChaveItem } from "./qualidade.ts";

const texto = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `No máximo ${max} caracteres.`)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null));

/** Data opcional: vazio vira null. */
const dataOpcional = z
  .string()
  .nullable()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : null))
  .refine((v) => v === null || dataValida(v), "Data inválida.");

const prioridade = z.enum(["baixa", "media", "alta"], { message: "Escolha a prioridade." });
const situacao = z.enum(["pendente", "em_andamento", "concluido", "cancelado"], { message: "Escolha a situação." });

/* ------------------------------------------------------------------ visita de qualidade */

export const respostaItemSchema = z.object({
  v: z.enum(["sim", "nao", "na"], { message: "Responda Sim, Não ou N/A." }).nullable().optional(),
  o: z.string().max(300, "No máximo 300 caracteres.").nullable().optional(),
});

/** O que a pessoa decide para cada desvio (item "Não"): o texto do item e a origem vêm do servidor. */
export const acaoDesvioSchema = z.object({
  acao: texto(600),
  responsavel: texto(120),
  prazo: dataOpcional,
  prioridade: prioridade.default("media"),
  status: situacao.default("pendente"),
});
export type AcaoDesvioEntrada = z.input<typeof acaoDesvioSchema>;

export const visitaSchema = z
  .object({
    lojaId: uuid,
    data,
    avaliador: z.string().trim().min(1, "Informe o nome de quem visitou.").max(120, "No máximo 120 caracteres."),
    gerente: texto(120),
    respostas: z.record(z.string(), respostaItemSchema.nullable()),
    acoes: z.record(z.string(), acaoDesvioSchema).default({}),
  })
  .superRefine((v, ctx) => {
    for (const k of Object.keys(v.respostas)) if (!lerChaveItem(k)) ctx.addIssue({ code: "custom", path: ["respostas"], message: "Item da visita inexistente." });
    for (const k of Object.keys(v.acoes)) if (!lerChaveItem(k)) ctx.addIssue({ code: "custom", path: ["acoes"], message: "Item da visita inexistente." });
  });
export type VisitaEntrada = z.input<typeof visitaSchema>;

/* ------------------------------------------------------------------ planos de ação */

const descricao = z.string().trim().min(1, "Descreva o problema.").max(500, "No máximo 500 caracteres.");

/** Plano lançado à mão (origem "manual") ou a partir de um indicador fora da meta (origem "indicador"). */
export const planoNovoSchema = z.object({
  lojaId: uuid,
  origemTipo: z.enum(["manual", "indicador"], { message: "Escolha a origem." }),
  /** Para "indicador": qual indicador (texto livre curto). Em branco = o nome da origem. */
  origemRotulo: texto(200),
  descricao,
  acao: texto(600),
  responsavel: texto(120),
  prazo: dataOpcional,
  prioridade: prioridade.default("media"),
  status: z.enum(["pendente", "em_andamento"], { message: "Escolha pendente ou em andamento." }).default("pendente"),
  observacoes: texto(1000),
});
export type PlanoNovoEntrada = z.input<typeof planoNovoSchema>;

export const planoEdicaoSchema = z.object({
  /** Só vale para planos lançados à mão ou de indicador; nos dos checklists a descrição vem do desvio. */
  descricao: descricao.optional(),
  acao: texto(600),
  responsavel: texto(120),
  prazo: dataOpcional,
  prioridade,
  status: situacao,
  evidencia: texto(600),
  observacoes: texto(1000),
});
export type PlanoEdicaoEntrada = z.input<typeof planoEdicaoSchema>;
