import { exAnimations, exRadius, exSpacing } from "@/lib/design-system";
import { cn } from "@/lib/utils";

export function ExecutiveIntelligenceSkeleton() {
  return (
    <div
      className={cn("space-y-4", exSpacing[16])}
      aria-busy="true"
      aria-label="Carregando inteligência executiva"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div
          className={cn("h-56 bg-muted/40", exRadius[20], exAnimations.shimmer)}
        />
        <div
          className={cn("h-56 bg-muted/40", exRadius[20], exAnimations.shimmer)}
        />
      </div>
      <div
        className={cn("h-36 bg-muted/40", exRadius[20], exAnimations.shimmer)}
      />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-40 bg-muted/40",
              exRadius[20],
              exAnimations.shimmer,
            )}
          />
        ))}
      </div>
    </div>
  );
}
