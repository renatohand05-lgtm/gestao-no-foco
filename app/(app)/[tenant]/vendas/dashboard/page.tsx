import { Suspense } from "react";
import Link from "next/link";

import {
  ExecutiveButton,
  ExecutiveEmptyState,
  ExecutiveHeader,
  ExecutivePage,
  ExecutiveSection,
  ExecutiveSkeleton,
} from "@/components/executive";
import { CommercialActionQueue } from "@/components/vendas/commercial-action-queue";
import { CommercialDataCoverageNote } from "@/components/vendas/commercial-data-coverage-note";
import { CommercialDiscountPanel } from "@/components/vendas/commercial-discount-panel";
import { CommercialFunnel } from "@/components/vendas/commercial-funnel";
import { CommercialIntelligenceFilters } from "@/components/vendas/commercial-intelligence-filters";
import { CommercialKpiGrid } from "@/components/vendas/commercial-kpi-grid";
import { CommercialMetaPanel } from "@/components/vendas/commercial-meta-panel";
import { CommercialOriginPanel } from "@/components/vendas/commercial-origin-panel";
import { CommercialPipeline } from "@/components/vendas/commercial-pipeline";
import { CommercialRankingPanel } from "@/components/vendas/commercial-ranking-panel";
import {
  civilDateInTimezone,
  resolveTenantTimezone,
} from "@/lib/dashboard/tenant-timezone";
import { createClienteService } from "@/lib/clientes/cliente-service";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissoes/constants";
import { createPermissionService } from "@/lib/permissoes/permission-service";
import { requireTenant } from "@/lib/tenants";
import {
  CI_CANAL_LABELS,
  resolveCiPeriod,
} from "@/lib/vendas/commercial-intelligence-compose";
import { createCommercialIntelligenceService } from "@/lib/vendas/commercial-intelligence-service";
import { gofGrid, gofTypography } from "@/lib/design-system";

export const metadata = { title: "Inteligência Comercial" };

type PageProps = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    de?: string;
    ate?: string;
    preset?: string;
    responsavel?: string;
    origem?: string;
    status?: string;
    cliente?: string;
  }>;
};

function LoadingState() {
  return (
    <ExecutivePage width="wide" spacing="default">
      <ExecutiveSkeleton heightClassName="h-24" />
      <div className={gofGrid.kpis}>
        {Array.from({ length: 10 }).map((_, i) => (
          <ExecutiveSkeleton key={i} heightClassName="h-24" />
        ))}
      </div>
    </ExecutivePage>
  );
}

