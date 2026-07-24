import { Suspense } from "react";
import Link from "next/link";

import { ExecutiveStockFilters } from "@/components/estoque/executive-stock-filters";
import { ExecutiveStockKpiGrid } from "@/components/estoque/executive-stock-kpi-grid";
import {
  ExecutiveStockAlerts,
  ExecutiveStockCompras,
  ExecutiveStockCriticos,
  ExecutiveStockDistribuicao,
  ExecutiveStockParados,
  ExecutiveStockRankings,
} from "@/components/estoque/executive-stock-panels";
import { ModuleHeader } from "@/components/layout/module-header";
import { buttonVariants } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { createExecutiveStockService } from "@/lib/estoque/executive-stock-service";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissoes/constants";
import { createPermissionService } from "@/lib/permissoes/permission-service";
import { requireTenant } from "@/lib/tenants";
import { cn } from "@/lib/utils";

export const metadata = { title: "Central Executiva de Estoque" };

type PageProps = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    categoria?: string;
    fornecedor?: string;
    criticidade?: string;
    saldo?: string;
    movimentacao?: string;
    q?: string;
  }>;
};

function LoadingState() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando">
      <div className="h-20 animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}

async function ExecutiveStockBody({ params, searchParams }: PageProps) {
  const { tenant: tenantSlug } = await params;
  const sp = await searchParams;
  const tenant = await requireTenant(tenantSlug);

  let canView =
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["dashboard.visualizar_estoque"] ??
    true;
  try {
    const perms = await createPermissionService(tenant.id, tenant.role);
    canView = await perms.has("dashboard.visualizar_estoque");
  } catch {
    /* ok */
  }

  if (!canView) {
    return (
      <div className="space-y-4">
        <ModuleHeader
          title="Central Executiva de Estoque"
          breadcrumbs={[
            { label: "Estoque", href: `/${tenantSlug}/estoque` },
            { label: "Central Executiva" },
          ]}
        />
        <p className="text-sm text-muted-foreground">Sem permissão.</p>
      </div>
    );
  }

  let data;
  let loadError: string | null = null;
  try {
    const service = await createExecutiveStockService(tenant.id);
    data = await service.load(tenantSlug, {
      categoria: sp.categoria,
      fornecedor: sp.fornecedor,
      criticidade: sp.criticidade,
      saldo: sp.saldo,
      movimentacao: sp.movimentacao,
      q: sp.q,
    });
  } catch (err) {
    loadError =
      err instanceof Error
        ? err.message
        : "Falha ao carregar a Central Executiva de Estoque.";
  }

  if (loadError || !data) {
    return (
      <div className="space-y-4">
        <ModuleHeader
          title="Central Executiva de Estoque"
          breadcrumbs={[
            { label: "Estoque", href: `/${tenantSlug}/estoque` },
            { label: "Central Executiva" },
          ]}
        />
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          {loadError ?? "Dados indisponíveis."}
        </p>
      </div>
    );
  }

  const partial =
    data.kpis.valorTotalEstoque.partial ||
    data.kpis.valorComprometidoOs.partial ||
    !data.kpis.giroMedio.available ||
    !data.kpis.coberturaEstoque.available ||
    !data.kpis.valorReservado.available;

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Central Executiva de Estoque"
        description="Inteligência operacional com dados já existentes — sem previsão por IA."
        breadcrumbs={[
          { label: "Estoque", href: `/${tenantSlug}/estoque` },
          { label: "Central Executiva" },
        ]}
      >
        <Link
          href={`/${tenantSlug}/estoque`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Movimentações
        </Link>
        <Link
          href={`/${tenantSlug}/produtos`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Produtos
        </Link>
      </ModuleHeader>

      <SectionCard title="Filtros">
        <ExecutiveStockFilters
          tenantSlug={tenantSlug}
          categoria={sp.categoria}
          fornecedor={sp.fornecedor}
          criticidade={sp.criticidade}
          saldo={sp.saldo}
          movimentacao={sp.movimentacao}
          q={sp.q}
          categorias={data.filterOptions.categorias}
          fornecedores={data.filterOptions.fornecedores}
        />
      </SectionCard>

      {partial ? (
        <p className="rounded-lg border border-amber-300/60 bg-amber-50/50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
          Dados parciais: alguns KPIs usam proxy documentado ou estão
          Indisponíveis por falta de histórico/cadastro. Zeros só aparecem quando
          o valor é real.
        </p>
      ) : null}

      {data.meta.totalFiltrado === 0 ? (
        <SectionCard title="Carteira">
          <p className="text-sm text-muted-foreground">
            Nenhum produto na carteira filtrada.
            {data.meta.totalCarteira > 0
              ? ` (${data.meta.totalCarteira} SKU(s) ativos no tenant).`
              : ""}
          </p>
        </SectionCard>
      ) : null}

      <ExecutiveStockKpiGrid kpis={data.kpis} />
      <ExecutiveStockAlerts alerts={data.alerts} />
      <ExecutiveStockCriticos rows={data.criticos} tenantSlug={tenantSlug} />
      <ExecutiveStockParados rows={data.parados} tenantSlug={tenantSlug} />
      <ExecutiveStockCompras rows={data.compras} tenantSlug={tenantSlug} />
      <ExecutiveStockRankings rankings={data.rankings} />
      <ExecutiveStockDistribuicao distribuicao={data.distribuicao} />
    </div>
  );
}

export default function EstoqueDashboardPage(props: PageProps) {
  return (
    <Suspense fallback={<LoadingState />}>
      <ExecutiveStockBody {...props} />
    </Suspense>
  );
}
