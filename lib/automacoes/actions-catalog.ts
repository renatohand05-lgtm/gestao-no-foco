/**
 * Sprint 30.7 — Ações internas permitidas × bloqueadas.
 */

import type { AutomationAction, AutomationActionType } from "./types.ts";

export type ActionDefinition = {
  type: AutomationActionType;
  label: string;
  description: string;
  /** Sempre exige aprovação explícita antes de efeito persistente. */
  sensitive: boolean;
  allowed: true;
};

export const ALLOWED_ACTIONS: readonly ActionDefinition[] = [
  {
    type: "criar_tarefa",
    label: "Criar tarefa",
    description: "Cria tarefa interna (CRM/operacional).",
    sensitive: false,
    allowed: true,
  },
  {
    type: "criar_alerta",
    label: "Criar alerta",
    description: "Cria alerta interno na plataforma.",
    sensitive: false,
    allowed: true,
  },
  {
    type: "criar_plano_acao",
    label: "Criar plano de ação",
    description: "Gera rascunho de plano de ação.",
    sensitive: true,
    allowed: true,
  },
  {
    type: "criar_aprovacao",
    label: "Criar aprovação",
    description: "Abre pedido de aprovação.",
    sensitive: true,
    allowed: true,
  },
  {
    type: "atribuir_responsavel",
    label: "Atribuir responsável",
    description: "Define responsável em tarefa/alerta.",
    sensitive: false,
    allowed: true,
  },
  {
    type: "atualizar_prioridade",
    label: "Atualizar prioridade",
    description: "Ajusta prioridade de item interno.",
    sensitive: false,
    allowed: true,
  },
  {
    type: "adicionar_observacao",
    label: "Adicionar observação",
    description: "Registra observação no histórico.",
    sensitive: false,
    allowed: true,
  },
  {
    type: "rascunho_followup",
    label: "Rascunho de follow-up",
    description: "Prepara rascunho — não envia mensagem.",
    sensitive: false,
    allowed: true,
  },
  {
    type: "rascunho_cobranca",
    label: "Rascunho de cobrança",
    description: "Prepara rascunho — sem lançamento financeiro.",
    sensitive: true,
    allowed: true,
  },
  {
    type: "rascunho_cotacao",
    label: "Rascunho de cotação",
    description: "Prepara rascunho de cotação/compra.",
    sensitive: true,
    allowed: true,
  },
  {
    type: "criar_lembrete",
    label: "Criar lembrete",
    description: "Lembrete interno na plataforma.",
    sensitive: false,
    allowed: true,
  },
  {
    type: "registrar_evento",
    label: "Registrar evento",
    description: "Evento de auditoria/timeline.",
    sensitive: false,
    allowed: true,
  },
  {
    type: "notificar_interno",
    label: "Notificar na plataforma",
    description: "Notificação in-app apenas.",
    sensitive: false,
    allowed: true,
  },
  {
    type: "vincular_insight",
    label: "Vincular insight",
    description: "Associa insight do Decision Center.",
    sensitive: false,
    allowed: true,
  },
  {
    type: "abrir_deep_link",
    label: "Abrir deep link",
    description: "Sugere navegação interna.",
    sensitive: false,
    allowed: true,
  },
  {
    type: "pausar_regra",
    label: "Pausar regra",
    description: "Pausa a própria regra (anti-loop).",
    sensitive: true,
    allowed: true,
  },
  {
    type: "escalar_gestor",
    label: "Escalar para gestor",
    description: "Notifica/escala gestor interno.",
    sensitive: true,
    allowed: true,
  },
] as const;

/** Ações explicitamente bloqueadas nesta sprint (sem integração real). */
export const BLOCKED_EXTERNAL_ACTIONS = [
  "whatsapp",
  "email",
  "sms",
  "webhook",
  "pagamento",
  "lancamento_financeiro",
  "alteracao_fiscal",
  "baixa_estoque",
  "exclusao",
  "cancelamento_externo",
] as const;

const ALLOWED_SET = new Set(ALLOWED_ACTIONS.map((a) => a.type));

export function isAllowedActionType(type: string): type is AutomationActionType {
  return ALLOWED_SET.has(type as AutomationActionType);
}

export function isBlockedExternal(type: string): boolean {
  return (BLOCKED_EXTERNAL_ACTIONS as readonly string[]).includes(type);
}

export function validateActions(actions: AutomationAction[]): string[] {
  const errors: string[] = [];
  for (const a of actions) {
    if (!isAllowedActionType(a.type)) {
      errors.push(
        isBlockedExternal(a.type)
          ? `Ação externa bloqueada: ${a.type}`
          : `Ação não permitida: ${a.type}`,
      );
    }
  }
  if (!actions.length) errors.push("Regra sem ações.");
  return errors;
}

export function actionRequiresApproval(action: AutomationAction): boolean {
  if (action.requiresApproval) return true;
  const def = ALLOWED_ACTIONS.find((a) => a.type === action.type);
  return Boolean(def?.sensitive);
}