async function CommercialIntelligenceBody({ params, searchParams }: PageProps) {
  const { tenant: tenantSlug } = await params;
  const sp = await searchParams;
  const tenant = await requireTenant(tenantSlug);

  let canView =
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["vendas.visualizar_dashboard"] ??
    true;
  try {
    const perms = await createPermissionService(tenant.id, tenant.role);
    canView = await perms.has("vendas.visualizar_dashboard");
  } catch {
    canView = true;
  }

  if (!canView) {
    return (
      <ExecutivePage>
        <ExecutiveHeader title="Inteligência Comercial" />
        <p className={gofTypography.subtitle}>
          Sem permissão para visualizar este painel.
        </p>
      </ExecutivePage>
    );
  }

  const tz = resolveTenantTimezone();
  const hoje = civilDateInTimezone(new Date(), tz);
  const period = resolveCiPeriod({
    de: sp.de,
    ate: sp.ate,
    preset: sp.preset,
    hoje,
  });

  let data;
  let loadError: string | null = null;
  try {
    const service = await createCommercialIntelligenceService(tenant.id);
    data = await service.load({
      de: period.de,
      ate: period.ate,
      preset: sp.preset,
      responsavel: sp.responsavel,
      origem: sp.origem,
      status: sp.status,
      cliente: sp.cliente,
    });
  } catch (err) {
    loadError =
      err instanceof Error
        ? err.message
        : "Falha ao carregar inteligência comercial.";
  }

  if (loadError || !data) {
    return (
      <ExecutivePage>
        <ExecutiveHeader title="Inteligência Comercial" />
        <ExecutiveEmptyState
          title="Dados indisponíveis"
          description={loadError ?? "Não foi possível carregar o painel."}
        />
      </ExecutivePage>
    );
  }

  const responsavelOptions = data.rankings.responsaveisConfirmados.map(
    (r) => ({ id: r.key, nome: r.label }),
  );

  const origemOptions = [
    { value: "sem_origem", label: "Sem origem" },
    ...Object.entries(CI_CANAL_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  ];

  let clienteLabel: string | null = null;
  if (sp.cliente) {
    try {
      const clienteSvc = await createClienteService(tenant.id);
      const cli = await clienteSvc.getById(sp.cliente);
      clienteLabel = cli?.nome ?? null;
    } catch {
      clienteLabel = null;
    }
  }

  const semOrigemPct =
    data.cobertura.totalAvaliadas > 0
      ? Math.round(
          (data.cobertura.semOrigem / data.cobertura.totalAvaliadas) * 1000,
        ) / 10
      : null;

  const emptyPortfolio =
    data.kpis.quantidadeFaturadas.value === 0 &&
    data.kpis.valorEmNegociacao.value === 0 &&
    data.kpis.vendasCanceladas.value === 0 &&
    data.actionItems.length === 0;

  return (
    <ExecutivePage width="wide" spacing="loose">
      <ExecutiveHeader
        title="Inteligência Comercial"
        description="Pipeline, conversão e ações — sem misturar OS em produção com receita."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ExecutiveButton
              render={<Link href={`/${tenantSlug}/vendas/nova`} />}
            >
              Nova venda
            </ExecutiveButton>
            <ExecutiveButton
              variant="ghost"
              render={<Link href={`/${tenantSlug}/vendas/abertas`} />}
            >
              Orçamentos abertos
            </ExecutiveButton>
          </div>
        }
      />

      <ExecutiveSection title="Filtros" panel>
        <CommercialIntelligenceFilters
          tenantSlug={tenantSlug}
          de={data.period.de}
          ate={data.period.ate}
          responsavel={sp.responsavel}
          origem={sp.origem}
          status={sp.status}
          cliente={sp.cliente}
          clienteLabel={clienteLabel}
          responsavelOptions={responsavelOptions}
          origemOptions={origemOptions}
        />
      </ExecutiveSection>

      <CommercialDataCoverageNote cobertura={data.cobertura} />

      {emptyPortfolio ? (
        <ExecutiveEmptyState
          title="Sem vendas no período"
          description="Ajuste o filtro ou registre uma venda."
        />
      ) : null}

      <ExecutiveSection title="KPIs comerciais" panel>
        <CommercialKpiGrid
          tenantSlug={tenantSlug}
          kpis={data.kpis}
          de={data.period.de}
          ate={data.period.ate}
        />
      </ExecutiveSection>

      <ExecutiveSection title="Pipeline" panel>
        <CommercialPipeline pipeline={data.pipeline} oficina={data.oficina} />
      </ExecutiveSection>

      <div className={gofGrid.twoCol}>
        <CommercialFunnel kpis={data.kpis} />
        <CommercialMetaPanel tenantSlug={tenantSlug} meta={data.meta} />
      </div>

      <CommercialActionQueue
        tenantSlug={tenantSlug}
        items={data.actionItems}
      />

      <ExecutiveSection title="Rankings" description="Desempenho por dimensão.">
        <div className={gofGrid.threeCol}>
          <CommercialRankingPanel
            title="Responsáveis comerciais confirmados"
            description="Somente vendedor_id / responsável comercial explícito."
            rows={data.rankings.responsaveisConfirmados}
            emptyLabel="Nenhum responsável comercial confirmado no período."
          />
          <CommercialRankingPanel
            title="Registros por criador"
            description="Fallback técnico (created_by) — não misturado com vendedores."
            rows={data.rankings.registrosPorCriador}
            emptyLabel="Nenhum registro apenas com criador no período."
          />
          <CommercialOriginPanel
            rows={data.rankings.origens}
            coberturaSemOrigemPct={semOrigemPct}
            aviso={data.cobertura.avisoOrigem}
          />
          <CommercialRankingPanel
            title="Clientes"
            rows={data.rankings.clientes}
          />
          <CommercialRankingPanel
            title="Produtos"
            rows={data.rankings.produtos}
            emptyLabel="Sem itens de produto no período."
          />
          <CommercialRankingPanel
            title="Serviços"
            rows={data.rankings.servicos}
            emptyLabel="Sem itens de serviço no período."
          />
          <CommercialRankingPanel
            title="Maiores tickets"
            rows={data.rankings.maioresTickets}
          />
          <CommercialRankingPanel
            title="Maiores descontos"
            rows={data.rankings.maioresDescontos}
          />
          <CommercialRankingPanel
            title="Maiores perdas"
            description="Cancelados no período."
            rows={data.rankings.maioresPerdas}
          />
        </div>
      </ExecutiveSection>

      <CommercialDiscountPanel data={data.descontos} />
    </ExecutivePage>
  );
}

export default function VendasDashboardPage(props: PageProps) {
  return (
    <Suspense fallback={<LoadingState />}>
      <CommercialIntelligenceBody {...props} />
    </Suspense>
  );
}
