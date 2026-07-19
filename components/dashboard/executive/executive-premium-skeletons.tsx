import { exAnimations, exRadius, exSize } from "@/lib/design-system";
import { cn } from "@/lib/utils";

/**
 * Skeletons premium compartilhados — Sprint 13.5.
 * Sem fetch; apenas apresentação.
 */
export function ExecutiveTimelineSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("space-y-3", className)}
      aria-busy="true"
      aria-label="Carregando timeline"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex gap-3 border border-slate-200/40 bg-white p-4 dark:border-white/10 dark:bg-card",
            exRadius[16],
            exAnimations.shimmer,
          )}
        >
          <div className="size-9 shrink-0 rounded-full bg-slate-100 dark:bg-white/10" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3.5 w-40 rounded-full bg-slate-100 dark:bg-white/10" />
            <div className="h-3 w-full max-w-md rounded-full bg-slate-50 dark:bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ExecutiveTableSkeleton({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden border border-slate-200/40 bg-white dark:border-white/10 dark:bg-card",
        exRadius[20],
        className,
      )}
      aria-busy="true"
      aria-label="Carregando tabela"
    >
      <div className="border-b border-slate-100 px-4 py-3 dark:border-white/10">
        <div className={cn("h-3 w-32 rounded-full bg-slate-100", exAnimations.shimmer)} />
      </div>
      <div className="divide-y divide-slate-100 dark:divide-white/5">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "grid grid-cols-4 gap-3 px-4 py-3",
              exAnimations.shimmer,
            )}
          >
            <div className="h-3 rounded-full bg-slate-100 dark:bg-white/10" />
            <div className="h-3 rounded-full bg-slate-50 dark:bg-white/5" />
            <div className="h-3 rounded-full bg-slate-50 dark:bg-white/5" />
            <div className="h-3 w-16 justify-self-end rounded-full bg-slate-100 dark:bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExecutiveChartSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-end gap-2 border border-slate-200/40 bg-white p-5 dark:border-white/10 dark:bg-card",
        exSize.chartH,
        exRadius[20],
        className,
      )}
      aria-busy="true"
      aria-label="Carregando gráfico"
    >
      {[40, 65, 45, 80, 55, 70, 48].map((h, i) => (
        <div
          key={i}
          className={cn(
            "flex-1 rounded-t-md bg-slate-100 dark:bg-white/10",
            exAnimations.shimmer,
          )}
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}
