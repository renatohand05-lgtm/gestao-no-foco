/**
 * Layout tokens do dashboard premium (Sprint 25.6.1).
 * Somente apresentação — sem regras de negócio.
 */

export const dashboardLayout = {
  maxWidth: "var(--dashboard-max-width)",
  gutter: "var(--dashboard-gutter)",
  gap: "var(--dashboard-gap)",
  kpiMinWidth: "var(--kpi-min-width)",
  panelMinHeight: "var(--panel-min-height)",
  /** Grid utilitário — conteúdo útil fora da sidebar */
  shellClass:
    "mx-auto w-full max-w-[var(--dashboard-max-width)] px-[var(--dashboard-gutter)]",
  gapClass: "gap-[var(--dashboard-gap)]",
} as const;
