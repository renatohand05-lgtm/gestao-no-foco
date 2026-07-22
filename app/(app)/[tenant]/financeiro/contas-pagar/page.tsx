import { Suspense } from "react";
import { Wallet } from "lucide-react";

import { ContaPagarFeedback } from "@/components/financeiro/conta-pagar-feedback";
import { ContaPagarFilters } from "@/components/financeiro/conta-pagar-filters";
import { ContaPagarSummaryCards } from "@/components/financeiro/conta-pagar-summary-cards";
import { ContaPagarTable } from "@/components/financeiro/conta-pagar-table";
import { FinanceiroEmptyState } from "@/components/financeiro/financeiro-empty-state";
import { FinanceiroPagination } from "@/components/financeiro/financeiro-pagination";
import { FinanceiroSearch } from "@/components/financeiro/financeiro-search";
import { FinanceiroSort } from "@/components/financeiro/financeiro-sort";
import { ModuleHeader } from "@/components/layout/module-header";
import { ActionButton } from "@/components/ui/action-button";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import {
  CONTA_PAGAR_SORT_OPTIONS,
  FINANCEIRO_DEFAULT_PER_PAGE,
} from "@/lib/financeiro/constants";
import { createContaPagarService } from "@/lib/financeiro/conta-pagar-service";
import { requireTenant } from "@/lib/tenants";
import type {
  ContaPagarSortField,
  ContaPagarStatus,
  ContaPagarSuccessMessage,
} from "@/types/contas-pagar";
import type { SortOrder } from "@/types/financeiro";

export const metadata = { title: "Contas a Pagar" };

type PageProps = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    q?: string;
    page?: string;
    sort?: string;
    order?: string;
    status?: string;
    fornecedor?: string;
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
    fornecedor,
    vencimentoDe,
    vencimentoAte,
    success,
    error,
  } = await searchParams;
  const tenant = await requireTenant(tenantSlug);
  const service = await createContaPagarService(tenant.id);

  const currentPage = Number(page) > 0 ? Number(page) : 1;
  const sortField =
    (sort as ContaPagarSortField | undefined) ?? "data_vencimento";
  const sortOrder = (order as SortOrder | undefined) ?? "asc";
  const statusFilter = (status as ContaPagarStatus | "all" | undefined) ?? "all";

  const [result, resumo, fornecedores, formasPagamento, contasBancarias] =
    await Promise.all([
      service.list({
        search: q,
        page: currentPage,
        perPage: FINANCEIRO_DEFAULT_PER_PAGE,
        sort: sortField,
        order: sortOrder,
        status: statusFilter,
        fornecedorId: fornecedor,
        vencimentoDe,
        vencimentoAte,
      }),
      service.getResumo(),
      service.listFornecedores(),
      service.listFormasPagamento(),
      service.listContasBancarias(),
    ]);

  const hasFilters =
    Boolean(q) ||
    statusFilter !== "all" ||
    Boolean(fornecedor) ||
    Boolean(vencimentoDe) ||
    Boolean(vencimentoAte);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Contas a Pagar"
        description={`Obrigações de ${tenant.name}`}
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Contas a Pagar" },
        ]}
      >
        <ActionButton
          action="create"
          label="Nova conta"
          href={`/${tenantSlug}/financeiro/contas-pagar/nova`}
        />
      </ModuleHeader>

      <ContaPagarFeedback
        success={success as ContaPagarSuccessMessage | undefined}
        error={error}
      />

      <ContaPagarSummaryCards resumo={resumo} />

      <Suspense fallback={<ToolbarFallback />}>
        <div className="space-y-4">
          <DataTableToolbar>
            <FinanceiroSearch
              tenantSlug={tenantSlug}
              basePath="contas-pagar"
              defaultValue={q ?? ""}
              placeholder="Buscar por descrição ou número"
            />
          </DataTableToolbar>
          <ContaPagarFilters
            tenantSlug={tenantSlug}
            currentStatus={statusFilter}
            fornecedores={fornecedores}
            currentFornecedorId={fornecedor ?? ""}
            vencimentoDe={vencimentoDe ?? ""}
            vencimentoAte={vencimentoAte ?? ""}
          />
          <FinanceiroSort
            tenantSlug={tenantSlug}
            basePath="contas-pagar"
            options={CONTA_PAGAR_SORT_OPTIONS}
            currentSort={sortField}
            currentOrder={sortOrder}
          />
        </div>
      </Suspense>

      {result.data.length === 0 ? (
        <FinanceiroEmptyState
          tenantSlug={tenantSlug}
          basePath="contas-pagar"
          icon={Wallet}
          title="Nenhuma conta a pagar cadastrada"
          description="Registre títulos de fornecedores, despesas e obrigações financeiras."
          createLabel="Nova conta"
          createHref={`/${tenantSlug}/financeiro/contas-pagar/nova`}
          hasSearch={Boolean(q)}
          hasFilters={hasFilters}
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {result.total} registro{result.total === 1 ? "" : "s"} encontrado
            {result.total === 1 ? "" : "s"}
          </p>
          <ContaPagarTable
            tenantSlug={tenantSlug}
            items={result.data}
            formasPagamento={formasPagamento}
            contasBancarias={contasBancarias}
          />
          <Suspense fallback={null}>
            <FinanceiroPagination
              tenantSlug={tenantSlug}
              basePath="contas-pagar"
              page={result.page}
              totalPages={result.totalPages}
            />
          </Suspense>
        </>
      )}
    </div>
  );
}
