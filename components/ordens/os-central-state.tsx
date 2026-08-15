import { ClipboardList } from "lucide-react";

import {
  ExecutiveEmptyState,
  ExecutivePage,
  ExecutiveSkeleton,
} from "@/components/executive";
import { gofColors, gofGrid } from "@/lib/design-system";
import { gofCardSurface } from "@/lib/design-system/primitives";
import { cn } from "@/lib/utils";

type EmptyCopy = {
  workOrder: string;
  workOrders: string;
  newWorkOrder: string;
  emptyWorkOrdersTitle: string;
  emptyWorkOrdersBody: string;
};

type EmptyProps = {
  tenantSlug: string;
  hasFilters: boolean;
  copy?: EmptyCopy;
};

export function OsCentralLoading() {
  return (
    <ExecutivePage width="wide" spacing="loose">
      <div
        className="space-y-6"
        aria-busy="true"
        aria-label="Carregando Central de Ordens de Serviço"
      >
        <ExecutiveSkeleton heightClassName="h-10 max-w-md" />
        <div className={gofGrid.kpis}>
          {Array.from({ length: 9 }).map((_, i) => (
            <ExecutiveSkeleton key={i} heightClassName="h-24" />
          ))}
        </div>
        <ExecutiveSkeleton heightClassName="h-40" />
        <ExecutiveSkeleton heightClassName="h-72" />
      </div>
    </ExecutivePage>
  );
}

export function OsCentralEmptyState({
  tenantSlug,
  hasFilters,
  copy,
}: EmptyProps) {
  const cta = copy?.newWorkOrder ?? "Nova OS";
  if (hasFilters) {
    return (
      <div data-os-state="empty-filtered">
        <ExecutiveEmptyState
          icon={ClipboardList}
          title={`Nenhum ${copy?.workOrder ?? "registro"} com os filtros atuais`}
          description="Ajuste os filtros ou limpe para ver todos os registros."
          action={{
            label: "Limpar filtros",
            href: `/${tenantSlug}/ordens`,
          }}
        />
      </div>
    );
  }

  return (
    <div data-os-state="empty">
      <ExecutiveEmptyState
        icon={ClipboardList}
        title={copy?.emptyWorkOrdersTitle ?? "Nenhuma ordem de serviço cadastrada"}
        description={
          copy?.emptyWorkOrdersBody ??
          "Abra a primeira OS para começar a operação."
        }
        action={{
          label: cta,
          href: `/${tenantSlug}/ordens/nova`,
        }}
      />
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
      className={cn(
        gofCardSurface,
        "px-4 py-8 text-center",
        gofColors.danger.soft,
        "ring-1",
        gofColors.danger.border,
      )}
      role="alert"
      data-os-state="error"
    >
      <p className={cn("text-sm font-medium", gofColors.danger.text)}>
        Não foi possível carregar a Central de OS
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {message?.trim() || "Tente novamente em instantes."}
      </p>
      <a
        href={`/${tenantSlug}/ordens`}
        className="mt-4 inline-flex text-sm font-medium underline underline-offset-2"
      >
        Tentar novamente
      </a>
    </div>
  );
}
