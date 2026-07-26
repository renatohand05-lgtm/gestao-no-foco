import {
  ExecutiveSkeleton,
  ExecutiveSkeletonCard,
} from "@/components/executive";
import { gofGrid, gofMotion, gofRadius } from "@/lib/design-system";
import { cn } from "@/lib/utils";

/**
 * Skeleton do Executive Command Center (RC1).
 * Espelha hero + score + KPIs + listas + action center · evita layout shift.
 */
export function ExecutiveCommandCenterSkeleton() {
  return (
    <div
      data-dashboard-block="executive-command-center-loading"
      data-ecc-skeleton="1"
      className={cn(
        "space-y-5 border border-border/60 bg-card p-4 sm:p-5",
        gofRadius.xl,
        gofMotion.fade,
      )}
      aria-busy="true"
      aria-label="Carregando Executive Command Center"
    >
      {/* Hero */}
      <div className="space-y-3">
        <ExecutiveSkeleton heightClassName="h-3" widthClassName="w-40" />
        <ExecutiveSkeleton heightClassName="h-8" widthClassName="w-2/3 max-w-md" />
        <ExecutiveSkeleton heightClassName="h-3" widthClassName="w-48" />
      </div>

      {/* Morning Brief */}
      <ExecutiveSkeletonCard />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`kpi-skel-${i}`}
            className="rounded-xl border border-border/50 p-3 space-y-2"
          >
            <ExecutiveSkeleton heightClassName="h-3" widthClassName="w-1/2" />
            <ExecutiveSkeleton heightClassName="h-5" widthClassName="w-2/3" />
          </div>
        ))}
      </div>

      {/* Risk / opportunity */}
      <div className="grid gap-2 sm:grid-cols-2">
        <ExecutiveSkeletonCard />
        <ExecutiveSkeletonCard />
      </div>

      {/* KPI grid */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <ExecutiveSkeletonCard key={`kpi-grid-${i}`} />
        ))}
      </div>

      {/* Lists */}
      <div className={cn(gofGrid.twoCol)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`list-skel-${i}`} className="space-y-2">
            <ExecutiveSkeleton heightClassName="h-4" widthClassName="w-1/3" />
            <ExecutiveSkeletonCard />
            <ExecutiveSkeletonCard />
          </div>
        ))}
      </div>

      {/* Action Center */}
      <div className="space-y-2">
        <ExecutiveSkeleton heightClassName="h-4" widthClassName="w-40" />
        <ExecutiveSkeletonCard />
        <ExecutiveSkeletonCard />
      </div>
    </div>
  );
}
