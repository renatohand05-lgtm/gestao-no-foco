/**
 * Sprint 25.4.2 — Regras puras de elegibilidade para desfazer importação.
 * Sem I/O. Nunca apaga dados em uso: bloqueia e opcionalmente sugere inativar.
 */

export type UndoBlockReason =
  | "usado_em_venda"
  | "usado_em_os"
  | "usado_em_orcamento"
  | "movimentacao_posterior"
  | "saldo_nao_zero"
  | "reserva_ativa"
  | "inventario"
  | "transferencia"
  | "pagamento"
  | "recebimento"
  | "conciliacao"
  | "fechamento_financeiro"
  | "documento_fiscal_posterior"
  | "ja_revertido"
  | "segunda_reversao"
  | "sem_permissao"
  | "cross_tenant"
  | "dependencia_generica";

export type EntityUndoDecision = {
  targetType: string;
  targetId: string;
  rowNumber?: number;
  eligible: boolean;
  action: "delete" | "soft_delete" | "reverse_movement" | "inactivate" | "skip" | "block";
  blockReasons: UndoBlockReason[];
  label?: string;
};

export type ImportUndoEligibilitySummary = {
  status:
    | "elegivel"
    | "parcialmente_elegivel"
    | "bloqueado"
    | "ja_desfeito"
    | "arquivado"
    | "erro";
  eligibleCount: number;
  blockedCount: number;
  decisions: EntityUndoDecision[];
  highImpact: boolean;
  requiresTypedConfirmation: boolean;
};

export type ProductDependencyFlags = {
  usedInSale: boolean;
  usedInOs: boolean;
  usedInBudget: boolean;
  laterMovements: boolean;
  currentQty: number;
  reserved: boolean;
  inInventory: boolean;
  fiscalOrFinanceLink: boolean;
  alreadyReverted: boolean;
  tenantMismatch: boolean;
};

export type ServiceDependencyFlags = {
  usedInSale: boolean;
  usedInOs: boolean;
  usedInBudget: boolean;
  financeHistory: boolean;
  alreadyReverted: boolean;
  tenantMismatch: boolean;
};

export type StockMovementDependencyFlags = {
  alreadyReverted: boolean;
  laterMovementsOnProduct: boolean;
  inventoryDepends: boolean;
  tenantMismatch: boolean;
  originalQty: number;
};

export type NfeDependencyFlags = {
  alreadyUndone: boolean;
  productsSold: boolean;
  laterOutbound: boolean;
  apPaid: boolean;
  receiptReconciled: boolean;
  inventoryDepends: boolean;
  usedInClosing: boolean;
  tenantMismatch: boolean;
};

export function evaluateProductUndo(
  flags: ProductDependencyFlags,
): EntityUndoDecision["action"] {
  if (flags.tenantMismatch) return "block";
  if (flags.alreadyReverted) return "skip";
  const blocked =
    flags.usedInSale ||
    flags.usedInOs ||
    flags.usedInBudget ||
    flags.laterMovements ||
    flags.currentQty !== 0 ||
    flags.reserved ||
    flags.inInventory ||
    flags.fiscalOrFinanceLink;
  if (blocked) return "inactivate";
  return "soft_delete";
}

export function productBlockReasons(
  flags: ProductDependencyFlags,
): UndoBlockReason[] {
  const reasons: UndoBlockReason[] = [];
  if (flags.tenantMismatch) reasons.push("cross_tenant");
  if (flags.alreadyReverted) reasons.push("ja_revertido");
  if (flags.usedInSale) reasons.push("usado_em_venda");
  if (flags.usedInOs) reasons.push("usado_em_os");
  if (flags.usedInBudget) reasons.push("usado_em_orcamento");
  if (flags.laterMovements) reasons.push("movimentacao_posterior");
  if (flags.currentQty !== 0) reasons.push("saldo_nao_zero");
  if (flags.reserved) reasons.push("reserva_ativa");
  if (flags.inInventory) reasons.push("inventario");
  if (flags.fiscalOrFinanceLink) reasons.push("dependencia_generica");
  return reasons;
}

export function evaluateServiceUndo(
  flags: ServiceDependencyFlags,
): EntityUndoDecision["action"] {
  if (flags.tenantMismatch) return "block";
  if (flags.alreadyReverted) return "skip";
  if (
    flags.usedInSale ||
    flags.usedInOs ||
    flags.usedInBudget ||
    flags.financeHistory
  ) {
    return "inactivate";
  }
  return "soft_delete";
}

