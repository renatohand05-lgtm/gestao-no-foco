/**
 * Motion Design System — Sprint 13.5 Luxury Polish
 * Timing, easing e classes compartilhadas. Sem libs extras.
 */

export const exMotion = {
  /** 150–180ms Apple curve */
  duration: "duration-150",
  durationMd: "duration-[160ms]",
  durationLg: "duration-[180ms]",
  ease: "ease-[cubic-bezier(0.25,0.1,0.25,1)]",
  transition: "motion-safe:transition-all motion-safe:duration-150 motion-safe:ease-[cubic-bezier(0.25,0.1,0.25,1)]",
  transitionTransform:
    "motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-[cubic-bezier(0.25,0.1,0.25,1)]",
  transitionShadow:
    "motion-safe:transition-shadow motion-safe:duration-[160ms] motion-safe:ease-[cubic-bezier(0.25,0.1,0.25,1)]",
  hoverLift:
    "motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md",
  hoverScale: "motion-safe:hover:scale-[1.01]",
  press: "motion-safe:active:scale-[0.985]",
  fadeIn:
    "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-safe:fill-mode-both",
  slideIn:
    "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-safe:fill-mode-both",
  dropSettle:
    "motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:fade-in-0 motion-safe:duration-[180ms] motion-safe:ease-[cubic-bezier(0.25,0.1,0.25,1)]",
  /** Ripple discreto — ring curto no press */
  ripple:
    "relative overflow-hidden after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-slate-900/0 after:transition-colors after:duration-150 active:after:bg-slate-900/[0.04] dark:active:after:bg-white/[0.06]",
} as const;

export type ExMotionKey = keyof typeof exMotion;
