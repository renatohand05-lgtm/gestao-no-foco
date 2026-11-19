/**
 * Rede de lojas — formatos aceitos nas ações de CMV, DRE e orçamento (validação com zod).
 * Puro: as ações importam daqui e os testes exercitam cada regra sem banco.
 */
import { z } from "zod";

import { data, dinheiro, mes, percentual, uuid } from "./acao-comum.ts";
import { ehSegunda } from "./financeiro.ts";

const texto = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `No máximo ${max} caracteres.`)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null));

/* ------------------------------------------------------------------ CMV */

export const semanaSegundaSchema = data.refine(ehSegunda, "A contagem começa sempre na segunda-feira.");

export const cmvItemSchema = z.object({
  item: z.string().trim().min(1, "Informe o nome do item.").max(120, "No máximo 120 caracteres."),
  consumoTeorico: z.number({ message: "Informe um número." }).gt(0, "O consumo teórico deve ser maior que zero.").max(1_000_000_000, "Valor acima do limite."),
  consumoReal: z.number({ message: "Informe um número." }).min(0, "Não pode ser negativo.").max(1_000_000_000, "Valor acima do limite."),
});

export const cmvSchema = z
  .object({
    lojaId: uuid,
    semana: semanaSegundaSchema,
    /** Vazio = usa a soma das vendas lançadas no módulo Vendas na semana. */
    vendas: z.number({ message: "Informe um número." }).gt(0, "Deve ser maior que zero (ou deixe vazio para usar as vendas lançadas).").max(100_000_000, "Valor acima do limite.").nullable(),
    cmvTeorico: percentual,
    estoqueInicial: dinheiro,
    compras: dinheiro,
    transferenciasEntrada: dinheiro,
    transferenciasSaida: dinheiro,
    devolucoes: dinheiro,
    estoqueFinal: dinheiro,
    responsavel: texto(120),
    observacoes: texto(500),
    itens: z.array(cmvItemSchema).max(60, "No máximo 60 itens por contagem.").default([]),
  })
  .superRefine((v, ctx) => {
    const vistos = new Set<string>();
    v.itens.forEach((i, idx) => {
      const k = i.item.toLocaleLowerCase("pt-BR");
      if (vistos.has(k)) ctx.addIssue({ code: "custom", path: ["itens", idx], message: `O item "${i.item}" aparece duas vezes.` });
      vistos.add(k);
    });
  });
export type CmvEntrada = z.input<typeof cmvSchema>;

/* ------------------------------------------------------------------ DRE */

export const LINHAS_LANCAVEIS = ["impostos", "cmv", "folha", "delivery", "manutencao", "marketing", "cto", "agua", "energia"] as const;

export const lancamentoDreSchema = z.object({
  lojaId: uuid,
  mes,
  linha: z.enum(LINHAS_LANCAVEIS, { message: "Linha do DRE inválida." }),
  valor: dinheiro,
  observacao: texto(300),
});
export type LancamentoDreEntrada = z.input<typeof lancamentoDreSchema>;

const opc = <T extends z.ZodTypeAny>(s: T) => s.nullable().optional();

export const CAMPOS_DA_PREMISSA = ["cmv", "pessoal", "impostos", "custoDelivery", "baseDelivery", "manutencao", "marketing", "cto", "agua", "energia", "mixDelivery"] as const;

export const premissasSchema = z
  .object({
    /** Nulo = padrão da rede (todos os campos obrigatórios); senão, só as exceções da loja (vazio = usa o padrão). */
    lojaId: uuid.nullable(),
    campos: z.object({
      cmv: opc(percentual),
      pessoal: opc(percentual),
      impostos: opc(percentual),
      custoDelivery: opc(percentual),
      baseDelivery: opc(z.enum(["delivery", "total"], { message: "Escolha delivery ou faturamento total." })),
      manutencao: opc(percentual),
      marketing: opc(percentual),
      cto: opc(dinheiro),
      agua: opc(dinheiro),
      energia: opc(dinheiro),
      mixDelivery: opc(percentual),
    }),
  })
  .superRefine((v, ctx) => {
    if (v.lojaId !== null) return;
    for (const k of CAMPOS_DA_PREMISSA) {
      if (v.campos[k] == null) ctx.addIssue({ code: "custom", path: ["campos"], message: "O padrão da rede precisa de todos os campos preenchidos." });
    }
  });
export type PremissasEntrada = z.input<typeof premissasSchema>;

/* ------------------------------------------------------------------ orçamento e expansão */

export const cenarioSchema = z.object({
  id: uuid.optional(),
  nome: z.string().trim().min(1, "Informe o nome do cenário.").max(80, "No máximo 80 caracteres."),
  descricao: texto(300),
  faturamento: z.number({ message: "Informe um número." }).gt(0, "Deve ser maior que zero.").max(1_000_000_000, "Valor acima do limite."),
  mixDelivery: percentual,
  cmv: percentual,
  folha: percentual,
  impostos: percentual,
  custoDelivery: percentual,
  baseDelivery: z.enum(["delivery", "total"], { message: "Escolha delivery ou faturamento total." }),
  manutencao: percentual,
  marketing: percentual,
  cto: dinheiro,
  agua: dinheiro,
  energia: dinheiro,
  curva: z.array(z.number({ message: "Informe números." }).min(0, "Não pode ser negativo.").max(300, "No máximo 300%.")).min(1, "Informe ao menos um mês na curva.").max(12, "No máximo 12 meses na curva."),
});
export type CenarioEntrada = z.input<typeof cenarioSchema>;

export const unidadeSchema = z.object({
  id: uuid.optional(),
  nome: z.string().trim().min(1, "Informe o nome da unidade.").max(80, "No máximo 80 caracteres."),
  /** YYYY-MM (o dia é sempre 1). Vazio = sem data. */
  abertura: mes.nullable().optional(),
  status: z.enum(["planejada", "inaugurada", "cancelada"], { message: "Situação inválida." }),
  cenarioId: uuid.nullable().optional(),
  lojaId: uuid.nullable().optional(),
  faturamentoAlvo: z.number({ message: "Informe um número." }).gt(0, "Deve ser maior que zero (ou deixe vazio para usar o do cenário).").max(1_000_000_000, "Valor acima do limite.").nullable().optional(),
  observacao: texto(300),
});
export type UnidadeEntrada = z.input<typeof unidadeSchema>;

export const configExpansaoSchema = z.object({
  metaLojas: z.number({ message: "Informe um número." }).int("Deve ser inteiro.").min(1, "No mínimo 1.").max(200, "No máximo 200."),
  faturamentoMinimo: dinheiro,
  lojasBase: z.array(uuid).max(200).transform((ids) => [...new Set(ids)]),
});
export type ConfigExpansaoEntrada = z.input<typeof configExpansaoSchema>;