export function serviceBlockReasons(
  flags: ServiceDependencyFlags,
): UndoBlockReason[] {
  const reasons: UndoBlockReason[] = [];
  if (flags.tenantMismatch) reasons.push("cross_tenant");
  if (flags.alreadyReverted) reasons.push("ja_revertido");
  if (flags.usedInSale) reasons.push("usado_em_venda");
  if (flags.usedInOs) reasons.push("usado_em_os");
  if (flags.usedInBudget) reasons.push("usado_em_orcamento");
  if (flags.financeHistory) reasons.push("fechamento_financeiro");
  return reasons;
}

export function evaluateStockMovementUndo(
  flags: StockMovementDependencyFlags,
): EntityUndoDecision["action"] {
  if (flags.tenantMismatch) return "block";
  if (flags.alreadyReverted) return "skip";
  if (flags.laterMovementsOnProduct || flags.inventoryDepends) return "block";
  return "reverse_movement";
}

export function stockBlockReasons(
  flags: StockMovementDependencyFlags,
): UndoBlockReason[] {
  const reasons: UndoBlockReason[] = [];
  if (flags.tenantMismatch) reasons.push("cross_tenant");
  if (flags.alreadyReverted) reasons.push("segunda_reversao");
  if (flags.laterMovementsOnProduct) reasons.push("movimentacao_posterior");
  if (flags.inventoryDepends) reasons.push("inventario");
  return reasons;
}

export function evaluateNfeUndo(flags: NfeDependencyFlags): {
  eligible: boolean;
  reasons: UndoBlockReason[];
} {
  const reasons: UndoBlockReason[] = [];
  if (flags.tenantMismatch) reasons.push("cross_tenant");
  if (flags.alreadyUndone) reasons.push("ja_revertido");
  if (flags.productsSold) reasons.push("usado_em_venda");
  if (flags.laterOutbound) reasons.push("movimentacao_posterior");
  if (flags.apPaid) reasons.push("pagamento");
  if (flags.receiptReconciled) reasons.push("conciliacao");
  if (flags.inventoryDepends) reasons.push("inventario");
  if (flags.usedInClosing) reasons.push("fechamento_financeiro");
  return { eligible: reasons.length === 0, reasons };
}

export function summarizeUndoDecisions(
  decisions: EntityUndoDecision[],
  opts?: { alreadyRolledBack?: boolean; archived?: boolean },
): ImportUndoEligibilitySummary {
  if (opts?.archived) {
    return {
      status: "arquivado",
      eligibleCount: 0,
      blockedCount: decisions.length,
      decisions,
      highImpact: false,
      requiresTypedConfirmation: false,
    };
  }
  if (opts?.alreadyRolledBack) {
    return {
      status: "ja_desfeito",
      eligibleCount: 0,
      blockedCount: decisions.length,
      decisions,
      highImpact: false,
      requiresTypedConfirmation: false,
    };
  }

  const eligible = decisions.filter(
    (d) =>
      d.eligible &&
      (d.action === "soft_delete" ||
        d.action === "delete" ||
        d.action === "reverse_movement"),
  );
  const blocked = decisions.filter(
    (d) => !d.eligible || d.action === "block" || d.action === "inactivate",
  );

  let status: ImportUndoEligibilitySummary["status"] = "bloqueado";
  if (eligible.length && blocked.length) status = "parcialmente_elegivel";
  else if (eligible.length) status = "elegivel";
  else if (!decisions.length) status = "bloqueado";

  const highImpact =
    eligible.some((d) => d.targetType.includes("estoque") || d.action === "reverse_movement") ||
    eligible.length >= 20;

  return {
    status,
    eligibleCount: eligible.length,
    blockedCount: blocked.length,
    decisions,
    highImpact,
    requiresTypedConfirmation: highImpact || eligible.length > 50,
  };
}

/** Idempotency key estável para reversão de movimento de estoque. */
export function stockReversalIdempotencyKey(input: {
  tenantId: string;
  importRunId: string;
  originalMovementId: string;
}): string {
  return `import-undo:${input.tenantId}:${input.importRunId}:${input.originalMovementId}`;
}

export function assertReasonRequired(reason: string | null | undefined): string {
  const t = reason?.trim() ?? "";
  if (t.length < 3) {
    throw new Error("Motivo obrigatório (mínimo 3 caracteres).");
  }
  return t;
}

export function assertTypedConfirmation(input: {
  required: boolean;
  typed: string | null | undefined;
  expected?: string;
}): void {
  if (!input.required) return;
  const expected = input.expected ?? "EXCLUIR";
  if ((input.typed ?? "").trim().toUpperCase() !== expected) {
    throw new Error(`Confirmação inválida. Digite ${expected} para confirmar.`);
  }
}
