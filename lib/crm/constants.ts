/**
 * Sprint 14 — CRM Enterprise constants
 */

export const CRM_FUNIL_STAGES = [
  "lead",
  "contato",
  "proposta",
  "negociacao",
  "fechado",
  "perdido",
] as const;

export type CrmFunilStage = (typeof CRM_FUNIL_STAGES)[number];

export const CRM_FUNIL_LABELS: Record<CrmFunilStage, string> = {
  lead: "Lead",
  contato: "Contato",
  proposta: "Proposta",
  negociacao: "Negociação",
  fechado: "Fechado",
  perdido: "Perdido",
};

export const CRM_FUNIL_COLORS: Record<CrmFunilStage, string> = {
  lead: "bg-slate-100 text-slate-800",
  contato: "bg-blue-100 text-blue-800",
  proposta: "bg-violet-100 text-violet-800",
  negociacao: "bg-amber-100 text-amber-900",
  fechado: "bg-emerald-100 text-emerald-800",
  perdido: "bg-red-100 text-red-800",
};

export const CRM_TAREFA_TIPOS = [
  "ligar",
  "proposta",
  "cobranca",
  "revisao",
  "whatsapp",
  "outro",
] as const;

export type CrmTarefaTipo = (typeof CRM_TAREFA_TIPOS)[number];

export const CRM_TAREFA_TIPO_LABELS: Record<CrmTarefaTipo, string> = {
  ligar: "Ligar",
  proposta: "Enviar proposta",
  cobranca: "Cobrança",
  revisao: "Revisão",
  whatsapp: "WhatsApp",
  outro: "Outro",
};

export const CRM_TAREFA_STATUS = [
  "pendente",
  "em_andamento",
  "concluida",
  "cancelada",
] as const;

export type CrmTarefaStatus = (typeof CRM_TAREFA_STATUS)[number];

export const CRM_DOCUMENTO_CATEGORIAS = [
  "contrato",
  "proposta",
  "orcamento",
  "os",
  "identidade",
  "outro",
] as const;

export type CrmDocumentoCategoria = (typeof CRM_DOCUMENTO_CATEGORIAS)[number];

export const CRM_DOCUMENTO_CATEGORIA_LABELS: Record<CrmDocumentoCategoria, string> = {
  contrato: "Contrato",
  proposta: "Proposta",
  orcamento: "Orçamento",
  os: "OS",
  identidade: "Documento do cliente",
  outro: "Outro",
};

export const CRM_AGENDA_TIPOS = [
  "visita",
  "ligacao",
  "reuniao",
  "whatsapp",
  "cobranca",
  "retorno",
  "outro",
] as const;

export type CrmAgendaTipo = (typeof CRM_AGENDA_TIPOS)[number];

export const CRM_AGENDA_TIPO_LABELS: Record<CrmAgendaTipo, string> = {
  visita: "Visita",
  ligacao: "Ligação",
  reuniao: "Reunião",
  whatsapp: "WhatsApp",
  cobranca: "Cobrança",
  retorno: "Retorno",
  outro: "Outro",
};

export const CRM_DEFAULT_TAGS: Array<{ slug: string; nome: string; cor: string }> = [
  { slug: "vip", nome: "VIP", cor: "#7c3aed" },
  { slug: "garantia", nome: "Garantia", cor: "#2563eb" },
  { slug: "frota", nome: "Frota", cor: "#0891b2" },
  { slug: "inadimplente", nome: "Inadimplente", cor: "#dc2626" },
  { slug: "retorno", nome: "Retorno", cor: "#ea580c" },
  { slug: "parceiro", nome: "Parceiro", cor: "#16a34a" },
  { slug: "indicacao", nome: "Indicação", cor: "#ca8a04" },
];

export const CRM_CLASSIFICACOES = ["A", "B", "C", "D"] as const;

export type CrmClassificacao = (typeof CRM_CLASSIFICACOES)[number];

export const CRM_ORIGENS_SUGERIDAS = [
  "Indicação",
  "Google",
  "Instagram",
  "WhatsApp",
  "Passagem",
  "Parceiro",
  "Frota",
  "Retorno",
  "Outro",
] as const;
