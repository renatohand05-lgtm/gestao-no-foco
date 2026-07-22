import { Suspense } from "react";

import { ModuleHeader } from "@/components/layout/module-header";
import { VendaEmptyState } from "@/components/vendas/venda-empty-state";
import { VendaFeedback } from "@/components/vendas/venda-feedback";
import { VendaFilters } from "@/components/vendas/venda-filters";
import { VendaPagination } from "@/components/vendas/venda-pagination";
import { VendaSearch } from "@/components/vendas/venda-search";
import { VendaSort } from "@/components/vendas/venda-sort";
import { VendaTable } from "@/components/vendas/venda-table";
import { ActionButton } from "@/components/ui/action-button";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { VENDAS_DEFAULT_PER_PAGE } from "@/lib/vendas/constants";
import { createVendaService } from "@/lib/vendas/venda-service";
import { requireTenant } from "@/lib/tenants";
import type {
  SortOrder,
  VendaSortField,
  VendaStatus,
  VendaSuccessMessage,
} from "@/types/vendas";

export const metadata = { title: "Vendas" };

type VendasPageProps = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    q?: string;
    page?: string;
    sort?: string;
    order?: string;
    status?: string;
    dataDe?: string;
    dataAte?: string;
    centroCusto?: string;
    success?: string;
    error?: string;
  }>;
};

function ToolbarFallback() {
  return <SkeletonCard lines={2} />;
}

export default async function VendasPage({
  params,
  searchParams,
}: VendasPageProps) {
  const { tenant: tenantSlug } = await params;
  const {
    q,
    page,
    sort,
    order,
    status,
    dataDe,
    dataAte,
    centroCusto,
    success,
    error,
  } = await searchParams;
  const tenant = await requireTenant(tenantSlug);
  const service = await createVendaService(tenant.id);

  const currentPage = Number(page) > 0 ? Number(page) : 1;
  const sortField = (sort as VendaSortField | undefined) ?? "created_at";
  const sortOrder = (order as SortOrder | undefined) ?? "desc";
  const statusFilter = (status as VendaStatus | "all" | undefined) ?? "all";

  const result = await service.list({
    search: q,
    page: currentPage,
    perPage: VENDAS_DEFAULT_PER_PAGE,
    sort: sortField,
    order: sortOrder,
    status: statusFilter,
    dataDe: dataDe || undefined,
    dataAte: dataAte || undefined,
    centroCustoId: centroCusto || undefined,
  });

  const hasFilters =
    Boolean(q) ||
    statusFilter !== "all" ||
    Boolean(dataDe) ||
    Boolean(dataAte) ||
    Boolean(centroCusto);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Vendas"
        description={`Pedidos e orçamentos de ${tenant.name}`}
        breadcrumbs={[{ label: "Vendas" }]}
      >
        <ActionButton
          action="create"
          label="Venda rápida"
          href={`/${tenantSlug}/vendas/rapida`}
        />
        <ActionButton
          action="view"
          label="Dashboard"
          href={`/${tenantSlug}/vendas/dashboard`}
        />
        <ActionButton
          action="view"
          label="Descontos"
          href={`/${tenantSlug}/descontos/dashboard`}
        />
        <ActionButton
          action="view"
          label="Vendas abertas"
          href={`/${tenantSlug}/vendas/abertas`}
        />
        <ActionButton
          action="create"
          label="Nova venda"
          href={`/${tenantSlug}/vendas/nova`}
        />
      </ModuleHeader>

      <VendaFeedback
        success={success as VendaSuccessMessage | undefined}
        error={error}
      />

      <Suspense fallback={<ToolbarFallback />}>
        <div className="space-y-4">
          <DataTableToolbar>
            <VendaSearch tenantSlug={tenantSlug} defaultValue={q ?? ""} />
          </DataTableToolbar>
          <VendaFilters tenantSlug={tenantSlug} currentStatus={statusFilter} />
          <VendaSort
            tenantSlug={tenantSlug}
            currentSort={sortField}
            currentOrder={sortOrder}
          />
        </div>
      </Suspense>

      {result.data.length === 0 ? (
        <VendaEmptyState
          tenantSlug={tenantSlug}
          hasSearch={Boolean(q)}
          hasFilters={hasFilters}
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {result.total} venda{result.total === 1 ? "" : "s"} encontrada
            {result.total === 1 ? "" : "s"}
          </p>
          <VendaTable tenantSlug={tenantSlug} vendas={result.data} />
          <VendaPagination
            tenantSlug={tenantSlug}
            page={result.page}
            totalPages={result.totalPages}
          />
        </>
      )}
    </div>
  );
}
