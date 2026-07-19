import { exAnimations, exRadius, exSpacing } from "@/lib/design-system";
import { cn } from "@/lib/utils";

export function PredictionSkeleton() {
  return (
    <div
      className={cn("space-y-4", exSpacing[16])}
      aria-busy="true"
      aria-label="Carregando previsões e cenários"
    >
      <div
        className={cn("h-36 bg-muted/40", exRadius[20], exAnimations.shimmer)}
      />
      <div
        className={cn("h-40 bg-muted/40", exRadius[20], exAnimations.shimmer)}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-48 bg-muted/40",
              exRadius[20],
              exAnimations.shimmer,
            )}
          />
        ))}
      </div>
    </div>
  );
}
