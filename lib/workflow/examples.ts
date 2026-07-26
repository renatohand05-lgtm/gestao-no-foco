/**
 * Sprint 21.3 — Exemplos de workflow (apenas testes / documentação interna).
 * Não integrados ao sistema.
 */

import { createAction } from "./actions.ts";
import { createWorkflowDefinition } from "./definitions.ts";
import { createState } from "./states.ts";
import { createTransition } from "./transitions.ts";
import type { WorkflowDefinition } from "./types.ts";

/** Exemplo 1 — Aprovação de pagamento */
export function paymentApprovalWorkflow(
  tenantId?: string | null,
): WorkflowDefinition {
  return createWorkflowDefinition({
    id: "payment-approval",
    version: "1.0.0",
    name: "Aprovação de Pagamento",
    description: "draft → pending_approval → approved → paid",
    tenantScope: tenantId ? "tenant" : "global",
    tenantId: tenantId ?? null,
    initialState: "draft",
    finalStates: ["paid", "cancelled"],
    states: [
      createState({ id: "draft", name: "Rascunho", type: "initial", isInitial: true }),
      createState({ id: "pending_approval", name: "Aguardando aprovação", type: "approval" }),
      createState({ id: "approved", name: "Aprovado", type: "intermediate" }),
      createState({ id: "paid", name: "Pago", type: "completed", isFinal: true, isTerminal: true }),
      createState({ id: "cancelled", name: "Cancelado", type: "cancelled", isFinal: true, isTerminal: true }),
    ],
    transitions: [
      createTransition({
        id: "t_submit",
        event: "SUBMIT",
        from: "draft",
        to: "pending_approval",
        requiredPermissions: ["financeiro.criar"],
        actions: [createAction("REQUEST_APPROVAL", { kind: "payment" })],
        priority: 10,
      }),
      createTransition({
        id: "t_approve",
        event: "APPROVE",
        from: "pending_approval",
        to: "approved",
        requiredRoles: ["financeiro", "diretor", "proprietario"],
        roleMode: "any",
        requiredPermissions: ["financeiro.aprovar"],
        permissionMode: "all",
        conditions: [
          { op: "greaterThanOrEqual", path: "variables.amount", value: 0 },
        ],
        actions: [
          createAction("SEND_NOTIFICATION", { channel: "approver" }),
          createAction("WRITE_AUDIT_EVENT", { event: "PAYMENT_APPROVED" }),
        ],
        priority: 10,
      }),
      createTransition({
        id: "t_reject",
        event: "REJECT",
        from: "pending_approval",
        to: "cancelled",
        requiredPermissions: ["financeiro.aprovar"],
        priority: 20,
      }),
      createTransition({
        id: "t_pay",
        event: "PAY",
        from: "approved",
        to: "paid",
        requiredPermissions: ["financeiro.transferir"],
        actions: [createAction("COMPLETE_WORKFLOW")],
        priority: 10,
      }),
      createTransition({
        id: "t_cancel_draft",
        event: "CANCEL",
        from: "draft",
        to: "cancelled",
        priority: 50,
      }),
      createTransition({
        id: "t_cancel_pending",
        event: "CANCEL",
        from: "pending_approval",
        to: "cancelled",
        priority: 50,
      }),
    ],
  });
}

/** Exemplo 2 — Ordem de Serviço */
export function serviceOrderWorkflow(): WorkflowDefinition {
  return createWorkflowDefinition({
    id: "service-order",
    version: "1.0.0",
    name: "Ordem de Serviço",
    description: "Fluxo operacional de OS",
    tenantScope: "global",
    initialState: "opened",
    finalStates: ["delivered", "cancelled"],
    states: [
      createState({ id: "opened", name: "Aberta", type: "initial", isInitial: true }),
      createState({ id: "diagnosis", name: "Diagnóstico", type: "intermediate" }),
      createState({ id: "awaiting_customer", name: "Aguardando cliente", type: "waiting" }),
      createState({ id: "approved", name: "Aprovada", type: "approval" }),
      createState({ id: "in_progress", name: "Em execução", type: "intermediate" }),
      createState({ id: "completed", name: "Concluída", type: "intermediate" }),
      createState({ id: "delivered", name: "Entregue", type: "completed", isFinal: true, isTerminal: true }),
      createState({ id: "cancelled", name: "Cancelada", type: "cancelled", isFinal: true, isTerminal: true }),
    ],
    transitions: [
      createTransition({ id: "os_diag", event: "START_DIAGNOSIS", from: "opened", to: "diagnosis" }),
      createTransition({ id: "os_wait", event: "WAIT_CUSTOMER", from: "diagnosis", to: "awaiting_customer" }),
      createTransition({
        id: "os_approve",
        event: "APPROVE",
        from: "awaiting_customer",
        to: "approved",
        requiredPermissions: ["os.aprovar"],
      }),
      createTransition({ id: "os_start", event: "START", from: "approved", to: "in_progress" }),
      createTransition({
        id: "os_complete",
        event: "COMPLETE",
        from: "in_progress",
        to: "completed",
        requiredPermissions: ["os.finalizar"],
      }),
      createTransition({ id: "os_deliver", event: "DELIVER", from: "completed", to: "delivered" }),
      createTransition({ id: "os_cancel", event: "CANCEL", from: "opened", to: "cancelled" }),
    ],
  });
}

/** Exemplo 3 — Ajuste de estoque */
export function stockAdjustmentWorkflow(): WorkflowDefinition {
  return createWorkflowDefinition({
    id: "stock-adjustment",
    version: "1.0.0",
    name: "Ajuste de Estoque",
    description: "requested → pending_review → approved → applied",
    tenantScope: "global",
    initialState: "requested",
    finalStates: ["applied", "rejected"],
    states: [
      createState({ id: "requested", name: "Solicitado", type: "initial", isInitial: true }),
      createState({ id: "pending_review", name: "Em revisão", type: "approval" }),
      createState({ id: "approved", name: "Aprovado", type: "intermediate" }),
      createState({ id: "applied", name: "Aplicado", type: "completed", isFinal: true, isTerminal: true }),
      createState({ id: "rejected", name: "Rejeitado", type: "cancelled", isFinal: true, isTerminal: true }),
    ],
    transitions: [
      createTransition({
        id: "st_submit",
        event: "SUBMIT",
        from: "requested",
        to: "pending_review",
        requiredPermissions: ["estoque.ajustar"],
      }),
      createTransition({
        id: "st_approve",
        event: "APPROVE",
        from: "pending_review",
        to: "approved",
        requiredPermissions: ["estoque.aprovar_ajuste"],
        conditions: [{ op: "exists", path: "variables.sku" }],
      }),
      createTransition({
        id: "st_reject",
        event: "REJECT",
        from: "pending_review",
        to: "rejected",
        requiredPermissions: ["estoque.aprovar_ajuste"],
      }),
      createTransition({
        id: "st_apply",
        event: "APPLY",
        from: "approved",
        to: "applied",
        requiredPermissions: ["estoque.movimentar"],
        actions: [createAction("EMIT_DOMAIN_EVENT", { name: "STOCK_ADJUSTMENT" })],
      }),
    ],
  });
}
