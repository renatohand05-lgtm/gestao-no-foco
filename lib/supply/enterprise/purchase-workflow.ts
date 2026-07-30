/**
 * Fase 25 — Workflow configurável de compras.
 */

import type { PurchaseWorkflowStatus } from "./types.ts";

export const PURCHASE_WORKFLOW_STATUSES: readonly PurchaseWorkflowStatus[] = [
  "rascunho",
  "solicitacao",
  "aprovacao",
  "cotacao",
  "comparacao",
  "pedido",
  "recebimento",
  "conferencia",
  "integrado",
  "cancelado",
] as const;

export const PURCHASE_STATUS_LABELS: Record<PurchaseWorkflowStatus, string> = {
  rascunho: "Rascunho",
  solicitacao: "Solicitação",
  aprovacao: "Aprovação",
  cotacao: "Cotação",
  comparacao: "Comparação",
  pedido: "Pedido",
  recebimento: "Recebimento",
  conferencia: "Conferência",
  integrado: "Integrado",
  cancelado: "Cancelado",
};

/** Transições permitidas (grafo configurável default). */
export const DEFAULT_PURCHASE_TRANSITIONS: Record<
  PurchaseWorkflowStatus,
  readonly PurchaseWorkflowStatus[]
> = {
  rascunho: ["solicitacao", "cancelado"],
  solicitacao: ["aprovacao", "cancelado"],
  aprovacao: ["cotacao", "pedido", "cancelado"],
  cotacao: ["comparacao", "pedido", "cancelado"],
  comparacao: ["pedido", "cotacao", "cancelado"],
  pedido: ["recebimento", "cancelado"],
  recebimento: ["conferencia", "cancelado"],
  conferencia: ["integrado", "recebimento"],
  integrado: [],
  cancelado: [],
};

export function canTransitionPurchase(
  from: PurchaseWorkflowStatus,
  to: PurchaseWorkflowStatus,
  custom?: Partial<Record<PurchaseWorkflowStatus, readonly PurchaseWorkflowStatus[]>>,
): boolean {
  const map = { ...DEFAULT_PURCHASE_TRANSITIONS, ...custom };
  return (map[from] ?? []).includes(to);
}

export function assertPurchaseTransition(
  from: PurchaseWorkflowStatus,
  to: PurchaseWorkflowStatus,
): void {
  if (!canTransitionPurchase(from, to)) {
    throw new Error(
      `Transição de compra inválida: ${from} → ${to}. Workflow configurável.`,
    );
  }
}

export function assertPurchaseStatus(raw: string): PurchaseWorkflowStatus {
  if ((PURCHASE_WORKFLOW_STATUSES as readonly string[]).includes(raw)) {
    return raw as PurchaseWorkflowStatus;
  }
  throw new Error(`Status de compra inválido: ${raw}`);
}

/** Etapas que disparam integração estoque (após conferência). */
export function purchaseTriggersStockIntegration(
  status: PurchaseWorkflowStatus,
): boolean {
  return status === "integrado";
}

/** Etapas que disparam integração financeira (contas a pagar). */
export function purchaseTriggersFinanceIntegration(
  status: PurchaseWorkflowStatus,
): boolean {
  return status === "integrado";
}

export type PurchaseLineDraft = {
  produtoId: string;
  quantidade: number;
  precoUnitario: number | null;
  fornecedorId: string | null;
};

export function validatePurchaseLines(lines: PurchaseLineDraft[]): string[] {
  const errors: string[] = [];
  if (lines.length === 0) errors.push("Pedido exige ao menos um item.");
  for (const [i, line] of lines.entries()) {
    if (!line.produtoId) errors.push(`Item ${i + 1}: produto obrigatório.`);
    if (!(line.quantidade > 0) || !Number.isFinite(line.quantidade)) {
      errors.push(`Item ${i + 1}: quantidade inválida.`);
    }
    if (
      line.precoUnitario != null &&
      (!Number.isFinite(line.precoUnitario) || line.precoUnitario < 0)
    ) {
      errors.push(`Item ${i + 1}: preço unitário inválido.`);
    }
  }
  return errors;
}

export function sumPurchaseLines(lines: PurchaseLineDraft[]): number | null {
  let total = 0;
  let any = false;
  for (const line of lines) {
    if (line.precoUnitario == null) continue;
    any = true;
    total += line.precoUnitario * line.quantidade;
  }
  return any && Number.isFinite(total) ? total : null;
}
