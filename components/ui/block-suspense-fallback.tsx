/**
 * Suspense fallback de bloco — evita "A carregar…" texto cru (Sprint 29.3).
 */
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { cn } from "@/lib/utils";

type BlockSuspenseFallbackProps = {
  lines?: number;
  className?: string;
  label?: string;
};

export function BlockSuspenseFallback({
  lines = 4,
  className,
  label = "Carregando conteúdo",
}: BlockSuspenseFallbackProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      data-block-suspense-fallback=""
      data-sprint="29.3"
      className={cn("min-w-0", className)}
    >
      <SkeletonCard lines={lines} />
    </div>
  );
}
