/**
 * Tons de feedback alinhados (toast ↔ FeedbackMessage) — Sprint 29.3.
 * Apenas apresentação; sem regra de negócio.
 */

export type FeedbackTone = "success" | "error" | "info" | "warning";

/** Superfície suave com borda (toast / cards de status) */
export const FEEDBACK_SURFACE: Record<FeedbackTone, string> = {
  success:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
  info: "border-blue-500/30 bg-blue-500/10 text-blue-800 dark:text-blue-300",
  warning:
    "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-300",
};

/** Inline sem borda (FeedbackMessage em forms) */
export const FEEDBACK_INLINE: Record<FeedbackTone, string> = {
  success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  error: "bg-destructive/10 text-destructive",
  info: "bg-blue-500/10 text-blue-800 dark:text-blue-300",
  warning: "bg-amber-500/10 text-amber-900 dark:text-amber-300",
};
