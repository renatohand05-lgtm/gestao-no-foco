/**
 * Executive Design System — espaçamento / padding (Sprint 10.1)
 * Escala: 8 · 12 · 16 · 20 · 24 · 32
 */

export const exSpacing = {
  /** gap / space values */
  8: "gap-2",
  12: "gap-3",
  16: "gap-4",
  20: "gap-5",
  24: "gap-6",
  32: "gap-8",
} as const;

export const exPadding = {
  8: "p-2",
  12: "p-3",
  16: "p-4",
  20: "p-5",
  24: "p-6",
  32: "p-8",
} as const;

export const exPaddingX = {
  8: "px-2",
  12: "px-3",
  16: "px-4",
  20: "px-5",
  24: "px-6",
  32: "px-8",
} as const;

export const exPaddingY = {
  8: "py-2",
  12: "py-3",
  16: "py-4",
  20: "py-5",
  24: "py-6",
  32: "py-8",
} as const;

export const exStack = {
  8: "space-y-2",
  12: "space-y-3",
  16: "space-y-4",
  20: "space-y-5",
  24: "space-y-6",
  32: "space-y-8",
} as const;

export type ExSpacingScale = keyof typeof exSpacing;

/**
 * Dimensões de layout executivo (Sprint 13.8.1).
 * Charts com scroll horizontal intencional usam estes mínimos — não coordenadas rígidas.
 */
export const exSize = {
  kpiPrimary: "min-h-[10.5rem]",
  kpiSecondary: "min-h-[7.5rem]",
  actionCard: "min-h-[12rem] sm:min-h-[13.5rem]",
  hero: "min-h-[20rem] sm:min-h-[22rem] lg:min-h-[24rem] xl:min-h-[26rem]",
  chartH: "min-h-[18rem]",
  chartScrollMonthly: "min-w-[42rem]",
  chartScrollDaily: "min-w-[48rem]",
  chartScrollScenario: "min-w-[36rem]",
  presetCard: "min-h-[7.5rem]",
  rankingEmpty: "min-h-[8rem]",
  scoreBar: "max-w-[11rem]",
  scoreGauge: "w-[10rem] sm:w-[11.5rem] lg:w-[13rem]",
  shell: "max-w-[88rem]",
  menu: "min-w-[11rem]",
} as const;

export type ExSizeScale = keyof typeof exSize;
