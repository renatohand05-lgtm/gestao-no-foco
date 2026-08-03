/**
 * Sprint 30.7 — Contratos Central de Automações.
 * Regra ≠ execução. Sem side-effects externos.
 */

export type AutomationRuleStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "active"
  | "paused"
  | "disabled"
  | "failed"
  | "archived";

export type AutomationExecutionStatus =
  | "queued"
  | "evaluating"
  | "waiting_approval"
  | "approved"
  | "executing"
  | "completed"
  | "partially_completed"
  | "failed"
  | "cancelled"
  | "skipped"
  | "rolled_back";

export type AutomationModule =
  | "financeiro"
  | "crm"
  | "operacao"
  | "estoque"
  | "compras"
  | "metas"
  | "inteligencia"
  | "tributario";

export type ConditionOperator =
  | "eq"
  | "neq"
  | "gt"
  | "lt"
  | "gte"
  | "lte"
  | "contains"
  | "not_contains"
  | "is_empty"
  | "is_not_empty"
  | "within_period"
  | "outside_period"
  | "changed_from"
  | "changed_to"
  | "stayed_for"
  | "occurrence_count"
  | "and"
  | "or";

export type AutomationCondition = {
  id: string;
  op: ConditionOperator;
  field?: string;
  value?: unknown;
  valueTo?: unknown;
  unit?: "minutes" | "hours" | "days";
  conditions?: AutomationCondition[];
};

export type AutomationActionType =
  | "criar_tarefa"
  | "criar_alerta"
  | "criar_plano_acao"
  | "criar_aprovacao"
  | "atribuir_responsavel"
  | "atualizar_prioridade"
  | "adicionar_observacao"
  | "rascunho_followup"
  | "rascunho_cobranca"
  | "rascunho_cotacao"
  | "criar_lembrete"
  | "registrar_evento"
  | "notificar_interno"
  | "vincular_insight"
  | "abrir_deep_link"
  | "pausar_regra"
  | "escalar_gestor";

export type AutomationAction = {
  id: string;
  type: AutomationActionType;
  label: string;
  payload?: Record<string, unknown>;
  requiresApproval?: boolean;
};

export type AutomationTriggerType =
  | "fin.conta_vencida"
  | "fin.conta_proxima_vencimento"
  | "fin.caixa_projetado_negativo"
  | "fin.inadimplencia_acima_limite"
  | "fin.despesa_acima_orcamento"
  | "fin.margem_abaixo_limite"
  | "crm.lead_sem_retorno"
  | "crm.oportunidade_parada"
  | "crm.followup_vencido"
  | "crm.proposta_proxima_validade"
  | "crm.cliente_sem_contato"
  | "crm.oportunidade_perdida"
  | "ops.os_atrasada"
  | "ops.os_parada"
  | "ops.recurso_indisponivel"
  | "ops.agenda_conflito"
  | "ops.tarefa_vencida"
  | "ops.capacidade_excedida"
  | "est.estoque_abaixo_minimo"
  | "est.produto_zerado"
  | "est.validade_proxima"
  | "compras.compra_atrasada"
  | "compras.divergencia_recebimento"
  | "compras.fornecedor_acima_lead_time"
  | "metas.meta_abaixo"
  | "metas.indicador_critico"
  | "intel.risco_novo"
  | "intel.oportunidade_identificada"
  | "intel.kpi_mudou_status"
  | "tax.regra_proxima_vigencia"
  | "tax.obrigacao_proxima"
  | "tax.configuracao_incompleta";

export type AutomationRule = {
  id: string;
  tenantId: string;
  companyId: string | null;
  branchId: string | null;
  name: string;
  description: string;
  module: AutomationModule;
  triggerType: AutomationTriggerType;
  triggerConfig: Record<string, unknown>;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  status: AutomationRuleStatus;
  priority: "baixa" | "media" | "alta" | "critica";
  requiresApproval: boolean;
  approvalRole: string | null;
  cooldownSeconds: number;
  maxExecutions: number | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  templateId: string | null;
  segmentHints: string[];
};

export type AutomationExecution = {
  id: string;
  tenantId: string;
  ruleId: string;
  triggerType: AutomationTriggerType;
  triggerPayload: Record<string, unknown>;
  matchedConditions: AutomationCondition[];
  actionsRequested: AutomationAction[];
  actionsExecuted: Array<{
    actionId: string;
    type: AutomationActionType;
    status: "proposed" | "executed" | "skipped" | "failed" | "rolled_back";
    result?: Record<string, unknown>;
    error?: string;
  }>;
  status: AutomationExecutionStatus;
  errorCode: string | null;
  errorMessage: string | null;
  retryCount: number;
  idempotencyKey: string;
  correlationId: string;
  dryRun: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
};

export type AutomationApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "returned"
  | "cancelled"
  | "expired"
  | "delegated";

export type AutomationApproval = {
  id: string;
  tenantId: string;
  ruleId: string | null;
  executionId: string | null;
  status: AutomationApprovalStatus;
  requestedBy: string;
  decidedBy: string | null;
  justification: string | null;
  createdAt: string;
  decidedAt: string | null;
  expiresAt: string | null;
  history: Array<{
    at: string;
    userId: string;
    decision: AutomationApprovalStatus;
    justification: string | null;
  }>;
};

export type AutomationAuditEvent = {
  id: string;
  tenantId: string;
  ruleId: string | null;
  executionId: string | null;
  event:
    | "rule_created"
    | "rule_edited"
    | "rule_activated"
    | "rule_paused"
    | "rule_archived"
    | "simulation"
    | "execution"
    | "approval"
    | "rejection"
    | "retry"
    | "failure"
    | "rollback"
    | "owner_changed"
    | "condition_changed"
    | "action_changed";
  userId: string | null;
  origin: string;
  result: string;
  correlationId: string | null;
  createdAt: string;
};

export type InternalAutomationNotification = {
  id: string;
  tenantId: string;
  userId: string | null;
  title: string;
  body: string;
  priority: "baixa" | "media" | "alta" | "critica";
  category:
    | "aprovacao"
    | "falha"
    | "pausa"
    | "tarefa"
    | "alerta"
    | "prazo"
    | "execucao";
  href: string | null;
  readAt: string | null;
  archivedAt: string | null;
  createdAt: string;
};

export type DryRunResult = {
  ok: boolean;
  ruleId: string;
  tenantId: string;
  matched: boolean;
  matchedConditions: AutomationCondition[];
  affectedRecords: Array<{ id: string; label: string; evidence: string }>;
  proposedActions: AutomationAction[];
  risks: string[];
  requiresApproval: boolean;
  blockedActions: string[];
  correlationId: string;
  persistedFinalAction: false;
};

export type AutomationCentralSnapshot = {
  tenantId: string;
  schemaReady: boolean;
  activeRules: number;
  pausedRules: number;
  recentExecutions: AutomationExecution[];
  failures: AutomationExecution[];
  waitingApproval: AutomationApproval[];
  generatedTasks: number;
  timeSavedMinutes: number | null;
  modulesAutomated: Array<{ module: AutomationModule; count: number }>;
  nextTriggers: Array<{ triggerType: AutomationTriggerType; label: string }>;
  health: "saudavel" | "atencao" | "critico";
  healthReason: string;
  rules: AutomationRule[];
  notifications: InternalAutomationNotification[];
  audit: AutomationAuditEvent[];
};
