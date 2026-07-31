/**
 * Motion system premium (Sprint 25.7) + Signature (Sprint 26.2).
 * CSS-first — sem libs pesadas. Respeita prefers-reduced-motion.
 */

import {
  gfMotion,
  gfSpace,
  gfSurface,
  gfType,
  SIGNATURE_SPRINT,
} from "@/lib/design-system/signature";

export const premiumMotion = {
  fast: "var(--motion-fast)",
  normal: "var(--motion-normal)",
  slow: "var(--motion-slow)",
  ease: "var(--ease-premium)",
  enter: "premium-enter motion-reduce:animate-none",
  enterDelay: (n: 1 | 2 | 3 | 4 | 5) =>
    `premium-enter premium-enter-delay-${n} motion-reduce:animate-none`,
  kpiLift: "premium-kpi-lift motion-reduce:transform-none",
  chartLine: "premium-chart-line",
  chartLabel: "premium-chart-label-enter",
  /** Duração visual de entrada do dashboard (ms) — faixa 450–850 */
  dashboardEntranceMs: { min: 450, max: 850 },
  signature: gfMotion,
  signatureSprint: SIGNATURE_SPRINT,
} as const;

export const premiumSurfaces = {
  base: "bg-[var(--surface-base)]",
  raised:
    "bg-[var(--surface-raised)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)]",
  overlay: "bg-[var(--surface-overlay)]",
  interactive:
    "bg-[var(--surface-interactive)] hover:border-[var(--border-premium)]",
  premiumBorder: "border-[var(--border-premium)]",
  gfRaised: "gf-surface gf-surface-raised",
  gfAuthorial: "gf-surface gf-surface-authorial",
  gfBrief: "gf-surface gf-surface-brief",
  signature: gfSurface,
} as const;

export const premiumType = {
  display:
    "font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl",
  h1: "font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--text-primary)]",
  h2: "font-[family-name:var(--font-display)] text-base font-semibold tracking-tight text-[var(--text-primary)]",
  h3: "text-sm font-semibold tracking-tight text-[var(--text-primary)]",
  metric:
    "font-semibold tabular-nums tracking-tight text-[var(--text-primary)]",
  metricDominant:
    "font-semibold tabular-nums tracking-tight text-[clamp(1.55rem,1.15rem+1.1vw,2.35rem)] text-[var(--text-primary)]",
  body: "text-sm text-[var(--text-secondary)]",
  caption: "text-xs text-[var(--text-muted)]",
  overline:
    "text-[10px] font-medium tracking-[0.14em] text-[var(--text-muted)] uppercase",
  signature: gfType,
} as const;

export { gfMotion, gfSpace, gfSurface, gfType, SIGNATURE_SPRINT };
