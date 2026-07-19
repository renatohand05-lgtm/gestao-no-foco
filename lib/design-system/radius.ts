/**
 * Executive Design System — border radius (Sprint 10.1)
 * Escala: 12 · 16 · 20 · 24
 */

export const exRadius = {
  12: "rounded-xl",
  16: "rounded-2xl",
  20: "rounded-[1.25rem]",
  24: "rounded-3xl",
  full: "rounded-full",
} as const;

export type ExRadiusScale = keyof typeof exRadius;
