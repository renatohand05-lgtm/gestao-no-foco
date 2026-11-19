/**
 * Rede de lojas — formatos aceitos nas ações de RH (validação com zod).
 * Puro: as ações importam daqui e os testes exercitam cada regra sem banco.
 */
import { z } from "zod";

import { data, mes, uuid } from "./acao-comum.ts";

const texto = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `No máximo ${max} caracteres.`)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null));

const CARGOS = ["gerente_loja", "chefe_cozinha", "lider_delivery", "auxiliar_cozinha", "atendente"] as const;
const TIPOS = ["advertencia_verbal", "advertencia_escrita", "suspensao", "falta_injustificada", "atraso", "atestado_medico", "feedback", "elogio", "treinamento", "desligamento"] as const;
const STATUS = ["registrada", "aguardando_assinatura", "assinada", "recusou_assinar", "concluida"] as const;

const cargo = z.enum(CARGOS, { message: "Escolha o cargo." });
const inteiro = (max: number, msg = "Informe um número.") => z.number({ message: msg }).int("Deve ser inteiro.").min(0, "Não pode ser negativo.").max(max, `No máximo ${max}.`);

export const colaboradorSchema = z.object({
  lojaId: uuid,
  nome: z.string({ message: "Informe o nome." }).trim().min(2, "Informe o nome (mínimo 2 letras).").max(120, "No máximo 120 caracteres."),
  cargo,
  dataAdmissao: data,
  observacoes: texto(500),
});
export type ColaboradorEntrada = z.input<typeof colaboradorSchema>;

export const desligamentoSchema = z.object({
  data,
  motivo: texto(300),
});
export type DesligamentoEntrada = z.input<typeof desligamentoSchema>;

export const previstoSchema = z.object({
  lojaId: uuid,
  previstos: z.object({
    gerente_loja: inteiro(99),
    chefe_cozinha: inteiro(99),
    lider_delivery: inteiro(99),
    auxiliar_cozinha: inteiro(99),
    atendente: inteiro(99),
  }),
});
export type PrevistoEntrada = z.input<typeof previstoSchema>;

export const mesRhSchema = z
  .object({
    lojaId: uuid,
    mes,
    headcount: z
      .number({ message: "Informe o headcount médio." })
      .gt(0, "Deve ser maior que zero.")
      .max(5000, "No máximo 5000.")
      .refine((v) => Math.abs(v * 10 - Math.round(v * 10)) < 1e-6, "No máximo uma casa decimal."),
    admissoes: inteiro(1000),
    desligamentos: inteiro(1000),
    faltas: inteiro(200_000),
    diasPrevistos: z.number({ message: "Informe os dias previstos." }).int("Deve ser inteiro.").min(1, "Deve ser maior que zero.").max(200_000, "No máximo 200000."),
  })
  .refine((v) => v.faltas <= v.diasPrevistos, { message: "Os dias de falta não podem passar dos dias previstos.", path: ["faltas"] });
export type MesRhEntrada = z.input<typeof mesRhSchema>;

export const ocorrenciaSchema = z.object({
  lojaId: uuid,
  colaboradorId: uuid,
  tipo: z.enum(TIPOS, { message: "Escolha o tipo." }),
  data,
  status: z.enum(STATUS, { message: "Escolha o status." }),
  motivo: z.string({ message: "Descreva o motivo." }).trim().min(1, "Descreva o motivo da ocorrência.").max(300, "No máximo 300 caracteres."),
  responsavel: texto(120),
  observacoes: texto(1000),
});
export type OcorrenciaEntrada = z.input<typeof ocorrenciaSchema>;

export const importacaoRhSchema = z.object({
  lojaId: uuid,
  texto: z.string({ message: "Cole a lista." }).max(60_000, "Lista grande demais."),
});
export type ImportacaoRhEntrada = z.input<typeof importacaoRhSchema>;
