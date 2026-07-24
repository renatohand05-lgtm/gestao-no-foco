import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyProps = {
  tenantSlug: string;
  hasFilters: boolean;
};

export function OsCentralLoading() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label="Carregando Central de Ordens de Serviço"
    >
      <div className="h-10 max-w-md animate-pulse rounded-lg bg-muted/60" />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border bg-muted/40"
          />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-xl border bg-muted/40" />
      <div className="h-72 animate-pulse rounded-xl border bg-muted/40" />
    </div>
  );
}

export function OsCentralEmptyState({ tenantSlug, hasFilters }: EmptyProps) {
  if (hasFilters) {
    return (
      <div
        className="rounded-xl border border-dashed bg-muted/20 px-4 py-10 text-center"
        role="status"
        data-os-state="empty-filtered"
      >
        <p className="text-sm font-medium text-foreground">
          Nenhuma OS com os filtros atuais
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajuste os filtros ou limpe para ver todas as ordens.
        </p>
        <Link
          href={`/${tenantSlug}/ordens`}
          className={cn(
            buttonVariants({ size: "sm", variant: "outline" }),
            "mt-4",
          )}
        >
          Limpar filtros
        </Link>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-dashed bg-muted/20 px-4 py-10 text-center"
      role="status"
      data-os-state="empty"
    >
      <p className="text-sm font-medium text-foreground">
        Nenhuma ordem de serviço cadastrada
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Abra a primeira OS para começar a operação.
      </p>
      <Link
        href={`/${tenantSlug}/ordens/nova`}
        className={cn(buttonVariants({ size: "sm" }), "mt-4")}
      >
        Nova OS
      </Link>
    </div>
  );
}

export function OsCentralErrorState({
  tenantSlug,
  message,
}: {
  tenantSlug: string;
  message?: string;
}) {
  return (
    <div
      className="rounded-xl border border-rose-300/60 bg-rose-50/60 px-4 py-8 text-center dark:border-rose-900/50 dark:bg-rose-950/30"
      role="alert"
      data-os-state="error"
    >
      <p className="text-sm font-medium text-rose-900 dark:text-rose-200">
        Não foi possível carregar a Central de OS
      </p>
      <p className="mt-1 text-sm text-rose-800/80 dark:text-rose-300/80">
        {message?.trim() || "Tente novamente em instantes."}
      </p>
      <Link
        href={`/${tenantSlug}/ordens`}
        className={cn(
          buttonVariants({ size: "sm", variant: "outline" }),
          "mt-4",
        )}
      >
        Tentar novamente
      </Link>
    </div>
  );
}
