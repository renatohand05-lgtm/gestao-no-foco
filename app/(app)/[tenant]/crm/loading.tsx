import { Skeleton } from "@/components/ui/skeleton";

/** Loading CRM Premium — Sprint 30.5 */
export default function ModuleLoading() {
  return (
    <div
      data-page-transition=""
      data-crm-premium="loading"
      className="space-y-4 p-4 sm:p-6"
      aria-busy="true"
      aria-label="Carregando CRM"
    >
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
