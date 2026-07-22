import Link from "next/link";

import { DashboardBarChart } from "@/components/dashboard/dashboard-charts";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { createDescontoDashboardService } from "@/lib/descontos/desconto-dashboard-service";
import { formatCurrency } from "@/lib/format";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Dashboard de descontos" };

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

export default async function DescontosDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ de?: string; ate?: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const { de, ate } = await searchParams;
  const tenant = await requireTenant(tenantSlug);
  const service = await createDescontoDashboardService(tenant.id);
  const data = await service.getData(
    de ? `${de}T00:00:00` : undefined,
    ate ? `${ate}T23:59:59` : undefined,
  );

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Dashboard de descontos"
        description="Alçadas, motivos e impacto no faturamento"
        breadcrumbs={[
          { label: "Vendas", href: `/${tenantSlug}/vendas` },
          { label: "Descontos" },
        ]}
      />

      <form className="flex flex-wrap gap-3 text-sm">
        <label className="space-y-1">
          <span className="text-muted-foreground">De</span>
          <input
            type="date"
            name="de"
            defaultValue={de}
            className="flex h-10 rounded-md border border-input bg-transparent px-3"
          />
        </label>
        <label className="space-y-1">
          <span className="text-muted-foreground">Até</span>
          <input
            type="date"
            name="ate"
            defaultValue={ate}
            className="flex h-10 rounded-md border border-input bg-transparent px-3"
          />
        </label>
        <button
          type="submit"
          className="mt-6 h-10 rounded-md bg-primary px-4 text-primary-foreground"
        >
          Filtrar
        </button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Descontos hoje" value={formatCurrency(data.kpis.totalDia)} />
        <Kpi label="Descontos no mês" value={formatCurrency(data.kpis.totalMes)} />
        <Kpi
          label="% sobre faturamento"
          value={`${data.kpis.percentualSobreFaturamento}%`}
        />
        <Kpi label="Desconto médio" value={formatCurrency(data.kpis.descontoMedio)} />
        <Kpi label="OS com desconto" value={String(data.kpis.qtdOs)} />
        <Kpi label="Vendas com desconto" value={String(data.kpis.qtdVendas)} />
        <Kpi label="Maior desconto" value={formatCurrency(data.kpis.maiorDesconto)} />
        <Kpi
          label="Margem perdida"
          value={formatCurrency(data.kpis.margemPerdida)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardBarChart
          title="Evolução diária"
          description="Total de descontos por dia"
          data={data.porDia.map((d) => ({
            data: d.label,
            label: d.label.slice(5),
            value: d.valor,
          }))}
        />
        <DashboardBarChart
          title="Por motivo / tipo"
          description="Distribuição dos descontos aprovados"
          data={data.porMotivo.map((d) => ({
            data: d.label,
            label: d.label.slice(0, 14),
            value: d.valor,
          }))}
        />
      </div>

      <SectionCard title="Últimos descontos" description="Drill-down para a operação">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="p-2">Data</th>
                <th className="p-2">Tipo</th>
                <th className="p-2">Valor</th>
                <th className="p-2">%</th>
                <th className="p-2">Motivo</th>
                <th className="p-2">Operação</th>
              </tr>
            </thead>
            <tbody>
              {data.eventos.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="p-2">
                    {new Date(e.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="p-2">{e.entidade_tipo.toUpperCase()}</td>
                  <td className="p-2">{formatCurrency(e.valor_desconto)}</td>
                  <td className="p-2">{e.percentual}%</td>
                  <td className="p-2">{e.motivo}</td>
                  <td className="p-2">
                    <Link
                      className="underline"
                      href={
                        e.entidade_tipo === "os"
                          ? `/${tenantSlug}/ordens/${e.entidade_id}`
                          : `/${tenantSlug}/vendas/${e.entidade_id}`
                      }
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
              {data.eventos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-muted-foreground">
                    Nenhum desconto no período.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
