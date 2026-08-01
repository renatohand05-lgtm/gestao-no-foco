/**
 * Sprint 26.2 — Signature Experience tokens (camada visual apenas).
 */

export const gfType = {
  display:
    "gf-display font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl",
  pageTitle:
    "gf-page-title font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-2xl",
  sectionTitle:
    "gf-section-title font-[family-name:var(--font-display)] text-base font-semibold tracking-tight text-[var(--text-primary)]",
  cardTitle:
    "gf-card-title text-sm font-semibold tracking-tight text-[var(--text-primary)]",
  metricXl:
    "gf-metric-xl font-semibold tabular-nums tracking-tight leading-none text-[var(--text-primary)] text-[clamp(1.05rem,0.8rem+0.7vw,1.65rem)]",
  metricLg:
    "gf-metric-lg font-semibold tabular-nums tracking-tight leading-none text-[var(--text-primary)] text-[clamp(0.95rem,0.8rem+0.45vw,1.35rem)]",
  body: "gf-body text-sm leading-relaxed text-[var(--text-secondary)]",
  label:
    "gf-label text-[11px] font-medium tracking-[0.06em] text-[var(--text-secondary)]",
  caption: "gf-caption text-xs text-[var(--text-secondary)]",
  overline:
    "gf-overline text-[10px] font-medium tracking-[0.12em] text-[var(--text-muted)] uppercase",
  brandWord:
    "gf-brand-word font-[family-name:var(--font-display)] font-semibold tracking-[0.04em]",
} as const;

export const gfSpace = {
  section: "gap-[var(--gf-space-section)]",
  block: "gap-[var(--gf-space-block)]",
  inline: "gap-[var(--gf-space-inline)]",
  tight: "gap-[var(--gf-space-tight)]",
  stackSection: "space-y-[var(--gf-space-section)]",
  stackBlock: "space-y-[var(--gf-space-block)]",
  stackTight: "space-y-[var(--gf-space-tight)]",
} as const;

export const gfSurface = {
  shell: "bg-[var(--gf-surface-shell)]",
  base: "bg-[var(--gf-surface-base)]",
  raised:
    "bg-[var(--gf-surface-raised)] border border-[var(--gf-border-subtle)] shadow-[var(--gf-shadow-soft)]",
  elevated:
    "bg-[var(--gf-surface-elevated)] border border-[var(--gf-border-subtle)] shadow-[var(--gf-shadow-elevated)]",
  interactive:
    "bg-[var(--gf-surface-interactive)] border border-[var(--gf-border-subtle)] hover:border-[var(--gf-border-active)]",
  overlay: "bg-[var(--gf-surface-overlay)] shadow-[var(--gf-shadow-elevated)]",
  intelligence:
    "bg-[var(--gf-surface-intelligence)] border border-[var(--gf-border-subtle)]",
  critical:
    "bg-[var(--gf-surface-critical)] border border-danger/25 shadow-[var(--gf-glow-danger)]",
} as const;

export const gfMotion = {
  micro: "duration-[var(--gf-motion-micro)] ease-[var(--gf-ease)]",
  component: "duration-[var(--gf-motion-component)] ease-[var(--gf-ease)]",
  section: "duration-[var(--gf-motion-section)] ease-[var(--gf-ease)]",
  enter: "gf-enter motion-reduce:animate-none",
  enterDelay: (n: 1 | 2 | 3 | 4 | 5) =>
    `gf-enter gf-enter-delay-${n} motion-reduce:animate-none`,
} as const;

export const SIGNATURE_SPRINT = "26.2" as const;
/** Ciclo de refinamento enterprise contínuo */
export const ENTERPRISE_REFINE_SPRINT = "26.7" as const;
