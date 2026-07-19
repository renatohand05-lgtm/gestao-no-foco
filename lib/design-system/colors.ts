/**
 * Executive Design System — cores (Sprint 10.1)
 * Infraestrutura visual. Não altera regras de negócio.
 */

export const exColors = {
  primary: {
    hex: "#2563eb",
    /** Tailwind / CSS utility classes */
    solid: "bg-blue-600 text-white",
    soft: "bg-blue-600/10 text-blue-700 dark:text-blue-400",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-600/30",
    ring: "ring-blue-600/20",
  },
  success: {
    hex: "#16a34a",
    solid: "bg-emerald-600 text-white",
    soft: "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-600/30",
    ring: "ring-emerald-600/20",
  },
  warning: {
    hex: "#ea580c",
    solid: "bg-orange-600 text-white",
    soft: "bg-orange-600/10 text-orange-700 dark:text-orange-400",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-600/30",
    ring: "ring-orange-600/20",
  },
  danger: {
    hex: "#dc2626",
    solid: "bg-red-600 text-white",
    soft: "bg-red-600/10 text-red-700 dark:text-red-400",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-600/30",
    ring: "ring-red-600/20",
  },
  info: {
    hex: "#7c3aed",
    solid: "bg-violet-600 text-white",
    soft: "bg-violet-600/10 text-violet-700 dark:text-violet-400",
    text: "text-violet-600 dark:text-violet-400",
    border: "border-violet-600/30",
    ring: "ring-violet-600/20",
  },
  neutral: {
    surface: "bg-[#fafbfc] dark:bg-card",
    muted: "bg-slate-100/70 dark:bg-muted/20",
    /** Canvas da página — neutro, não branco puro */
    section: "bg-[#f3f4f6] dark:bg-background",
    /** Fundo do workspace / sticky chrome */
    canvas: "bg-[#eef1f5] dark:bg-background",
    canvasSticky:
      "bg-[#eef1f5]/90 backdrop-blur-xl dark:bg-background/85",
    border: "border-slate-200/50 dark:border-white/10",
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
