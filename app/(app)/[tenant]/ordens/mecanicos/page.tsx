import Link from "next/link";

import { DashboardBarChart } from "@/components/dashboard/dashboard-charts";
import { ModuleHeader } from "@/components/layout/module-header";
import { OsSubnav } from "@/components/ordens/os-subnav";
import { SectionCard } from "@/components/ui/section-card";
import { formatCurrency } from "@/lib/format";
import { createMecanicosDashboardService } from "@/lib/operacoes/mecanicos-dashboard-service";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissoes/constants";
import { createPermissionService } from "@/lib/permissoes/permission-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Dashboard de mecânicos" };

export default async function MecanicosDashboardPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);

  let canView =
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["dashboard.visualizar_mecanicos"] ??
    true;
  try {
    const perms = await createPermissionService(tenant.id, tenant.role);
    canView = await perms.has("dashboard.visualizar_mecanicos");
  } catch {
    /* ok */
  }

  if (!canView) {
    return (
      <div className="space-y-4">
        <ModuleHeader
          title="Mecânicos"
          breadcrumbs={[
            { label: "Ordens", href: `/${tenantSlug}/ordens` },
            { label: "Mecânicos" },
          ]}
        />
        <p className="text-sm text-muted-foreground">Sem permissão.</p>
      </div>
    );
  }

  const service = await createMecanicosDashboardService(tenant.id);
  const data = await service.getData();

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Produtividade da oficina"
        description="Indicadores para gestão e desenvolvimento — não para punição automática"
        breadcrumbs={[
          { label: "Ordens", href: `/${tenantSlug}/ordens` },
          { label: "Mecânicos" },
        ]}
      >
        <div className="flex flex-wrap gap-2">
          <OsSubnav tenantSlug={tenantSlug} active="mecanicos" />
          <Link
            href={`/${tenantSlug}/oficina/mecanicos`}
            className="text-sm underline self-center"
          >
            Cadastro de mecânicos
          </Link>
        </div>
      </ModuleHeader>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SectionCard title="Cadastro ativos">
          <p className="text-2xl font-semibold tabular-nums">
            {data.resumoCusto.ativosCadastro}
          </p>
        </SectionCard>
        <SectionCard title="Custo competência (mês)">
          <p className="text-2xl font-semibold tabular-nums">
            {formatCurrency(data.resumoCusto.custoCompetencia)}
          </p>
          <p className="text-xs text-muted-foreground">
            Via obrigações geradas (CAP → DRE)
          </p>
        </SectionCard>
        <SectionCard title="Mês anterior">
          <p className="text-2xl font-semibold tabular-nums">
            {formatCurrency(data.resumoCusto.mesAnterior)}
          </p>
        </SectionCard>
        <SectionCard title="Variação">
          <p className="text-2xl font-semibold tabular-nums">
            {data.resumoCusto.variacaoPercentual != null
              ? `${data.resumoCusto.variacaoPercentual}%`
              : "—"}
          </p>
        </SectionCard>
      </div>

      <SectionCard title="Como calculamos">
        <ul className="text-xs text-muted-foreground space-y-1">
          {Object.entries(data.formulas).map(([k, v]) => (
            <li key={k}>
              <span className="font-medium text-foreground">{k}:</span> {v}
            </li>
          ))}
        </ul>
      </SectionCard>

      {data.mecanicos.length === 0 ? (
        <SectionCard title="Sem dados">
          <p className="text-sm text-muted-foreground">
            Nenhuma OS com mecânico atribuído ainda.{" "}
            <Link href={`/${tenantSlug}/ordens`} className="underline">
              Abrir ordens
            </Link>
          </p>
        </SectionCard>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="p-3 font-medium">Mecânico</th>
                  <th className="p-3 font-medium">Atrib.</th>
                  <th className="p-3 font-medium">Concl.</th>
                  <th className="p-3 font-medium">Atraso</th>
                  <th className="p-3 font-medium">H. est.</th>
                  <th className="p-3 font-medium">H. real</th>
                  <th className="p-3 font-medium">Prod.</th>
                  <th className="p-3 font-medium">Eficiência</th>
                  <th className="p-3 font-medium">Ocupação</th>
                  <th className="p-3 font-medium">Retrab.</th>
                  <th className="p-3 font-medium text-right">MO</th>
                  <th className="p-3 font-medium text-right">Custo MO</th>
                  <th className="p-3 font-medium text-right">Margem</th>
                  <th className="p-3 font-medium text-right">Faturamento</th>
                </tr>
              </thead>
              <tbody>
                {data.mecanicos.map((m) => (
                  <tr key={m.id} className="border-b border-border/50">
                    <td className="p-3 font-medium">{m.nome}</td>
                    <td className="p-3 tabular-nums">{m.atribuidas}</td>
                    <td className="p-3 tabular-nums">{m.concluidas}</td>
                    <td className="p-3 tabular-nums">{m.atrasadas}</td>
                    <td className="p-3 tabular-nums">{m.horasEstimadas}</td>
                    <td className="p-3 tabular-nums">{m.horasRealizadas}</td>
                    <td className="p-3 tabular-nums">
                      {m.produtividade != null ? `${m.produtividade}%` : "—"}
                    </td>
                    <td className="p-3 tabular-nums">
                      {m.eficiencia != null ? `${m.eficiencia}%` : "—"}
                    </td>
                    <td className="p-3 tabular-nums">
                      {m.taxaOcupacao != null ? `${m.taxaOcupacao}%` : "—"}
                    </td>
                    <td className="p-3 tabular-nums">{m.retrabalho}</td>
                    <td className="p-3 text-right tabular-nums">
                      {formatCurrency(m.receitaMaoObra)}
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      {formatCurrency(m.custoMaoObra)}
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      {formatCurrency(m.margemGerada)}
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      {formatCurrency(m.faturamento)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <DashboardBarChart
              title="Faturamento por mecânico"
              description="OS faturadas"
              data={data.rankings.faturamento.map((m) => ({
                data: m.id,
                label: m.nome,
                value: m.faturamento,
              }))}
            />
            <DashboardBarChart
              title="Margem gerada"
              description="Receita MO − custo MO"
              data={data.rankings.margem.map((m) => ({
                data: m.id,
                label: m.nome,
                value: m.margemGerada,
              }))}
            />
            <DashboardBarChart
              title="Produtividade (%)"
              description="Concluídas ÷ atribuídas"
              data={data.rankings.produtividade.map((m) => ({
                data: m.id,
                label: m.nome,
                value: m.produtividade ?? 0,
              }))}
            />
            <DashboardBarChart
              title="Eficiência (%)"
              description="Horas realizadas ÷ estimadas"
              data={data.rankings.eficiencia.map((m) => ({
                data: m.id,
                label: m.nome,
                value: m.eficiencia ?? 0,
              }))}
            />
          </div>
        </>
      )}
    </div>
  );
}
