import Link from "next/link";

import { DashboardBarChart } from "@/components/dashboard/dashboard-charts";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { buttonVariants } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { createEstoqueDashboardService } from "@/lib/estoque/estoque-dashboard-service";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissoes/constants";
import { createPermissionService } from "@/lib/permissoes/permission-service";
import { requireTenant } from "@/lib/tenants";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard de estoque" };

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

export default async function EstoqueDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ de?: string; ate?: string }>;
}) {
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
          title="Dashboard de estoque"
          breadcrumbs={[
            { label: "Estoque", href: `/${tenantSlug}/estoque` },
            { label: "Dashboard" },
          ]}
        />
        <p className="text-sm text-muted-foreground">Sem permissão.</p>
      </div>
    );
  }

  const service = await createEstoqueDashboardService(tenant.id);
  const data = await service.getData({
    de: sp.de,
    ate: sp.ate,
    tenantSlug,
  });

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Dashboard de estoque"
        description="Saldo, giro, alertas e valor"
        breadcrumbs={[
          { label: "Estoque", href: `/${tenantSlug}/estoque` },
          { label: "Dashboard" },
        ]}
      >
        <Link
          href={`/${tenantSlug}/estoque`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Movimentações
        </Link>
      </ModuleHeader>

      <SectionCard title="Filtros" contentClassName="pt-0">
        <form className="flex flex-wrap gap-3 text-sm">
          <label className="space-y-1">
            <span className="text-muted-foreground">De</span>
            <input
              type="date"
              name="de"
              defaultValue={sp.de ?? ""}
              className="flex h-10 rounded-md border border-input bg-transparent px-3"
            />
          </label>
          <label className="space-y-1">
            <span className="text-muted-foreground">Até</span>
            <input
              type="date"
              name="ate"
              defaultValue={sp.ate ?? ""}
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Kpi label="Produtos" value={String(data.kpis.quantidadeProdutos)} />
        <Kpi
          label="Valor do estoque"
          value={formatCurrency(data.kpis.valorTotal)}
        />
        <Kpi label="Abaixo do mínimo" value={String(data.kpis.abaixoMinimo)} />
        <Kpi label="Zerados" value={String(data.kpis.zerados)} />
        <Kpi label="Sem custo" value={String(data.kpis.semCusto)} />
        <Kpi label="Sem giro (90d)" value={String(data.kpis.semGiro)} />
        <Kpi
          label="Entradas no período"
          value={String(data.kpis.entradasPeriodo)}
        />
        <Kpi
          label="Saídas no período"
          value={String(data.kpis.saidasPeriodo)}
        />
        <Kpi
          label="Margem potencial"
          value={formatCurrency(data.kpis.margemPotencial)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardBarChart
          title="Valor por categoria"
          description="Estoque valorizado"
          data={data.porCategoria.map((p) => ({
            data: p.label,
            label: p.label,
            value: p.valor,
          }))}
        />
        <DashboardBarChart
          title="Mais vendidos no período"
          description="Quantidade em vendas faturadas"
          data={data.topVendidos.map((p) => ({
            data: p.label,
            label: p.label,
            value: p.valor,
          }))}
        />
      </div>

      <SectionCard title="Alertas de estoque">
        {data.alertas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum alerta crítico no momento.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.alertas.map((a, i) => (
              <li key={`${a.tipo}-${i}`} className="flex justify-between gap-2">
                <span>
                  <span className="text-xs uppercase text-muted-foreground">
                    {a.tipo}
                  </span>{" "}
                  {a.titulo}
                </span>
                {a.href ? (
                  <Link href={a.href} className="underline shrink-0">
                    Abrir
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
