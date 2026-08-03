import { Skeleton } from "@/components/ui/skeleton";

export default function IntegracoesLoading() {
  return (
    <div
      className="space-y-4 p-4 sm:p-6"
      aria-busy="true"
      aria-label="Carregando Integrações"
      data-integration-hub-loading=""
    >
      <Skeleton className="h-8 w-80" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
