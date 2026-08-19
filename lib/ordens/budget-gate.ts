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
