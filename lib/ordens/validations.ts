import { z } from "zod";

const optionalUuid = z.union([z.string().uuid(), z.literal("")]).optional();
const optionalText = z.string().optional().nullable();

export const veiculoFormSchema = z.object({
  cliente_id: z.string().uuid("Selecione o cliente."),
  placa: z
    .string()
    .max(12)
    .optional()
    .nullable()
    .transform((v) => {
      const t = (v ?? "").replace(/\s+/g, "").toUpperCase();
      return t.length > 0 ? t : null;
    }),
  marca: optionalText,
  modelo: optionalText,
  versao: optionalText,
  ano: z.coerce.number().int().min(1950).max(2100).optional().nullable(),
  cor: optionalText,
  combustivel: optionalText,
  cambio: optionalText,
  quilometragem: z.coerce.number().min(0).optional().nullable(),
  chassi: optionalText,
  observacoes: optionalText,
  ativo: z.boolean().default(true),
});

export const osOpenFormSchema = z.object({
  cliente_id: z.string().uuid("Selecione o cliente."),
  veiculo_id: optionalUuid,
  quilometragem_entrada: z.coerce.number().min(0).optional().nullable(),
  data_hora_entrada: z.string().optional().nullable(),
  previsao_entrega: z.string().optional().nullable(),
  reclamacao_cliente: optionalText,
  observacoes: optionalText,
  nivel_combustivel: optionalText,
  objetos_deixados: optionalText,
  danos_aparentes: optionalText,
  centro_custo_id: optionalUuid,
  origem_atendimento: optionalText,
  prioridade: z.enum(["baixa", "normal", "alta", "urgente"]).default("normal"),
  mecanico_id: optionalUuid,
  consultor_id: optionalUuid,
});

export const osVeiculoVinculoFormSchema = z.object({
  veiculo_id: z.string().uuid("Selecione o veículo."),
});

export const osItemFormSchema = z.object({
  produto_id: optionalUuid,
  descricao: z.string().min(1, "Informe a descrição."),
  tipo_item: z.enum(["produto", "servico"]).default("servico"),
  categoria_item: z.enum(["peca", "servico", "mao_obra", "outro"]).default("servico"),
  quantidade: z.coerce.number().positive(),
  valor_unitario: z.coerce.number().min(0),
  desconto: z.coerce.number().min(0).default(0),
  acrescimo: z.coerce.number().min(0).default(0),
  custo_unitario: z.coerce.number().min(0).optional().nullable(),
  mecanico_id: optionalUuid,
  horas_previstas: z.coerce.number().min(0).optional().nullable(),
  peca_origem: z
    .enum(["estoque", "cliente", "compra", "outro"])
    .default("estoque"),
  fornecedor_sugerido_id: optionalUuid,
  observacoes: optionalText,
});

export const osDiagnosticoFormSchema = z.object({
  sintoma_relatado: optionalText,
  diagnostico_tecnico: optionalText,
  causa_provavel: optionalText,
  recomendacao: optionalText,
  gravidade: z.enum(["baixa", "media", "alta", "critica"]).optional().nullable(),
  urgencia: z.enum(["baixa", "media", "alta"]).optional().nullable(),
  testes_realizados: optionalText,
  pecas_necessarias: optionalText,
  servicos_necessarios: optionalText,
  observacoes_internas: optionalText,
  observacoes_cliente: optionalText,
});

export const osAprovacaoFormSchema = z.object({
  modo: z.enum(["total", "parcial", "reprovar"]),
  canal: z.enum(["presencial", "telefone", "whatsapp", "email", "outro"]),
  motivo: optionalText,
  item_ids_aprovados: z.array(z.string().uuid()).optional(),
});

export const osStatusFormSchema = z.object({
  status: z.string().min(1),
  motivo: optionalText,
});

export const osPrevisaoFormSchema = z.object({
  previsao_entrega: z.string().min(1, "Informe a nova previsão."),
  motivo: z.string().min(1, "Informe o motivo da alteração."),
});

export const osEntregaFormSchema = z.object({
  quilometragem_saida: z.coerce.number().min(0).optional().nullable(),
  garantia_dias: z.coerce.number().int().min(0).optional().nullable(),
  observacoes: optionalText,
  forcar: z.boolean().default(false),
  motivo_excecao: optionalText,
});

export const osFaturarFormSchema = z.object({
  forma_pagamento_id: z.string().uuid("Selecione a forma de pagamento."),
  data_venda: z.string().min(1),
});

export const osHeaderUpdateFormSchema = z.object({
  reclamacao_cliente: optionalText,
  observacoes: optionalText,
  quilometragem_entrada: z.coerce.number().min(0).optional().nullable(),
  previsao_entrega: z.string().optional().nullable(),
  nivel_combustivel: optionalText,
  objetos_deixados: optionalText,
  danos_aparentes: optionalText,
  prioridade: z.enum(["baixa", "normal", "alta", "urgente"]).optional(),
  origem_atendimento: optionalText,
});

