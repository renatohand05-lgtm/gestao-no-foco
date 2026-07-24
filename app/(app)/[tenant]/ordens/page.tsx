import { Suspense } from "react";
import Link from "next/link";

import { OsCentralKpis } from "@/components/ordens/os-central-kpis";
import { OsCentralPaginationBar } from "@/components/ordens/os-central-pagination";
import {
  OsCentralErrorState,
  OsCentralLoading,
} from "@/components/ordens/os-central-state";
import { OsCentralTable } from "@/components/ordens/os-central-table";
import { OsSubnav } from "@/components/ordens/os-subnav";
import { ModuleHeader } from "@/components/layout/module-header";
import { buttonVariants } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { createMecanicoService } from "@/lib/mecanicos/mecanico-service";
import { createCentroOperacoesService } from "@/lib/operacoes/centro-operacoes-service";
import {
  buildOsCentralPagination,
  composeOsCentralKpis,
  enrichOsCentralRows,
  filterOsCentralRows,
  hasOsCentralFilters,
  OS_CENTRAL_PER_PAGE_OPTIONS,
  OS_CENTRAL_SORT_OPTIONS,
  osCentralClearHref,
  osCentralHref,
  resolveOsCentralSort,
  type OsCentralKpis as OsCentralKpisData,
} from "@/lib/ordens/os-central-compose";
import { createOrdemServicoService } from "@/lib/ordens/ordem-servico-service";
import { createOsDashboardService } from "@/lib/ordens/os-dashboard-service";
import {
  OS_PRIORIDADE_OPTIONS,
  OS_STATUS,
  OS_STATUS_LABELS,
} from "@/lib/ordens/os-status";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissoes/constants";
import { createPermissionService } from "@/lib/permissoes/permission-service";
import { cn } from "@/lib/utils";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Central de Ordens de Serviço" };

type PageProps = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    status?: string;
    q?: string;
    de?: string;
    ate?: string;
    mecanico_id?: string;
    consultor_id?: string;
    cliente_id?: string;
    veiculo_id?: string;
    centro_custo_id?: string;
    incluir_arquivadas?: string;
    prioridade?: string;
    cliente?: string;
    veiculo?: string;
    sort?: string;
    page?: string;
    perPage?: string;
  }>;
};

function cardCount(
  cards: { key: string; count: number }[] | undefined,
  key: string,
): number | null {
  const found = cards?.find((c) => c.key === key);
  return found ? found.count : null;
}

function parsePerPage(raw?: string): number {
  const n = Number(raw);
  if (n === 25 || n === 50 || n === 100) return n;
  return 25;
}

