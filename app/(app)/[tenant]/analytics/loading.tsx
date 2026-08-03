import { Skeleton } from "@/components/ui/skeleton";

/** Loading Analytics / Decision Center — Sprint 30.6 */
export default function ModuleLoading() {
  return (
    <div
      className="space-y-4 p-4 sm:p-6"
      aria-busy="true"
      aria-label="Carregando Analytics"
      data-analytics-decision-center="loading"
      data-page-transition=""
    >
      <Skeleton className="h-8 w-72 max-w-full" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
