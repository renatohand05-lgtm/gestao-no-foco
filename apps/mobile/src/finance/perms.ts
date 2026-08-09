/**
 * Permissões de visualização do módulo Financeiro (shell + telas).
 * Arquivo leve (sem componentes) — seguro no bootstrap do tab layout.
 *
 * Sprint 31.11.14: extraído de sections.tsx para evitar puxar o módulo de UI
 * no cold start e para forçar invalidação do bundle Hermes (Build 111
 * reutilizou o JS da 110 byte-a-byte).
 */
export const FINANCE_VIEW_PERMS = [
  "financeiro.visualizar",
  "financeiro.ver_saldos",
  "financeiro.ver_fluxo_caixa",
  "financeiro.ver_dre",
  "dashboard.financeiro",
  "analytics.financeiro",
] as const;

export type FinanceViewPerm = (typeof FINANCE_VIEW_PERMS)[number];
