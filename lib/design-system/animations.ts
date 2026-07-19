/**
 * Executive Design System — animações (Sprint 13.4 freeze)
 * Hover / Focus / Elevation / Fade / Scale 1.01 · 150–180ms · curva Apple.
 * Classes estáticas para o Tailwind detectar.
 */

export const exAnimations = {
  fade: "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-safe:fill-mode-both",
  slide:
    "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-safe:fill-mode-both",
  slideRight:
    "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-left-2 motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-safe:fill-mode-both",
  scale:
    "motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:fade-in-0 motion-safe:duration-450 motion-safe:ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-safe:fill-mode-both",
  progress:
    "motion-safe:transition-[width,stroke-dashoffset] motion-safe:duration-700 motion-safe:ease-[cubic-bezier(0.25,0.1,0.25,1)]",
  /** Altura de barras de gráfico */
  chartBar:
    "motion-safe:transition-[height] motion-safe:duration-700 motion-safe:ease-[cubic-bezier(0.25,0.1,0.25,1)]",
  count:
    "tabular-nums motion-safe:transition-[opacity,transform] motion-safe:duration-180 motion-safe:ease-[cubic-bezier(0.25,0.1,0.25,1)]",
  hoverLift:
    "motion-safe:transition-all motion-safe:duration-150 motion-safe:ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md",
  hoverScale:
    "motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-safe:hover:scale-[1.01]",
  hoverGlow:
    "motion-safe:transition-shadow motion-safe:duration-160 motion-safe:ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-safe:hover:shadow-[0_0_0_1px_rgba(15,23,42,0.06),0_10px_28px_rgba(15,23,42,0.08)]",
  hoverPress:
    "motion-safe:active:scale-[0.985] motion-safe:transition-transform motion-safe:duration-100",
  pulseSoft: "motion-safe:animate-pulse",
  shimmer:
    "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[ex-shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/45 before:to-transparent dark:before:via-white/10 motion-reduce:before:animate-none",
  float:
    "motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-[cubic-bezier(0.25,0.1,0.25,1)]",
  focusRing:
    "outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#eef1f5] dark:focus-visible:ring-offset-background",
  /** Em superfícies escuras (Hero) */
  focusRingInverse:
    "outline-none focus-visible:ring-2 focus-visible:ring-sky-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1322]",
  elevation:
    "motion-safe:transition-shadow motion-safe:duration-160 motion-safe:ease-[cubic-bezier(0.25,0.1,0.25,1)]",
  /** Hit target mínimo acessível */
  touchTarget: "min-h-11 min-w-11",
} as const;

/** Glassmorphism discreto — só Hero / status / badges / progress */
export const exGlass = {
  panel:
    "border border-white/50 bg-white/55 shadow-[0_8px_32px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5",
  soft:
    "border border-white/40 bg-white/40 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04]",
  badge:
    "border border-white/50 bg-white/60 backdrop-blur-md dark:border-white/10 dark:bg-white/10",
} as const;

export type ExAnimation = keyof typeof exAnimations;

export const exAnimationDelay = {
  0: "delay-0",
  75: "motion-safe:delay-75",
  100: "motion-safe:delay-100",
  150: "motion-safe:delay-150",
  200: "motion-safe:delay-200",
  300: "motion-safe:delay-300",
  500: "motion-safe:delay-500",
} as const;

/** Helpers de stagger (ms) para style={{ animationDelay }} */
export function exStagger(index: number, stepMs = 50, max = 8): string {
  return `${Math.min(index, max) * stepMs}ms`;
}
