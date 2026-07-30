/**
 * Sprint 25.4.3 — Undo completo de NF-e (elegibilidade + plano).
 * Não apaga fisicamente registros fiscais.
 */

import {
  evaluateNfeUndo,
  type NfeDependencyFlags,
  type UndoBlockReason,
} from "../import-engine/delete/eligibility.ts";

export type NfeUndoState =
  | "totalmente_elegivel"
  | "parcialmente_elegivel"
  | "bloqueado"
  | "exige_compensacao"
  | "ja_desfeito";

export type NfeUndoPlanItem = {
  kind:
    | "reverter_movimento"
    | "desfazer_recebimento"
    | "cancelar_ap"
    | "recalcular_custo"
    | "atualizar_lote"
    | "atualizar_serie"
    | "marcar_nfe_desfeita"
    | "estorno_financeiro";
  eligible: boolean;
  blockedReason?: UndoBlockReason | "exige_compensacao";
  label: string;
};

export function classifyNfeUndoState(flags: NfeDependencyFlags): NfeUndoState {
  if (flags.alreadyUndone) return "ja_desfeito";
  if (flags.tenantMismatch) return "bloqueado";
  if (flags.apPaid || flags.receiptReconciled || flags.usedInClosing) {
    return "exige_compensacao";
  }
  const { eligible, reasons } = evaluateNfeUndo(flags);
  if (eligible) return "totalmente_elegivel";
  if (
    reasons.some((r) =>
      ["usado_em_venda", "movimentacao_posterior", "inventario"].includes(r),
    ) &&
    !flags.apPaid
  ) {
    return "parcialmente_elegivel";
  }
  return "bloqueado";
}

export function buildNfeUndoPlan(flags: NfeDependencyFlags): {
  state: NfeUndoState;
  items: NfeUndoPlanItem[];
  warning: string;
} {
  const state = classifyNfeUndoState(flags);
  const items: NfeUndoPlanItem[] = [
    {
      kind: "reverter_movimento",
      eligible:
        state === "totalmente_elegivel" ||
        (state === "parcialmente_elegivel" && !flags.laterOutbound),
      blockedReason: flags.laterOutbound ? "movimentacao_posterior" : undefined,
      label: "Criar movimentos de reversão de estoque",
    },
    {
      kind: "desfazer_recebimento",
      eligible: state === "totalmente_elegivel",
      blockedReason:
        state === "bloqueado" || state === "parcialmente_elegivel"
          ? "dependencia_generica"
          : undefined,
      label: "Desfazer recebimento",
    },
    {
      kind: "cancelar_ap",
      eligible: state === "totalmente_elegivel" && !flags.apPaid,
      blockedReason: flags.apPaid ? "pagamento" : undefined,
      label: "Cancelar título a pagar elegível",
    },
    {
      kind: "estorno_financeiro",
      eligible: false,
      blockedReason:
        flags.apPaid || flags.receiptReconciled
          ? "exige_compensacao"
          : undefined,
      label:
        "Estorno/compensação Finance Core (exige permissão + justificativa)",
    },
    {
      kind: "recalcular_custo",
      eligible: state === "totalmente_elegivel",
      label: "Recalcular custo médio",
    },
    {
      kind: "atualizar_lote",
      eligible: state === "totalmente_elegivel" || state === "parcialmente_elegivel",
      label: "Atualizar lotes vinculados",
    },
    {
      kind: "atualizar_serie",
      eligible: state === "totalmente_elegivel",
      label: "Atualizar séries vinculadas",
    },
    {
      kind: "marcar_nfe_desfeita",
      eligible: state !== "ja_desfeito" && state !== "bloqueado",
      label: "Marcar NF como desfeita (preservar chave e auditoria)",
    },
  ];

  let warning =
    "Esta ação pode alterar estoque e lançamentos financeiros. Revise o impacto antes de continuar.";
  if (state === "exige_compensacao") {
    warning =
      "Conta paga/conciliada ou fechamento financeiro: undo destrutivo bloqueado. Use estorno/compensação no Finance Core.";
  }
  if (state === "ja_desfeito") {
    warning = "NF-e já desfeita. Segunda reversão bloqueada.";
  }

  return { state, items, warning };
}

export function assertNfeUndoExecutable(state: NfeUndoState) {
  if (state === "ja_desfeito") {
    throw new Error("NF-e já desfeita — segunda reversão bloqueada.");
  }
  if (state === "bloqueado") {
    throw new Error("Undo de NF-e bloqueado por dependências.");
  }
  if (state === "exige_compensacao") {
    throw new Error(
      "Undo destrutivo bloqueado. Conta paga/conciliada exige fluxo de estorno no Finance Core.",
    );
  }
}
