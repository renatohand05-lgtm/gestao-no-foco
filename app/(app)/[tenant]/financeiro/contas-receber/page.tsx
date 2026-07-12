import { Suspense } from "react";
import { Receipt } from "lucide-react";

import { ContaReceberFeedback } from "@/components/financeiro/conta-receber-feedback";
import { ContaReceberFilters } from "@/components/financeiro/conta-receber-filters";
import { ContaReceberSummaryCards } from "@/components/financeiro/conta-receber-summary-cards";
import { ContaReceberTable } from "@/components/financeiro/conta-receber-table";
import { FinanceiroEmptyState } from "@/components/financeiro/financeiro-empty-state";
import { FinanceiroPagination } from "@/components/financeiro/financeiro-pagination";
import { FinanceiroSearch } from "@/components/financeiro/financeiro-search";
import { FinanceiroSort } from "@/components/financeiro/financeiro-sort";
import { ModuleHeader } from "@/components/layout/module-header";
import { ActionButton } from "@/components/ui/action-button";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import {
  CONTA_RECEBER_SORT_OPTIONS,
  FINANCEIRO_DEFAULT_PER_PAGE,
} from "@/lib/financeiro/constants";
import { createContaReceberService } from "@/lib/financeiro/conta-receber-service";
import { requireTenant } from "@/lib/tenants";
import type {
  ContaReceberSortField,
  ContaReceberStatus,
  ContaReceberSuccessMessage,
} from "@/types/contas-receber";
import type { SortOrder } from "@/types/financeiro";

export const metadata = { title: "Contas a Receber" };

type PageProps = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    q?: string;
    page?: string;
    sort?: string;
    order?: string;
    status?: string;
    cliente?: string;
    vencimentoDe?: string;
    vencimentoAte?: string;
    success?: string;
    error?: string;
  }>;
};

function ToolbarFallback() {
  return <SkeletonCard lines={2} />;
}

export default async function Page({ params, searchParams }: PageProps) {
  const { tenant: tenantSlug } = await params;
  const {
    q,
    page,
    sort,
    order,
    status,
    cliente,
    vencimentoDe,
    vencimentoAte,
    success,
    error,
  } = await searchParams;
  const tenant = await requireTenant(tenantSlug);
  const service = await createContaReceberService(tenant.id);

  const currentPage = Number(page) > 0 ? Number(page) : 1;
  const sortField =
    (sort as ContaReceberSortField | undefined) ?? "data_vencimento";
  const sortOrder = (order as SortOrder | undefined) ?? "asc";
  const statusFilter = (status as ContaReceberStatus | "all" | undefined) ?? "all";

  const [result, resumo, clientes, contasBancarias] = await Promise.all([
    service.list({
      search: q,
      page: currentPage,
      perPage: FINANCEIRO_DEFAULT_PER_PAGE,
      sort: sortField,
      order: sortOrder,
      status: statusFilter,
      clienteId: cliente,
      vencimentoDe,
      vencimentoAte,
    }),
    service.getResumo(),
    service.listClientes(),
    service.listContasBancarias(),
  ]);

  const hasFilters =
    Boolean(q) ||
    statusFilter !== "all" ||
    Boolean(cliente) ||
    Boolean(vencimentoDe) ||
    Boolean(vencimentoAte);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Contas a Receber"
        description={`Recebíveis de ${tenant.name}`}
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Contas a Receber" },
        ]}
      >
        <ActionButton
          action="create"
          label="Nova conta"
          href={`/${tenantSlug}/financeiro/contas-receber/nova`}
        />
      </ModuleHeader>

      <ContaReceberFeedback
        success={success as ContaReceberSuccessMessage | undefined}
        error={error}
      />

      <ContaReceberSummaryCards resumo={resumo} />

      <Suspense fallback={<ToolbarFallback />}>
        <div className="space-y-4">
          <DataTableToolbar>
            <FinanceiroSearch
              tenantSlug={tenantSlug}
              basePath="contas-receber"
              defaultValue={q ?? ""}
              placeholder="Buscar por descrição ou número"
            />
          </DataTableToolbar>
          <ContaReceberFilters
            tenantSlug={tenantSlug}
            currentStatus={statusFilter}
            clientes={clientes}
            currentClienteId={cliente ?? ""}
            vencimentoDe={vencimentoDe ?? ""}
            vencimentoAte={vencimentoAte ?? ""}
          />
          <FinanceiroSort
            tenantSlug={tenantSlug}
            basePath="contas-receber"
            options={CONTA_RECEBER_SORT_OPTIONS}
            currentSort={sortField}
            currentOrder={sortOrder}
          />
        </div>
      </Suspense>

      {result.data.length === 0 ? (
        <FinanceiroEmptyState
          tenantSlug={tenantSlug}
          basePath="contas-receber"
          icon={Receipt}
          title="Nenhuma conta a receber cadastrada"
          description="Registre títulos manualmente ou fature vendas com forma de pagamento que gera financeiro."
          createLabel="Nova conta"
          createHref={`/${tenantSlug}/financeiro/contas-receber/nova`}
          hasSearch={Boolean(q)}
          hasFilters={hasFilters}
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {result.total} registro{result.total === 1 ? "" : "s"} encontrado
            {result.total === 1 ? "" : "s"}
          </p>
          <ContaReceberTable
            tenantSlug={tenantSlug}
            items={result.data}
            contasBancarias={contasBancarias}
          />
          <Suspense fallback={null}>
            <FinanceiroPagination
              tenantSlug={tenantSlug}
              basePath="contas-receber"
              page={result.page}
              totalPages={result.totalPages}
            />
          </Suspense>
        </>
      )}
    </div>
  );
}
