/**
 * Fase 28.4 — Templates de Ordem de Trabalho (configuráveis por segmento).
 * Interface continua "Ordem de Serviço" para oficina.
 */

export const WORK_ORDER_TIPOS = [
  "oficina",
  "assistencia_tecnica",
  "manutencao",
  "instalacao",
  "consultoria",
  "servicos_gerais",
  "producao_leve",
  "estetica",
  "lava_rapido",
] as const;

export type WorkOrderTipo = (typeof WORK_ORDER_TIPOS)[number];

export const WORK_ORDER_TIPO_LABELS: Record<WorkOrderTipo, string> = {
  oficina: "Oficina / Veículo",
  assistencia_tecnica: "Assistência técnica",
  manutencao: "Manutenção",
  instalacao: "Instalação",
  consultoria: "Consultoria",
  servicos_gerais: "Serviços gerais",
  producao_leve: "Produção leve",
  estetica: "Estética",
  lava_rapido: "Lava-rápido",
};

export type WorkOrderTemplateDef = {
  key: WorkOrderTipo;
  nome: string;
  requiresVeiculo: boolean;
  requiresChecklist: boolean;
  defaultStatus: string;
  etapas: string[];
  campos: string[];
};

export const WORK_ORDER_TEMPLATES: WorkOrderTemplateDef[] = [
  {
    key: "oficina",
    nome: "Oficina",
    requiresVeiculo: true,
    requiresChecklist: true,
    defaultStatus: "aberta",
    etapas: [
      "aberta",
      "aguardando_diagnostico",
      "aguardando_aprovacao",
      "aprovada",
      "em_execucao",
      "aguardando_peca",
      "concluida",
      "entregue",
    ],
    campos: ["veiculo", "km", "diagnostico", "checklist", "mecanico"],
  },
  {
    key: "assistencia_tecnica",
    nome: "Assistência técnica",
    requiresVeiculo: false,
    requiresChecklist: true,
    defaultStatus: "aberta",
    etapas: ["aberta", "diagnostico", "aprovacao", "execucao", "concluida"],
    campos: ["equipamento", "diagnostico", "checklist"],
  },
  {
    key: "manutencao",
    nome: "Manutenção",
    requiresVeiculo: false,
    requiresChecklist: true,
    defaultStatus: "aberta",
    etapas: ["aberta", "planejada", "em_execucao", "concluida"],
    campos: ["local", "ativo", "checklist"],
  },
  {
    key: "instalacao",
    nome: "Instalação",
    requiresVeiculo: false,
    requiresChecklist: true,
    defaultStatus: "aberta",
    etapas: ["aberta", "agendada", "em_execucao", "concluida"],
    campos: ["endereco", "checklist", "materiais"],
  },
  {
    key: "consultoria",
    nome: "Consultoria",
    requiresVeiculo: false,
    requiresChecklist: false,
    defaultStatus: "aberta",
    etapas: ["aberta", "em_andamento", "entregue"],
    campos: ["escopo", "horas"],
  },
  {
    key: "servicos_gerais",
    nome: "Serviços gerais",
    requiresVeiculo: false,
    requiresChecklist: false,
    defaultStatus: "aberta",
    etapas: ["aberta", "em_execucao", "concluida"],
    campos: ["descricao", "servicos"],
  },
  {
    key: "producao_leve",
    nome: "Produção leve",
    requiresVeiculo: false,
    requiresChecklist: true,
    defaultStatus: "aberta",
    etapas: ["aberta", "em_producao", "concluida"],
    campos: ["materiais", "horas", "checklist"],
  },
  {
    key: "estetica",
    nome: "Estética",
    requiresVeiculo: true,
    requiresChecklist: true,
    defaultStatus: "aberta",
    etapas: ["aberta", "em_execucao", "concluida", "entregue"],
    campos: ["veiculo", "checklist", "fotos"],
  },
  {
    key: "lava_rapido",
    nome: "Lava-rápido",
    requiresVeiculo: true,
    requiresChecklist: true,
    defaultStatus: "aberta",
    etapas: ["aberta", "em_execucao", "entregue"],
    campos: ["veiculo", "checklist", "fotos", "servicos"],
  },
];

export function getWorkOrderTemplate(
  tipo: string | null | undefined,
): WorkOrderTemplateDef {
  const key = (tipo ?? "oficina") as WorkOrderTipo;
  return (
    WORK_ORDER_TEMPLATES.find((t) => t.key === key) ?? WORK_ORDER_TEMPLATES[0]!
  );
}

export function isValidWorkOrderTipo(value: string): value is WorkOrderTipo {
  return (WORK_ORDER_TIPOS as readonly string[]).includes(value);
}
