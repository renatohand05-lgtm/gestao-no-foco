/**
 * Executive Design System — cores (Sprint 10.1)
 * Infraestrutura visual. Não altera regras de negócio.
 */

/** Executive colors — alinhados à Brand Guide (Gate 19.0.1). */
export const exColors = {
  primary: {
    hex: "#C9A84C",
    solid: "bg-[var(--brand-gold)] text-[var(--brand-graphite)]",
    soft: "bg-[var(--brand-gold)]/15 text-[var(--brand-graphite)]",
    text: "text-[var(--brand-gold)]",
    border: "border-[var(--brand-gold)]/35",
    ring: "ring-[var(--brand-gold)]/25",
  },
  success: {
    hex: "#16A34A",
    solid: "bg-emerald-600 text-white",
    soft: "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-600/30",
    ring: "ring-emerald-600/20",
  },
  warning: {
    hex: "#D97706",
    solid: "bg-amber-600 text-white",
    soft: "bg-amber-600/10 text-amber-700 dark:text-amber-400",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-600/30",
    ring: "ring-amber-600/20",
  },
  danger: {
    hex: "#DC2626",
    solid: "bg-red-600 text-white",
    soft: "bg-red-600/10 text-red-700 dark:text-red-400",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-600/30",
    ring: "ring-red-600/20",
  },
  info: {
    hex: "#5B6B7A",
    solid: "bg-[var(--brand-info)] text-white",
    soft: "bg-[var(--brand-info)]/10 text-[var(--brand-info)]",
    text: "text-[var(--brand-info)]",
    border: "border-[var(--brand-info)]/30",
    ring: "ring-[var(--brand-info)]/20",
  },
  neutral: {
    surface: "bg-[var(--brand-white)] dark:bg-card",
    muted: "bg-[var(--brand-gray-light)] dark:bg-muted/20",
    section: "bg-[var(--brand-gray-light)] dark:bg-background",
    canvas: "bg-[var(--brand-gray-light)] dark:bg-background",
    canvasSticky:
      "bg-[var(--brand-gray-light)]/90 backdrop-blur-xl dark:bg-background/85",
    border: "border-[var(--brand-gray-dark)]/15 dark:border-white/10",
    text: "text-foreground",
    textMuted: "text-muted-foreground",
  },
} as const;

export type ExColorTone =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";
