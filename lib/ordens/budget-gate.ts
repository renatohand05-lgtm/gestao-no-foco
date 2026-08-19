/**
 * Gate central: orçamento vs diagnóstico.
 * Sem `if (segment === ...)`. Oficina (automotiveWorkflow) exige diagnóstico;
 * lava e serviços simples não.
 */
export function requiresDiagnosisBeforeBudget(input: {
  automotiveWorkflow?: boolean | null;
}): boolean {
  return input.automotiveWorkflow !== false;
}

/**
 * Gate central de aprovação do orçamento.
 * Lava (sem diagnóstico obrigatório): orçamento publicado → aprovação.
 * Oficina (com diagnóstico): diagnóstico concluído + orçamento publicado.
 */
export function canAdvanceToApproval(input: {
  workflowConfig: { automotiveWorkflow?: boolean | null };
  budgetPublished: boolean;
  diagnosisCompleted?: boolean;
  osStatus?: string;
}): { ok: boolean; reason: string } {
  const status = input.osStatus ?? "";
  if (["cancelado", "cancelada"].includes(status)) {
    return { ok: false, reason: "Atendimento cancelado não permite aprovação." };
  }
  if (status === "faturado") {
    return { ok: false, reason: "Atendimento faturado não permite aprovação." };
  }
  if (status === "entregue") {
    return {
      ok: false,
      reason: "Este atendimento já foi entregue. A aprovação não se aplica.",
    };
  }
  if (!input.budgetPublished) {
    return {
      ok: false,
      reason: "Publique o orçamento antes de solicitar aprovação.",
    };
  }
  if (
    requiresDiagnosisBeforeBudget(input.workflowConfig) &&
    !input.diagnosisCompleted
  ) {
    return {
      ok: false,
      reason: "Conclua o diagnóstico antes de solicitar aprovação.",
    };
  }
  return { ok: true, reason: "" };
}

export const ORCAMENTO_VERSION_STATUSES = [
  "rascunho",
  "pronto",
  "publicado",
  "enviado",
  "aprovado",
  "reprovado",
  "expirado",
  "cancelado",
  "supersedido",
] as const;

export type OrcamentoVersionStatus = (typeof ORCAMENTO_VERSION_STATUSES)[number];

export const ORCAMENTO_VERSION_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  pronto: "Pronto para envio",
  publicado: "Pronto para envio",
  enviado: "Enviado",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  expirado: "Expirado",
  cancelado: "Cancelado",
  supersedido: "Substituído",
};

export function labelOrcamentoVersionStatus(status: string): string {
  return ORCAMENTO_VERSION_LABELS[status] ?? status;
}

export const OS_CANCEL_REASONS = [
  { id: "engano", label: "Criada por engano", obsRequired: false },
  { id: "cliente", label: "Cliente cancelou", obsRequired: false },
  { id: "duplicada", label: "Duplicada", obsRequired: false },
  { id: "nao_compareceu", label: "Não compareceu", obsRequired: false },
  { id: "outro", label: "Outro", obsRequired: true },
] as const;

export type OsCancelReasonId = (typeof OS_CANCEL_REASONS)[number]["id"];
