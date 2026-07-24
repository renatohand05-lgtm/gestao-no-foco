/**
 * Nomenclatura canônica de status executivo (Sprint 17).
 * Usar somente estes rótulos para status geral / severidade operacional.
 */

export const EXECUTIVE_STATUS_LABEL = {
  critico: "Crítico",
  atencao: "Atenção",
  saudavel: "Saudável",
  excelente: "Excelente",
} as const;

export type ExecutiveStatusKey = keyof typeof EXECUTIVE_STATUS_LABEL;

/** Classes compartilhadas dos blocos executivos do dashboard V2. */
export const EXECUTIVE_BLOCK = {
  section: "border border-border/55 bg-card",
  header:
    "flex flex-wrap items-start justify-between gap-3 border-b border-border/50 px-5 py-3.5 sm:px-6",
  title: "text-sm font-semibold tracking-tight text-foreground",
  body: "p-4 sm:p-5",
  badge:
    "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold",
} as const;
