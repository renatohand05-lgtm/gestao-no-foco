import { exAnimations, exRadius, exSpacing, exStack } from "@/lib/design-system";
import { cn } from "@/lib/utils";

export function ComercialSkeleton() {
  return (
    <div
      className={cn(exStack[24], exAnimations.fade)}
      aria-busy="true"
      aria-label="Carregando painel comercial"
    >
      <div
        className={cn(
          "h-28 w-full border border-border/50 bg-muted/30",
          exRadius[20],
          exAnimations.pulseSoft,
        )}
      />
      <div
        className={cn(
          "grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
          exSpacing[16],
        )}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-20 border border-border/50 bg-muted/30",
              exRadius[16],
              exAnimations.pulseSoft,
            )}
          />
        ))}
      </div>
      <div
        className={cn(
          "h-40 bg-muted/30",
          exRadius[16],
          exAnimations.pulseSoft,
        )}
      />
      <div
        className={cn(
          "h-48 bg-muted/30",
          exRadius[16],
          exAnimations.pulseSoft,
        )}
      />
    </div>
  );
}
