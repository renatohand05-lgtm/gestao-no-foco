/**
 * Layout padrão — Grid · Container · Spacing (Sprint 19 · Gate 19.0.2).
 * Somente classes utilitárias. Sem lógica de negócio.
 */

import { gofPadding, gofRadius, gofShadow, gofSpacing } from "./foundation";
import { gofCardPadding, gofCardSurface } from "./primitives";

/** Containers oficiais */
export const gofContainer = {
  page: "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8",
  narrow: "mx-auto w-full max-w-3xl px-4 sm:px-6",
  wide: "mx-auto w-full max-w-[88rem] px-4 sm:px-6 lg:px-8",
  full: "w-full",
} as const;

/** Padding de página / seção */
export const gofPagePadding = {
  page: "p-4 md:p-6 lg:p-8",
  section: "px-4 py-4 sm:px-6 sm:py-5",
  card: gofCardPadding,
  cardLg: gofPadding.lg,
} as const;

/**
 * Grids responsivos — mobile → tablet → notebook → desktop
 */
export const gofGrid = {
  kpis: "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
  metrics: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
  twoCol: "grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2",
  threeCol: "grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3",
  filters:
    "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5",
  stack: "flex flex-col",
} as const;

/** Superfícies — card/panel unificados (mesmo raio/shadow) */
export const gofSurface = {
  card: gofCardSurface,
  panel: gofCardSurface,
  muted: `border border-dashed border-border/60 bg-muted/30 ${gofRadius.lg}`,
  inset: `border border-border/40 bg-muted/20 ${gofRadius.md}`,
} as const;

/** Stack vertical comum */
export const gofStack = {
  tight: "space-y-2",
  default: "space-y-4",
  loose: "space-y-6",
  section: "space-y-6",
} as const;

/** Inline gap padrão */
export const gofInline = {
  xs: gofSpacing.xs,
  sm: gofSpacing.sm,
  md: gofSpacing.md,
  lg: gofSpacing.lg,
} as const;

/** Re-export shadow/radius usados em layout */
export const gofLayoutShadow = gofShadow;
export const gofLayoutRadius = gofRadius;
