/**
 * Sprint 30.7 — Templates desativados por padrão, tenant-safe.
 */

import type {
  AutomationAction,
  AutomationCondition,
  AutomationModule,
  AutomationTriggerType,
} from "./types.ts";

export type AutomationTemplate = {
  id: string;
  name: string;
  description: string;
  module: AutomationModule;
  triggerType: AutomationTriggerType;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  requiresApproval: boolean;
  segments: string[];
  /** Sempre false — ativação só após configuração explícita. */
  defaultActive: false;
};

function cond(
  id: string,
  field: string,
  op: AutomationCondition["op"],
  value: unknown,
): AutomationCondition {
  return { id, field, op, value };
}

function act(
  id: string,
  type: AutomationAction["type"],
  label: string,
  requiresApproval = false,
): AutomationAction {
  return { id, type, label, requiresApproval, payload: {} };
}

export const AUTOMATION_TEMPLATES: readonly AutomationTemplate[] = [
  {
    id: "tpl-fin-conta-vencida",
    name: "Conta vencida → tarefa de cobrança",
    description: "Cria tarefa interna de cobrança quando a conta vence.",
    module: "financeiro",
    triggerType: "fin.conta_vencida",
    conditions: [cond("c1", "diasAtraso", "gte", 1)],
    actions: [
      act("a1", "criar_tarefa", "Tarefa de cobrança", true),
      act("a2", "rascunho_cobranca", "Rascunho de cobrança", true),
    ],
    requiresApproval: true,
    segments: ["*"],
    defaultActive: false,
  },
  {
    id: "tpl-fin-caixa-negativo",
    name: "Caixa negativo projetado → alertar gestor",
    description: "Alerta e escala gestor quando a projeção fica negativa.",
    module: "financeiro",
    triggerType: "fin.caixa_projetado_negativo",
    conditions: [cond("c1", "saldoProjetado", "lt", 0)],
    actions: [
      act("a1", "criar_alerta", "Alerta de caixa"),
      act("a2", "escalar_gestor", "Escalar gestor", true),
    ],
    requiresApproval: true,
    segments: ["*"],
    defaultActive: false,
  },
  {
    id: "tpl-fin-despesa-orcamento",
    name: "Despesa acima do orçamento → revisão",
    description: "Solicita revisão quando a despesa ultrapassa o orçamento.",
    module: "financeiro",
    triggerType: "fin.despesa_acima_orcamento",
    conditions: [cond("c1", "percentual", "gt", 100)],
    actions: [act("a1", "criar_aprovacao", "Solicitar revisão", true)],
    requiresApproval: true,
    segments: ["*"],
    defaultActive: false,
  },
  {
    id: "tpl-crm-lead-sem-retorno",
    name: "Lead sem retorno → follow-up",
    description: "Cria rascunho de follow-up para lead parado.",
    module: "crm",
    triggerType: "crm.lead_sem_retorno",
    conditions: [cond("c1", "diasSemContato", "gte", 3)],
    actions: [act("a1", "rascunho_followup", "Rascunho de follow-up")],
    requiresApproval: false,
    segments: ["*"],
    defaultActive: false,
  },
  {
    id: "tpl-crm-oportunidade-parada",
    name: "Oportunidade parada → alertar responsável",
    description: "Alerta o responsável quando a oportunidade não avança.",
    module: "crm",
    triggerType: "crm.oportunidade_parada",
    conditions: [cond("c1", "diasParada", "gte", 5)],
    actions: [
      act("a1", "criar_alerta", "Alerta de oportunidade"),
      act("a2", "notificar_interno", "Notificar responsável"),
    ],
    requiresApproval: false,
    segments: ["*"],
    defaultActive: false,
  },
  {
    id: "tpl-crm-proposta-validade",
    name: "Proposta próxima da validade → lembrete",
    description: "Lembrete interno antes do vencimento da proposta.",
    module: "crm",
    triggerType: "crm.proposta_proxima_validade",
    conditions: [cond("c1", "diasParaValidade", "lte", 3)],
    actions: [act("a1", "criar_lembrete", "Lembrete de validade")],
    requiresApproval: false,
    segments: ["consultoria", "servicos", "comercio", "*"],
    defaultActive: false,
  },
  {
    id: "tpl-ops-os-atrasada",
    name: "OS atrasada → escalar prioridade",
    description: "Atualiza prioridade e notifica responsável.",
    module: "operacao",
    triggerType: "ops.os_atrasada",
    conditions: [cond("c1", "diasAtraso", "gte", 1)],
    actions: [
      act("a1", "atualizar_prioridade", "Prioridade alta"),
      act("a2", "escalar_gestor", "Escalar gestor", true),
    ],
    requiresApproval: true,
    segments: ["oficina", "servicos", "*"],
    defaultActive: false,
  },
  {
    id: "tpl-ops-tarefa-vencida",
    name: "Tarefa vencida → notificar responsável",
    description: "Notificação interna para tarefa vencida.",
    module: "operacao",
    triggerType: "ops.tarefa_vencida",
    conditions: [cond("c1", "diasAtraso", "gte", 1)],
    actions: [act("a1", "notificar_interno", "Notificar responsável")],
    requiresApproval: false,
    segments: ["*"],
    defaultActive: false,
  },
  {
    id: "tpl-ops-agenda-conflito",
    name: "Agenda com conflito → alerta",
    description: "Cria alerta quando há conflito de agenda.",
    module: "operacao",
    triggerType: "ops.agenda_conflito",
    conditions: [cond("c1", "eventoIds", "is_not_empty", null)],
    actions: [act("a1", "criar_alerta", "Alerta de conflito")],
    requiresApproval: false,
    segments: ["*"],
    defaultActive: false,
  },
  {
    id: "tpl-est-minimo",
    name: "Estoque mínimo → rascunho de solicitação",
    description: "Rascunho de cotação/solicitação — sem baixa de estoque.",
    module: "estoque",
    triggerType: "est.estoque_abaixo_minimo",
    conditions: [cond("c1", "abaixoMinimo", "eq", true)],
    actions: [act("a1", "rascunho_cotacao", "Rascunho de solicitação", true)],
    requiresApproval: true,
    segments: ["oficina", "comercio", "restaurante", "distribuicao", "industria", "*"],
    defaultActive: false,
  },
  {
    id: "tpl-compras-atrasada",
    name: "Compra atrasada → alertar comprador",
    description: "Alerta interno ao comprador.",
    module: "compras",
    triggerType: "compras.compra_atrasada",
    conditions: [cond("c1", "diasAtraso", "gte", 1)],
    actions: [act("a1", "criar_alerta", "Alerta ao comprador")],
    requiresApproval: false,
    segments: ["*"],
    defaultActive: false,
  },
  {
    id: "tpl-est-validade",
    name: "Validade próxima → plano de ação",
    description: "Cria rascunho de plano de ação para lotes próximos.",
    module: "estoque",
    triggerType: "est.validade_proxima",
    conditions: [cond("c1", "diasParaValidade", "lte", 7)],
    actions: [act("a1", "criar_plano_acao", "Plano de ação", true)],
    requiresApproval: true,
    segments: ["restaurante", "comercio", "*"],
    defaultActive: false,
  },
  {
    id: "tpl-metas-abaixo",
    name: "Meta abaixo → plano de ação",
    description: "Plano de ação quando a meta fica abaixo do esperado.",
    module: "metas",
    triggerType: "metas.meta_abaixo",
    conditions: [cond("c1", "percentual", "lt", 80)],
    actions: [act("a1", "criar_plano_acao", "Plano de ação", true)],
    requiresApproval: true,
    segments: ["*"],
    defaultActive: false,
  },
  {
    id: "tpl-metas-kpi-critico",
    name: "KPI crítico → notificar gestor",
    description: "Notifica gestor quando o KPI Health é crítico.",
    module: "metas",
    triggerType: "metas.indicador_critico",
    conditions: [cond("c1", "level", "eq", "critico")],
    actions: [
      act("a1", "notificar_interno", "Notificar gestor"),
      act("a2", "escalar_gestor", "Escalar", true),
    ],
    requiresApproval: true,
    segments: ["*"],
    defaultActive: false,
  },
] as const;

export function templatesForSegment(segment: string | null | undefined): AutomationTemplate[] {
  const s = (segment ?? "generico").toLowerCase();
  return AUTOMATION_TEMPLATES.filter(
    (t) => t.segments.includes("*") || t.segments.includes(s),
  );
}

export function getTemplate(id: string): AutomationTemplate | undefined {
  return AUTOMATION_TEMPLATES.find((t) => t.id === id);
}
