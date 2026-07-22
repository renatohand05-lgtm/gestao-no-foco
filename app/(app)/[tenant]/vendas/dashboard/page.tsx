import Link from "next/link";

import { DashboardBarChart } from "@/components/dashboard/dashboard-charts";
import { ModuleHeader } from "@/components/layout/module-header";
import { ActionButton } from "@/components/ui/action-button";
import { buttonVariants } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { formatCurrency } from "@/lib/format";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissoes/constants";
import { createPermissionService } from "@/lib/permissoes/permission-service";
import { requireTenant } from "@/lib/tenants";
import { createVendasDashboardService } from "@/lib/vendas/vendas-dashboard-service";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard de vendas" };

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
    </div>
  );
}

export default async function VendasDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    de?: string;
    ate?: string;
    preset?: string;
    vendedor_id?: string;
    forma?: string;
  }>;
}) {
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
      <div className="space-y-4">
        <ModuleHeader
          title="Dashboard de vendas"
          breadcrumbs={[
            { label: "Vendas", href: `/${tenantSlug}/vendas` },
            { label: "Dashboard" },
          ]}
        />
        <p className="text-sm text-muted-foreground">
          Sem permissão para visualizar este dashboard.
        </p>
      </div>
    );
  }

  const service = await createVendasDashboardService(tenant.id);
  const data = await service.getData({
    de: sp.de,
    ate: sp.ate,
    preset: sp.preset,
    vendedor_id: sp.vendedor_id,
    forma: sp.forma,
  });

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Dashboard de vendas"
        description="Balcão, margem, descontos e ranking operacional"
        breadcrumbs={[
          { label: "Vendas", href: `/${tenantSlug}/vendas` },
          { label: "Dashboard" },
        ]}
      >
        <ActionButton
          action="create"
          label="Venda rápida"
          href={`/${tenantSlug}/vendas/rapida`}
        />
      </ModuleHeader>

      <SectionCard title="Filtros" contentClassName="pt-0">
        <form className="flex flex-wrap gap-3 text-sm">
          <label className="space-y-1">
            <span className="text-muted-foreground">Período</span>
            <select
              name="preset"
              defaultValue={sp.preset ?? "mes"}
              className="flex h-10 rounded-md border border-input bg-transparent px-3"
            >
              <option value="hoje">Hoje</option>
              <option value="ontem">Ontem</option>
              <option value="semana">Semana</option>
              <option value="mes">Mês</option>
              <option value="custom">Personalizado</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-muted-foreground">De</span>
            <input
              type="date"
              name="de"
              defaultValue={sp.de}
              className="flex h-10 rounded-md border border-input bg-transparent px-3"
            />
          </label>
          <label className="space-y-1">
            <span className="text-muted-foreground">Até</span>
            <input
              type="date"
              name="ate"
              defaultValue={sp.ate}
              className="flex h-10 rounded-md border border-input bg-transparent px-3"
            />
          </label>
          <label className="space-y-1">
            <span className="text-muted-foreground">Forma</span>
            <input
              name="forma"
              defaultValue={sp.forma ?? ""}
              placeholder="ex: PIX"
              className="flex h-10 rounded-md border border-input bg-transparent px-3"
            />
          </label>
          <button
            type="submit"
            className={cn(buttonVariants({ size: "sm" }), "mt-6")}
          >
            Aplicar
          </button>
        </form>
      </SectionCard>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <Kpi label="Faturamento hoje" value={formatCurrency(data.kpis.vendasDia)} />
        <Kpi label="Faturamento período" value={formatCurrency(data.kpis.vendasMes)} />
        <Kpi label="Qtd. vendas" value={String(data.kpis.quantidade)} />
        <Kpi label="Ticket médio" value={formatCurrency(data.kpis.ticketMedio)} />
        <Kpi label="Margem bruta" value={formatCurrency(data.kpis.margemBruta)} />
        <Kpi label="Custo vendido" value={formatCurrency(data.kpis.custoProdutos)} />
        <Kpi label="Descontos" value={formatCurrency(data.kpis.descontos)} />
        <Kpi label="Devoluções" value={String(data.kpis.devolucoes)} />
        <Kpi label="Sem cliente" value={String(data.kpis.consumidorNI)} />
        <Kpi label="Com cliente" value={String(data.kpis.comCliente)} />
        <Kpi label="Itens vendidos" value={String(data.kpis.itensVendidos)} />
        <Kpi label="Clientes únicos" value={String(data.kpis.clientesUnicos)} />
        <Kpi label="Canceladas" value={String(data.kpis.canceladas)} />
        <Kpi label="Lucro bruto" value={formatCurrency(data.kpis.lucroBruto)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardBarChart
          title="Vendas por dia"
          description="Faturamento diário"
          data={data.porDia.map((d) => ({
            data: d.label,
            label: d.label.slice(5),
            value: d.valor,
          }))}
        />
        <DashboardBarChart
          title="Vendas por hora"
          description="Distribuição horária (criação)"
          data={data.porHora.map((d) => ({
            data: d.label,
            label: d.label,
            value: d.valor,
          }))}
        />
        <DashboardBarChart
          title="Por forma de pagamento"
          description="Volume por forma"
          data={data.porForma.map((d) => ({
            data: d.label,
            label: d.label.slice(0, 14),
            value: d.valor,
          }))}
        />
        <DashboardBarChart
          title="Descontos por responsável"
          description="Valor autorizado"
          data={data.descontosPorResponsavel.map((d) => ({
            data: d.label,
            label: d.label.slice(0, 14),
            value: d.valor,
          }))}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <SectionCard title="Top produtos">
          <ul className="space-y-2 text-sm">
            {data.topProdutos.map((p) => (
              <li key={p.label} className="flex justify-between gap-2 border-b py-2">
                <span>
                  {p.label}{" "}
                  <span className="text-muted-foreground">
                    ({p.qtd} · margem {formatCurrency(p.margem)})
                  </span>
                </span>
                <strong>{formatCurrency(p.valor)}</strong>
              </li>
            ))}
            {data.topProdutos.length === 0 ? (
              <li className="text-muted-foreground">Sem dados.</li>
            ) : null}
          </ul>
        </SectionCard>
        <SectionCard title="Top categorias">
          <ul className="space-y-2 text-sm">
            {data.topCategorias.map((p) => (
              <li key={p.label} className="flex justify-between gap-2 border-b py-2">
                <span>
                  {p.label}{" "}
                  <span className="text-muted-foreground">({p.qtd})</span>
                </span>
                <strong>{formatCurrency(p.valor)}</strong>
              </li>
            ))}
            {data.topCategorias.length === 0 ? (
              <li className="text-muted-foreground">Sem dados.</li>
            ) : null}
          </ul>
        </SectionCard>
        <SectionCard title="Top vendedores">
          <ul className="space-y-2 text-sm">
            {data.topVendedores.map((p) => (
              <li key={p.label} className="flex justify-between gap-2 border-b py-2">
                <span>{p.label}</span>
                <strong>{formatCurrency(p.valor)}</strong>
              </li>
            ))}
            {data.topVendedores.length === 0 ? (
              <li className="text-muted-foreground">Sem dados.</li>
            ) : null}
          </ul>
        </SectionCard>
        <SectionCard title="Top clientes">
          <ul className="space-y-2 text-sm">
            {data.topClientes.map((p) => (
              <li key={p.label} className="flex justify-between gap-2 border-b py-2">
                <span>{p.label}</span>
                <strong>{formatCurrency(p.valor)}</strong>
              </li>
            ))}
            {data.topClientes.length === 0 ? (
              <li className="text-muted-foreground">Sem dados.</li>
            ) : null}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Atalhos">
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${tenantSlug}/vendas/rapida`}
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            Venda rápida
          </Link>
          <Link
            href={`/${tenantSlug}/vendas`}
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            Lista de vendas
          </Link>
          <Link
            href={`/${tenantSlug}/descontos/aprovacoes`}
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            Aprovar descontos
          </Link>
          <Link
            href={`/${tenantSlug}/estoque`}
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            Estoque
          </Link>
        </div>
      </SectionCard>
    </div>
  );
}