export const osExecucaoFormSchema = z.object({
  status: z.enum(["em_execucao", "pausado", "concluido", "cancelado"]),
  horas_realizadas: z.coerce.number().min(0).optional().nullable(),
});

export const veiculoUpdateFormSchema = veiculoFormSchema
  .omit({ cliente_id: true })
  .partial();

export const osRetornoFormSchema = z.object({
  motivo: z.string().min(1),
  tipo_retorno: z.enum([
    "garantia",
    "retrabalho",
    "novo_problema",
    "cortesia",
    "cobranca_adicional",
  ]),
  tipo_cobertura: z.enum(["garantia", "pago"]).default("garantia"),
  quilometragem: z.coerce.number().min(0).optional().nullable(),
  diagnostico: optionalText,
  item_id: optionalUuid,
});

export type OsOpenFormValues = z.infer<typeof osOpenFormSchema>;
export type OsItemFormValues = z.infer<typeof osItemFormSchema>;
export type VeiculoFormValues = z.infer<typeof veiculoFormSchema>;
export type OsVeiculoVinculoFormValues = z.infer<typeof osVeiculoVinculoFormSchema>;
export type OsDiagnosticoFormValues = z.infer<typeof osDiagnosticoFormSchema>;
export type OsAprovacaoFormValues = z.infer<typeof osAprovacaoFormSchema>;
export type OsStatusFormValues = z.infer<typeof osStatusFormSchema>;
export type OsPrevisaoFormValues = z.infer<typeof osPrevisaoFormSchema>;
export type OsEntregaFormValues = z.infer<typeof osEntregaFormSchema>;
export type OsFaturarFormValues = z.infer<typeof osFaturarFormSchema>;
export type OsRetornoFormValues = z.infer<typeof osRetornoFormSchema>;
export type OsHeaderUpdateFormValues = z.infer<typeof osHeaderUpdateFormSchema>;
export type OsExecucaoFormValues = z.infer<typeof osExecucaoFormSchema>;
export type VeiculoUpdateFormValues = z.infer<typeof veiculoUpdateFormSchema>;

export const OS_CHECKLIST_CLASSIFICACAO = [
  "bom",
  "atencao",
  "critico",
  "nao_verificado",
  "nao_aplicavel",
] as const;

export const osChecklistUpdateSchema = z.object({
  classificacao: z.enum(OS_CHECKLIST_CLASSIFICACAO),
  observacao: optionalText,
});

export const osAnexoUploadMetaSchema = z.object({
  ordemServicoId: z.string().uuid(),
  etapa: z.enum([
    "entrada",
    "diagnostico",
    "orcamento",
    "execucao",
    "conclusao",
    "entrega",
    "retorno",
    "garantia",
    "sintoma",
    "causa",
    "recomendacao",
    "peca_danificada",
    "antes_desmontagem",
    "depois_desmontagem",
    "outro",
  ]),
  tipo: z.enum(["foto", "documento", "pdf", "outro"]).default("foto"),
  nomeArquivo: z.string().min(1).max(255),
  checklistItemId: optionalUuid,
  diagnosticoId: optionalUuid,
  legenda: optionalText,
  observacao: optionalText,
  ordem: z.coerce.number().int().min(0).optional(),
});

export const osPublicarOrcamentoSchema = z.object({
  prazoEstimadoDias: z.coerce.number().int().min(0).optional().nullable(),
  validadeDias: z.coerce.number().int().min(1).max(365).optional().nullable(),
  justificativa: optionalText,
});

export const osCompartilharSchema = z.object({
  canal: z.enum(["link", "email", "whatsapp", "pdf", "outro"]).default("link"),
  destinatario: optionalText,
  validadeHoras: z.coerce.number().int().min(1).max(720).optional(),
  versaoOrcamentoId: optionalUuid,
  mensagemTemplate: optionalText,
});

export const osAprovacaoPublicaSchema = z
  .object({
    modo: z.enum(["total", "parcial", "reprovar", "contato"]),
    nome: optionalText,
    observacao: optionalText,
    aceiteAviso: z.boolean(),
    itens: z
      .array(
        z.object({
          id: z.string().uuid(),
          decisao: z.enum(["aprovado", "reprovado"]),
        }),
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.modo !== "contato" && !data.aceiteAviso) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "É necessário aceitar o aviso do orçamento.",
        path: ["aceiteAviso"],
      });
    }
    if (data.modo === "parcial" && (!data.itens || data.itens.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecione ao menos um item para aprovação parcial.",
        path: ["itens"],
      });
    }
  });

export type OsChecklistUpdateFormValues = z.infer<typeof osChecklistUpdateSchema>;
export type OsAnexoUploadMetaFormValues = z.infer<typeof osAnexoUploadMetaSchema>;
export type OsPublicarOrcamentoFormValues = z.infer<typeof osPublicarOrcamentoSchema>;
export type OsCompartilharFormValues = z.infer<typeof osCompartilharSchema>;
export type OsAprovacaoPublicaFormValues = z.infer<typeof osAprovacaoPublicaSchema>;
