/**
 * Blocos compartilhados do Dashboard Executivo — alinhados ao DS Gate 19.1.
 * Somente classes / apresentação.
 */

import {
  gofCardSurface,
  gofTypography,
} from "@/lib/design-system";

export const EXECUTIVE_STATUS_LABEL = {
  critico: "Crítico",
  atencao: "Atenção",
  saudavel: "Saudável",
  excelente: "Excelente",
} as const;

export type ExecutiveStatusKey = keyof typeof EXECUTIVE_STATUS_LABEL;

/** Classes compartilhadas dos blocos executivos (tokens oficiais). */
export const EXECUTIVE_BLOCK = {
  section: gofCardSurface,
  header:
    "flex flex-wrap items-start justify-between gap-3 border-b border-border/50 px-5 py-3.5 sm:px-6",
  title: gofTypography.title,
  body: "p-4 sm:p-5",
  badge:
    "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold",
} as const;

/** Badges de status usando paleta Brand (success/warning/danger/info). */
export const EXECUTIVE_STATUS_BADGE = {
  excelente: "bg-success/15 text-success",
  saudavel: "bg-[var(--brand-info)]/15 text-[var(--brand-info)]",
  atencao: "bg-warning/15 text-warning-foreground",
  critico: "bg-danger/15 text-danger",
  indisponivel: "bg-muted text-muted-foreground",
} as const;

export const EXECUTIVE_STATUS_BAR = {
  excelente: "bg-success",
  saudavel: "bg-[var(--brand-info)]",
  atencao: "bg-warning",
  critico: "bg-danger",
} as const;
