/**
 * Sprint 22.2 RC2 — Feature flags do módulo Financeiro.
 */

/**
 * Quando true, o menu principal inclui telas Legacy (contas-bancarias,
 * dashboard→inteligência antigo, etc.) para compatibilidade.
 * Default: false (só Enterprise no menu).
 */
export function isFinanceLegacyMenuEnabled(): boolean {
  const raw =
    process.env.NEXT_PUBLIC_FINANCE_SHOW_LEGACY ??
    process.env.FINANCE_SHOW_LEGACY ??
    "0";
  const v = raw.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}
