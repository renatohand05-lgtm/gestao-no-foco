import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  createQualidadeOperacionalService,
} from "@/lib/qualidade-operacional/qualidade-operacional-service";
import { defaultDashboardPeriodo } from "@/lib/dashboard/dashboard-service";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/dashboard/format";
import { requireTenant } from "@/lib/tenants";
import type { DashboardFilters } from "@/types/dashboard-executive";

export const metadata = { title: "Qualidade Operacional" };

type PageProps = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    dataDe?: string;
    dataAte?: string;
  }>;
};

function resolveFilters(searchParams: {
  dataDe?: string;
  dataAte?: string;
}): DashboardFilters {
  const defaults = defaultDashboardPeriodo();
  return {
    dataDe: searchParams.dataDe ?? defaults.dataDe,
    dataAte: searchParams.dataAte ?? defaults.dataAte,
  };
}

export default async function QualidadeOperacionalPage({
  params,
  searchParams,
}: PageProps) {
  const { tenant: tenantSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const tenant = await requireTenant(tenantSlug);
  const filters = resolveFilters(resolvedSearchParams);

  let data;
  try {
    const service = await createQualidadeOperacionalService(tenant.id);
    data = await service.getQualidadeOperacional(filters);
  } catch (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Qualidade Operacional"
          description={`Retorno de serviços — ${tenant.name}`}
        />
        <DashboardEmptyState
          variant="error"
          description={
            error instanceof Error
              ? error.message
              : "Não foi possível carregar os dados de qualidade operacional."
          }
          actionHref={`/${tenantSlug}/ordens/qualidade-operacional`}
          actionLabel="Tentar novamente"
        />
      </div>
    );
  }

  if (!data.hasData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Qualidade Operacional"
          description={`Retorno de serviços — ${tenant.name}`}
        />
        <DashboardEmptyState
          title="Sem dados de retorno"
          description="Conclua ordens de serviço e registre retornos para acompanhar a qualidade operacional."
          actionHref={`/${tenantSlug}/ordens`}
          actionLabel="Ir para ordens de serviço"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Qualidade Operacional"
        description={`Drill-down de retornos — ${tenant.name}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/60 bg-card/80 p-4">
          <p className="text-xs text-muted-foreground">Taxa de retorno</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatPercent(data.kpi.taxaRetornoPct)}
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/80 p-4">
          <p className="text-xs text-muted-foreground">Retornos</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatNumber(data.kpi.quantidadeRetornos)}
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/80 p-4">
          <p className="text-xs text-muted-foreground">Serviços concluídos</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatNumber(data.kpi.totalServicosConcluidos)}
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/80 p-4">
          <p className="text-xs text-muted-foreground">Custo total</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatCurrency(data.financeiro.custo_total)}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Veículo</th>
              <th className="px-4 py-3">OS original</th>
              <th className="px-4 py-3">Data retorno</th>
              <th className="px-4 py-3">Dias</th>
              <th className="px-4 py-3">Motivo</th>
              <th className="px-4 py-3">Mecânico</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Cobertura</th>
            </tr>
          </thead>
          <tbody>
            {data.drillDown.map((item) => (
              <tr key={item.id} className="border-t border-border/60">
                <td className="px-4 py-3">{item.cliente}</td>
                <td className="px-4 py-3">{item.veiculo}</td>
                <td className="px-4 py-3">{item.osOriginal}</td>
                <td className="px-4 py-3 tabular-nums">{item.dataRetorno}</td>
                <td className="px-4 py-3 tabular-nums">
                  {item.diasEntreServicoRetorno}
                </td>
                <td className="px-4 py-3">{item.motivo}</td>
                <td className="px-4 py-3">{item.mecanico}</td>
                <td className="px-4 py-3 tabular-nums">
                  {formatCurrency(item.valorRetorno)}
                </td>
                <td className="px-4 py-3 capitalize">{item.tipoCobertura}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
