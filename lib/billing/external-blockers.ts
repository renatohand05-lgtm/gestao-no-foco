/**
 * Blockers externos — não inventar workaround.
 * ASAAS_PRODUCTION_API_KEY_BLOCKER impede só provisionamento/cutover/cobrança real.
 */

export const ASAAS_PRODUCTION_API_KEY_BLOCKER = {
  id: "ASAAS_PRODUCTION_API_KEY_BLOCKER",
  status: "blocked_externally" as const,
  title: "API Key Production Asaas indisponível no painel",
  description:
    "Conta Production aprovada (KYC GO). Painel operacional. Botão Gerar chave de API desabilitado. Suporte Asaas acionado, sem resposta. Sem workaround.",
  blocks: [
    "provisioning_real",
    "cutover",
    "microtransaction",
    "real_charges",
  ] as const,
  doesNotBlock: [
    "sandbox",
    "local_tests",
    "build",
    "observability",
    "security",
    "docs",
    "webhook_code",
    "rollback_prep",
  ] as const,
  rules: [
    "Não tentar obter a key por outro canal.",
    "Não reutilizar ASAAS_API_KEY sandbox em production.",
    "Não alterar Vercel até a key existir.",
    "ASAAS_ENV permanece sandbox.",
    "BILLING_REAL_CHARGES_ENABLED permanece OFF.",
  ] as const,
};

export function isAsaasProductionApiKeyBlockedExternally(): boolean {
  return ASAAS_PRODUCTION_API_KEY_BLOCKER.status === "blocked_externally";
}