async function OrdensCentralBody({ params, searchParams }: PageProps) {
  const { tenant: tenantSlug } = await params;
  const sp = await searchParams;
  const tenant = await requireTenant(tenantSlug);
  const sort = resolveOsCentralSort(sp.sort);
  const page = Math.max(1, Number(sp.page) || 1);
  const perPage = parsePerPage(sp.perPage);

  const filterState = {
    status: sp.status,
    mecanico_id: sp.mecanico_id,
    de: sp.de,
    ate: sp.ate,
    cliente: sp.cliente,
    veiculo: sp.veiculo,
    prioridade: sp.prioridade,
    q: sp.q,
    incluir_arquivadas: sp.incluir_arquivadas === "1",
    sort: sp.sort,
  };
  const hasFilters = hasOsCentralFilters(filterState);

  const baseParams = {
    status: sp.status,
    q: sp.q,
    de: sp.de,
    ate: sp.ate,
    mecanico_id: sp.mecanico_id,
    prioridade: sp.prioridade,
    cliente: sp.cliente,
    veiculo: sp.veiculo,
    sort,
    incluir_arquivadas: sp.incluir_arquivadas === "1" ? "1" : undefined,
    perPage,
  };

  let listResult;
  let mecanicos;
  let centro;
  let dashboard;
  let hojeMetrics;

  try {
    const service = await createOrdemServicoService(tenant.id);
    const mecanicoService = await createMecanicoService(tenant.id);
    const centroService = await createCentroOperacoesService(tenant.id);
    const dashboardService = await createOsDashboardService(tenant.id);

    [listResult, mecanicos, centro, dashboard, hojeMetrics] = await Promise.all([
      service.list({
        status: sp.status || "all",
        q: sp.q,
        de: sp.de,
        ate: sp.ate,
        mecanico_id: sp.mecanico_id,
        consultor_id: sp.consultor_id,
        cliente_id: sp.cliente_id,
        veiculo_id: sp.veiculo_id,
        centro_custo_id: sp.centro_custo_id,
        incluir_arquivadas: sp.incluir_arquivadas === "1",
        prioridade: sp.prioridade,
        sort,
        page,
        perPage,
      }),
      mecanicoService.list({ status: "all" }).catch(() => []),
      centroService.getData(tenantSlug).catch(() => null),
      dashboardService.getData({}).catch(() => null),
      service.countFinalizacaoHoje().catch(() => ({
        finalizadasHoje: 0,
        entreguesHoje: 0,
      })),
    ]);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao carregar dados.";
    return (
      <div className="space-y-6">
        <ModuleHeader
          title="Central de Ordens de Serviço"
          description={`Visão operacional enterprise · ${tenant.name}`}
          breadcrumbs={[{ label: "Ordens" }]}
        >
          <OsSubnav tenantSlug={tenantSlug} active="lista" />
        </ModuleHeader>
        <OsCentralErrorState tenantSlug={tenantSlug} message={message} />
      </div>
    );
  }

  // Filtros texto cliente/veículo ainda podem refinar a página (server já paginou).
  const enriched = enrichOsCentralRows(listResult.items);
  const rows = filterOsCentralRows(enriched, {
    cliente: sp.cliente,
    veiculo: sp.veiculo,
  });

  const pagination = buildOsCentralPagination({
    page: listResult.page,
    perPage: listResult.perPage,
    total: listResult.total,
  });

  const fromList = composeOsCentralKpis(listResult.items, {
    ticketMedio: dashboard?.kpis.ticketMedio ?? null,
    finalizadasHoje: hojeMetrics.finalizadasHoje,
    entreguesHoje: hojeMetrics.entreguesHoje,
  });

  const kpis: OsCentralKpisData = {
    abertas: cardCount(centro?.cards, "abertas") ?? fromList.abertas,
    emDiagnostico:
      cardCount(centro?.cards, "diagnostico") ?? fromList.emDiagnostico,
    aguardandoAprovacao:
      cardCount(centro?.cards, "aprovacao") ?? fromList.aguardandoAprovacao,
    aguardandoPecas:
      cardCount(centro?.cards, "pecas") ?? fromList.aguardandoPecas,
    emExecucao: cardCount(centro?.cards, "execucao") ?? fromList.emExecucao,
    finalizadasHoje: hojeMetrics.finalizadasHoje,
    entreguesHoje: hojeMetrics.entreguesHoje,
    atrasadas: cardCount(centro?.cards, "atrasadas") ?? fromList.atrasadas,
    ticketMedio: fromList.ticketMedio,
    valorEmProducao: fromList.valorEmProducao,
  };

  let canCancel = DEFAULT_ROLE_PERMISSIONS[tenant.role]["os.cancelar"];
  let canArquivar = DEFAULT_ROLE_PERMISSIONS[tenant.role]["os.arquivar"];
  let canExcluirRascunho =
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["os.excluir_rascunho"];
  let canRestaurar = DEFAULT_ROLE_PERMISSIONS[tenant.role]["os.restaurar"];
  try {
    const perms = await createPermissionService(tenant.id, tenant.role);
    canCancel = await perms.has("os.cancelar");
    canArquivar = await perms.has("os.arquivar");
    canExcluirRascunho = await perms.has("os.excluir_rascunho");
    canRestaurar = await perms.has("os.restaurar");
  } catch {
    /* ok */
  }

  const clearHref = osCentralClearHref(tenantSlug);
  const prevHref = pagination.hasPrev
    ? osCentralHref(tenantSlug, { ...baseParams, page: pagination.page - 1 })
    : null;
  const nextHref = pagination.hasNext
    ? osCentralHref(tenantSlug, { ...baseParams, page: pagination.page + 1 })
    : null;
  const perPageHrefs = Object.fromEntries(
    OS_CENTRAL_PER_PAGE_OPTIONS.map((n) => [
      n,
      osCentralHref(tenantSlug, { ...baseParams, perPage: n, page: 1 }),
    ]),
  ) as Record<number, string>;

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Central de Ordens de Serviço"
        description={`Visão operacional enterprise · ${tenant.name}`}
        breadcrumbs={[{ label: "Ordens" }]}
      >
        <OsSubnav tenantSlug={tenantSlug} active="lista" />
      </ModuleHeader>

      <OsCentralKpis tenantSlug={tenantSlug} kpis={kpis} />

      <SectionCard title="Filtros" contentClassName="pt-0">
        <form
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          aria-label="Filtros da Central de OS"
        >
          {/* Reset page on filter submit */}
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="perPage" value={String(perPage)} />

          <select
            name="status"
            defaultValue={sp.status ?? "all"}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            aria-label="Status"
          >
            <option value="all">Todos os status</option>
            {OS_STATUS.map((s) => (
              <option key={s} value={s}>
                {OS_STATUS_LABELS[s]}
              </option>
            ))}
          </select>

          <select
            name="mecanico_id"
            defaultValue={sp.mecanico_id ?? ""}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            aria-label="Responsável"
          >
            <option value="">Todos os responsáveis</option>
            {mecanicos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome_completo}
              </option>
            ))}
          </select>

          <input
            type="date"
            name="de"
            defaultValue={sp.de ?? ""}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            aria-label="Data de"
          />
          <input
            type="date"
            name="ate"
            defaultValue={sp.ate ?? ""}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            aria-label="Data até"
          />

          <input
            name="cliente"
            defaultValue={sp.cliente ?? ""}
            placeholder="Cliente"
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            aria-label="Cliente"
          />
          <input
            name="veiculo"
            defaultValue={sp.veiculo ?? ""}
            placeholder="Veículo (placa ou modelo)"
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            aria-label="Veículo"
          />

          <select
            name="prioridade"
            defaultValue={sp.prioridade ?? "all"}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            aria-label="Prioridade"
          >
            <option value="all">Todas as prioridades</option>
            {OS_PRIORIDADE_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          <select
            name="sort"
            defaultValue={sort}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            aria-label="Ordenação"
          >
            {OS_CENTRAL_SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Pesquisa rápida: nº, cliente, placa…"
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm sm:col-span-2"
            aria-label="Pesquisa rápida"
          />

          <label className="flex h-9 items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="incluir_arquivadas"
              value="1"
              defaultChecked={sp.incluir_arquivadas === "1"}
            />
            Incluir arquivadas
          </label>

          <div className="flex flex-wrap items-center gap-2 sm:col-span-2 xl:col-span-1">
            <button type="submit" className={cn(buttonVariants({ size: "sm" }))}>
              Filtrar
            </button>
            <Link
              href={clearHref}
              className={cn(
                buttonVariants({
                  variant: hasFilters ? "outline" : "ghost",
                  size: "sm",
                }),
              )}
            >
              Limpar filtros
            </Link>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title={`Lista operacional · ${pagination.total} OS`}
        contentClassName="pt-0"
      >
        <OsCentralTable
          tenantSlug={tenantSlug}
          rows={rows}
          hasFilters={hasFilters}
          canCancel={canCancel}
          canArquivar={canArquivar}
          canExcluirRascunho={canExcluirRascunho}
          canRestaurar={canRestaurar}
        />
        <OsCentralPaginationBar
          pagination={pagination}
          prevHref={prevHref}
          nextHref={nextHref}
          perPageHrefs={perPageHrefs}
        />
      </SectionCard>
    </div>
  );
}

export default function OrdensPage(props: PageProps) {
  return (
    <Suspense fallback={<OsCentralLoading />}>
      <OrdensCentralBody {...props} />
    </Suspense>
  );
}
