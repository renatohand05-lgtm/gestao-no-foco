import { Suspense } from "react";

import { EstoqueAlerts } from "@/components/estoque/estoque-alerts";
import { EstoqueEmptyState } from "@/components/estoque/estoque-empty-state";
import { EstoqueFeedback } from "@/components/estoque/estoque-feedback";
import { EstoqueFilters } from "@/components/estoque/estoque-filters";
import { EstoquePagination } from "@/components/estoque/estoque-pagination";
import { EstoqueProdutosTable } from "@/components/estoque/estoque-produtos-table";
import { EstoqueSearch } from "@/components/estoque/estoque-search";
import { EstoqueSort } from "@/components/estoque/estoque-sort";
import { EstoqueTable } from "@/components/estoque/estoque-table";
import { ModuleHeader } from "@/components/layout/module-header";
import { ActionButton } from "@/components/ui/action-button";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { SectionCard } from "@/components/ui/section-card";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { ESTOQUE_DEFAULT_PER_PAGE } from "@/lib/estoque/constants";
import { createEstoqueService } from "@/lib/estoque/estoque-service";
import { requireTenant } from "@/lib/tenants";
import type {
  EstoqueSuccessMessage,
  MovimentacaoSortField,
  MovimentacaoTipo,
  SortOrder,
} from "@/types/estoque";

export const metadata = { title: "Estoque" };

type EstoquePageProps = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    q?: string;
    page?: string;
    sort?: string;
    order?: string;
    tipo?: string;
    origem?: string;
    success?: string;
    error?: string;
  }>;
};

function ToolbarFallback() {
  return <SkeletonCard lines={2} />;
}

export default async function EstoquePage({
  params,
  searchParams,
}: EstoquePageProps) {
  const { tenant: tenantSlug } = await params;
  const { q, page, sort, order, tipo, origem, success, error } =
    await searchParams;
  const tenant = await requireTenant(tenantSlug);
  const service = await createEstoqueService(tenant.id);

  const currentPage = Number(page) > 0 ? Number(page) : 1;
  const sortField = (sort as MovimentacaoSortField | undefined) ?? "created_at";
  const sortOrder = (order as SortOrder | undefined) ?? "desc";
  const tipoFilter = (tipo as MovimentacaoTipo | "all" | undefined) ?? "all";

  const [alertas, produtosResumo, movimentacoes] = await Promise.all([
    service.listAlertasEstoqueBaixo(),
    service.listProdutosEstoque({ perPage: 10 }),
    service.listMovimentacoes({
      search: q,
      page: currentPage,
      perPage: ESTOQUE_DEFAULT_PER_PAGE,
      sort: sortField,
      order: sortOrder,
      tipo: tipoFilter,
      origem: origem && origem !== "all" ? origem : undefined,
    }),
  ]);

  const hasFilters =
    Boolean(q) || tipoFilter !== "all" || Boolean(origem && origem !== "all");

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Estoque"
        description={`Controle de movimentações de ${tenant.name}`}
        breadcrumbs={[{ label: "Estoque" }]}
      >
        <ActionButton
          action="create"
          label="Nova movimentação"
          href={`/${tenantSlug}/estoque/nova-movimentacao`}
        />
      </ModuleHeader>

      <EstoqueFeedback
        success={success as EstoqueSuccessMessage | undefined}
        error={error}
      />

      <EstoqueAlerts tenantSlug={tenantSlug} produtos={alertas} />

      <SectionCard
        title="Estoque atual por produto"
        description="Visão resumida das quantidades em estoque."
      >
        {produtosResumo.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum produto com controle de estoque cadastrado.
          </p>
        ) : (
          <EstoqueProdutosTable
            tenantSlug={tenantSlug}
            produtos={produtosResumo.data}
          />
        )}
      </SectionCard>

      <SectionCard
        title="Histórico de movimentações"
        description="Entradas, saídas e ajustes registrados."
      >
        <Suspense fallback={<ToolbarFallback />}>
          <div className="mb-4 space-y-4">
            <DataTableToolbar>
              <EstoqueSearch tenantSlug={tenantSlug} defaultValue={q ?? ""} />
            </DataTableToolbar>
            <EstoqueFilters
              tenantSlug={tenantSlug}
              currentTipo={tipoFilter}
              currentOrigem={origem ?? "all"}
            />
            <EstoqueSort
              tenantSlug={tenantSlug}
              currentSort={sortField}
              currentOrder={sortOrder}
            />
          </div>
        </Suspense>

        {movimentacoes.data.length === 0 ? (
          <EstoqueEmptyState tenantSlug={tenantSlug} hasFilters={hasFilters} />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {movimentacoes.total} movimenta
              {movimentacoes.total === 1 ? "ção" : "ções"} encontrada
              {movimentacoes.total === 1 ? "" : "s"}
            </p>
            <EstoqueTable
              tenantSlug={tenantSlug}
              movimentacoes={movimentacoes.data}
            />
            <EstoquePagination
              tenantSlug={tenantSlug}
              page={movimentacoes.page}
              totalPages={movimentacoes.totalPages}
            />
          </div>
        )}
      </SectionCard>
    </div>
  );
}
