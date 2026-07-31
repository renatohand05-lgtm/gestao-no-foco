/**
 * Design System oficial — tokens canônicos (Sprint 19 · Gate 19.0).
 * Camada de marca / fundação. Sem lógica de negócio.
 *
 * Compatível com `ds*` (legacy) e `ex*` (executive). Preferir estes
 * nomes em código novo; migração visual é gradual e opcional.
 */

/**
 * Cores semânticas oficiais — alinhadas à Brand Guide (Gate 19.0.1).
 * Paleta: Grafite · Dourado · Branco · Cinzas · Success/Warning/Danger/Info
 */
export const gofColors = {
  primary: {
    hex: "#C9A84C",
    solid: "bg-primary text-primary-foreground",
    soft: "bg-primary/15 text-[var(--brand-graphite)]",
    text: "text-primary",
    border: "border-primary/40",
  },
  secondary: {
    hex: "#3F3F46",
    solid: "bg-secondary text-secondary-foreground",
    soft: "bg-secondary text-secondary-foreground",
    text: "text-secondary-foreground",
    border: "border-border",
  },
  success: {
    hex: "#16A34A",
    solid: "bg-success text-success-foreground",
    soft: "bg-success/10 text-success",
    text: "text-success",
    border: "border-success/30",
  },
  warning: {
    hex: "#D97706",
    solid: "bg-warning text-warning-foreground",
    soft: "bg-warning/15 text-warning-foreground",
    text: "text-warning-foreground",
    border: "border-warning/40",
  },
  danger: {
    hex: "#DC2626",
    solid: "bg-danger text-danger-foreground",
    soft: "bg-danger/10 text-danger",
    text: "text-danger",
    border: "border-danger/30",
  },
  info: {
    hex: "#5B6B7A",
    solid: "bg-[var(--brand-info)] text-white",
    soft: "bg-[var(--brand-info)]/10 text-[var(--brand-info)]",
    text: "text-[var(--brand-info)]",
    border: "border-[var(--brand-info)]/30",
  },
  background: {
    hex: "#FFFFFF",
    className: "bg-background",
    text: "text-foreground",
  },
  surface: {
    hex: "#FFFFFF",
    className: "bg-card",
    text: "text-card-foreground",
  },
  border: {
    hex: "#E4E4E7",
    className: "border-border",
  },
  muted: {
    hex: "#F4F4F5",
    className: "bg-muted",
    text: "text-muted-foreground",
  },
} as const;

export type GofColorToken = keyof typeof gofColors;

/**
 * Espaçamento oficial — escala nomeada.
 * xs=4 · sm=8 · md=16 · lg=24 · xl=32 · 2xl=48 (px equivalentes Tailwind)
 */
export const gofSpacing = {
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
  "2xl": "gap-12",
} as const;

export const gofSpaceY = {
  xs: "space-y-1",
  sm: "space-y-2",
  md: "space-y-4",
  lg: "space-y-6",
  xl: "space-y-8",
  "2xl": "space-y-12",
} as const;

export const gofPadding = {
  xs: "p-1",
  sm: "p-2",
  md: "p-4",
  lg: "p-6",
  xl: "p-8",
  "2xl": "p-12",
} as const;

export const gofMargin = {
  xs: "m-1",
  sm: "m-2",
  md: "m-4",
  lg: "m-6",
  xl: "m-8",
  "2xl": "m-12",
} as const;

export type GofSpacingScale = keyof typeof gofSpacing;

/** Border radius oficial */
export const gofRadius = {
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-xl",
  xl: "rounded-2xl",
} as const;

export type GofRadiusScale = keyof typeof gofRadius;

/** Sombras oficiais */
export const gofShadow = {
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  xl: "shadow-xl",
} as const;

export type GofShadowScale = keyof typeof gofShadow;

/**
 * Tipografia oficial — Title · Subtitle · Body · Caption · Mono
 * Gate 19.0.2: peso / leading / tracking padronizados.
 */
export const gofTypography = {
  title:
    "font-[family-name:var(--font-display)] text-lg font-semibold leading-snug tracking-tight text-foreground sm:text-xl",
  subtitle:
    "text-sm font-normal leading-snug tracking-normal text-[var(--text-secondary)] sm:text-[0.9375rem]",
  body: "text-sm font-normal leading-relaxed tracking-normal text-foreground",
  caption:
    "text-xs font-medium leading-snug tracking-[0.01em] text-[var(--text-secondary)]",
  mono: "font-mono text-sm font-normal leading-normal tracking-normal tabular-nums text-foreground",
} as const;

export type GofTypographyScale = keyof typeof gofTypography;

/**
 * Motion oficial — máximo 250ms (Gate 19.0.2).
 * Sem libs extras. Respeita prefers-reduced-motion via motion-safe.
 */
export const gofMotion = {
  fade: "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200 motion-safe:ease-out motion-safe:fill-mode-both",
  slide:
    "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-out motion-safe:fill-mode-both",
  hover:
    "motion-safe:transition-[transform,box-shadow] motion-safe:duration-150 motion-safe:ease-out motion-safe:hover:-translate-y-px motion-safe:hover:shadow-md",
  loading: "motion-safe:animate-pulse",
  skeleton:
    "relative overflow-hidden bg-muted/40 before:absolute before:inset-0 before:-translate-x-full before:animate-[ex-shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent dark:before:via-white/10 motion-reduce:before:animate-none",
  /** Sprint 25.7 */
  enter: "premium-enter",
  kpiLift: "premium-kpi-lift",
} as const;

export type GofMotionKey = keyof typeof gofMotion;
