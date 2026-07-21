import { Suspense } from "react";

import { ClienteEmptyState } from "@/components/clientes/cliente-empty-state";
import { ClienteFeedback } from "@/components/clientes/cliente-feedback";
import { ClientePagination } from "@/components/clientes/cliente-pagination";
import { ClienteSearch } from "@/components/clientes/cliente-search";
import { ClienteSort } from "@/components/clientes/cliente-sort";
import { ClienteTable } from "@/components/clientes/cliente-table";
import { CrmSubnav } from "@/components/crm/crm-subnav";
import { ModuleHeader } from "@/components/layout/module-header";
import { ActionButton } from "@/components/ui/action-button";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { CLIENTES_DEFAULT_PER_PAGE } from "@/lib/clientes/constants";
import { createClienteService } from "@/lib/clientes/cliente-service";
import { requireTenant } from "@/lib/tenants";
import type { ClienteSortField, ClienteSuccessMessage, SortOrder } from "@/types/clientes";

export const metadata = { title: "Clientes" };

type ClientesPageProps = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    q?: string;
    page?: string;
    sort?: string;
    order?: string;
    success?: string;
    error?: string;
  }>;
};

function ToolbarFallback() {
  return <SkeletonCard lines={2} />;
}

export default async function ClientesPage({
  params,
  searchParams,
}: ClientesPageProps) {
  const { tenant: tenantSlug } = await params;
  const { q, page, sort, order, success, error } = await searchParams;
  const tenant = await requireTenant(tenantSlug);
  const service = await createClienteService(tenant.id);

  const currentPage = Number(page) > 0 ? Number(page) : 1;
  const sortField = (sort as ClienteSortField | undefined) ?? "nome";
  const sortOrder = (order as SortOrder | undefined) ?? "asc";

  const result = await service.list({
    search: q,
    page: currentPage,
    perPage: CLIENTES_DEFAULT_PER_PAGE,
    sort: sortField,
    order: sortOrder,
  });

  return (
    <div className="space-y-6">
      <CrmSubnav tenantSlug={tenantSlug} active="clientes" />
      <ModuleHeader
        title="Clientes"
        description={`Gerencie os clientes de ${tenant.name}`}
        breadcrumbs={[{ label: "Clientes" }]}
      >
        <ActionButton
          action="create"
          label="Novo cliente"
          href={`/${tenantSlug}/clientes/novo`}
        />
      </ModuleHeader>

      <ClienteFeedback
        success={success as ClienteSuccessMessage | undefined}
        error={error}
      />

      <Suspense fallback={<ToolbarFallback />}>
        <DataTableToolbar>
          <ClienteSearch tenantSlug={tenantSlug} defaultValue={q ?? ""} />
          <ClienteSort
            tenantSlug={tenantSlug}
            currentSort={sortField}
            currentOrder={sortOrder}
          />
        </DataTableToolbar>
      </Suspense>

      {result.data.length === 0 ? (
        <ClienteEmptyState tenantSlug={tenantSlug} hasSearch={Boolean(q)} />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {result.total} cliente{result.total === 1 ? "" : "s"} encontrado
            {result.total === 1 ? "" : "s"}
          </p>
          <ClienteTable tenantSlug={tenantSlug} clientes={result.data} />
          <ClientePagination
            tenantSlug={tenantSlug}
            page={result.page}
            totalPages={result.totalPages}
          />
        </>
      )}
    </div>
  );
}
