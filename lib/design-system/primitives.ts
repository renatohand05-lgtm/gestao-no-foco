/**
 * Primitivos visuais canônicos (Sprint 19 · Gate 19.0.2).
 * Fonte única para cards, focus, controles — evita drift entre componentes.
 * Sem lógica de negócio.
 */

import { gofPadding, gofRadius, gofShadow } from "./foundation";

/** Receita única de superfície (Card / Panel / Section panel / Metric) */
export const gofCardSurface = [
  "border border-border/60 bg-card text-card-foreground",
  "dark:border-white/[0.08] dark:bg-card/95",
  gofRadius.lg,
  gofShadow.sm,
].join(" ");

/** Padding canônico de card / painel */
export const gofCardPadding = "p-5";

/** Header interno (título + ações) */
export const gofCardHeader =
  "flex flex-col gap-1.5 border-b border-border/50 pb-3 sm:flex-row sm:items-end sm:justify-between";

/** Footer interno */
export const gofCardFooter =
  "mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border/50 pt-3";

/** Focus ring oficial (a11y + brand) */
export const gofFocusRing =
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Controles de formulário (input / textarea / select nativo) */
export const gofControl = [
  "flex h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1.5 text-sm",
  "text-foreground shadow-xs transition-[border-color,box-shadow,background-color] duration-150 ease-out",
  "placeholder:text-muted-foreground",
  gofFocusRing,
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-50",
  "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/25",
].join(" ");

export const gofControlTextarea = [
  "flex min-h-16 w-full field-sizing-content rounded-lg border border-input bg-transparent px-3 py-2 text-sm",
  "text-foreground shadow-xs transition-[border-color,box-shadow,background-color] duration-150 ease-out",
  "placeholder:text-muted-foreground",
  gofFocusRing,
  "disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-50",
  "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/25",
].join(" ");

/** Hover lift discreto (≤150ms) */
export const gofInteractive =
  "motion-safe:transition-[transform,box-shadow] motion-safe:duration-150 motion-safe:ease-out motion-safe:hover:-translate-y-px motion-safe:hover:shadow-md motion-safe:active:scale-[0.99]";

/** Padding legado ExecutiveCard (exPadding keys) → classes */
export const gofCardPaddingFromEx: Record<8 | 12 | 16 | 20 | 24 | 32, string> = {
  8: gofPadding.sm,
  12: "p-3",
  16: gofPadding.md,
  20: gofCardPadding,
  24: gofPadding.lg,
  32: gofPadding.xl,
};
