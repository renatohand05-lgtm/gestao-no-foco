/**
 * Feedback Suspense fallback — evita flash em branco (Sprint 26.4).
 */
import { GFSkeleton } from "@/components/gf/gf-skeleton";

export function FeedbackSuspenseFallback() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Carregando feedback"
      data-feedback-skeleton=""
      data-sprint="26.4"
      className="h-10 overflow-hidden rounded-lg border border-[var(--gf-border-subtle)] bg-[var(--gf-surface-raised)] px-3 py-2"
    >
      <GFSkeleton className="h-full w-2/3" />
    </div>
  );
}
