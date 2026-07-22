import Link from "next/link";

import { DashboardBarChart } from "@/components/dashboard/dashboard-charts";
import { ModuleHeader } from "@/components/layout/module-header";
import { OsSubnav } from "@/components/ordens/os-subnav";
import { buttonVariants } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { formatCurrency } from "@/lib/format";
import { createOsDashboardService } from "@/lib/ordens/os-dashboard-service";
import { OS_STATUS, OS_STATUS_LABELS } from "@/lib/ordens/os-status";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissoes/constants";
import { createPermissionService } from "@/lib/permissoes/permission-service";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard de OS" };

function Kpi({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-lg border bg-card p-4 transition hover:border-foreground/20">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function resolvePeriod(preset?: string, de?: string, ate?: string) {
  const hoje = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (de || ate) return { de, ate, preset: preset ?? "custom" };
  switch (preset) {
    case "hoje":
      return { de: iso(hoje), ate: iso(hoje), preset };
    case "ontem": {
      const y = new Date(hoje);
      y.setDate(y.getDate() - 1);
      return { de: iso(y), ate: iso(y), preset };
    }
    case "semana": {
      const s = new Date(hoje);
      s.setDate(s.getDate() - 6);
      return { de: iso(s), ate: iso(hoje), preset };
    }
    case "mes":
    default: {
      const m = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      return { de: iso(m), ate: iso(hoje), preset: preset ?? "mes" };
    }
  }
}

export default async function OrdensDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    preset?: string;
    de?: string;
    ate?: string;
    status?: string;
    mecanico_id?: string;
    consultor_id?: string;
    cliente_id?: string;
    veiculo_id?: string;
    centro_custo_id?: string;
  }>;
}) {
  const { tenant: tenantSlug } = await params;
  const sp = await searchParams;
  const tenant = await requireTenant(tenantSlug);

  let canView = DEFAULT_ROLE_PERMISSIONS[tenant.role]["os.visualizar_dashboard"];
  try {
    const perms = await createPermissionService(tenant.id, tenant.role);
    canView = await perms.has("os.visualizar_dashboard");
  } catch {
    /* fallback */
  }

  if (!canView) {
    return (
      <div className="space-y-4">
        <ModuleHeader
          title="Dashboard de OS"
          breadcrumbs={[
            { label: "Ordens", href: `/${tenantSlug}/ordens` },
            { label: "Dashboard" },
          ]}
        />
        <p className="text-sm text-muted-foreground">
          Sem permissão para visualizar o dashboard.
        </p>
      </div>
    );
  }

  const period = resolvePeriod(sp.preset, sp.de, sp.ate);
  const service = await createOsDashboardService(tenant.id);
  const data = await service.getData({
    de: period.de,
    ate: period.ate,
    status: sp.status,
    mecanico_id: sp.mecanico_id,
    consultor_id: sp.consultor_id,
    cliente_id: sp.cliente_id,
    veiculo_id: sp.veiculo_id,
    centro_custo_id: sp.centro_custo_id,
  });

  const supabase = await createClient();
  const [{ data: centros }, { data: clientes }] = await Promise.all([
    supabase
      .from("centros_custo")
      .select("id, nome, codigo")
      .eq("tenant_id", tenant.id)
      .eq("ativo", true)
      .is("deleted_at", null)
      .order("nome")
      .limit(100),
    supabase
      .from("clientes")
      .select("id, nome")
      .eq("tenant_id", tenant.id)
      .eq("ativo", true)
      .is("deleted_at", null)
      .order("nome")
      .limit(200),
  ]);

  const listBase = `/${tenantSlug}/ordens`;
  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (period.de) p.set("de", period.de);
    if (period.ate) p.set("ate", period.ate);
    for (const [k, v] of Object.entries(extra)) {
      if (v) p.set(k, v);
    }
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Dashboard de OS"
        description="Visão gerencial do ciclo da oficina"
        breadcrumbs={[
          { label: "Ordens", href: `/${tenantSlug}/ordens` },
          { label: "Dashboard" },
        ]}
      >
        <OsSubnav tenantSlug={tenantSlug} active="dashboard" />
      </ModuleHeader>

      <SectionCard title="Filtros" contentClassName="pt-0">
        <form className="flex flex-wrap gap-3 text-sm">
          <label className="space-y-1">
            <span className="text-muted-foreground">Período</span>
            <select
              name="preset"
              defaultValue={period.preset}
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
              defaultValue={period.de}
              className="flex h-10 rounded-md border border-input bg-transparent px-3"
            />
          </label>
          <label className="space-y-1">
            <span className="text-muted-foreground">Até</span>
            <input
              type="date"
              name="ate"
              defaultValue={period.ate}
              className="flex h-10 rounded-md border border-input bg-transparent px-3"
            />
          </label>
          <label className="space-y-1">
            <span className="text-muted-foreground">Status</span>
            <select
              name="status"
              defaultValue={sp.status ?? "all"}
              className="flex h-10 rounded-md border border-input bg-transparent px-3"
            >
              <option value="all">Todos</option>
              {OS_STATUS.map((s) => (
                <option key={s} value={s}>
                  {OS_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-muted-foreground">Unidade</span>
            <select
              name="centro_custo_id"
              defaultValue={sp.centro_custo_id ?? ""}
              className="flex h-10 max-w-56 rounded-md border border-input bg-transparent px-3"
            >
              <option value="">Todas</option>
              {(centros ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo ? `${c.codigo} — ` : ""}
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-muted-foreground">Cliente</span>
            <select
              name="cliente_id"
              defaultValue={sp.cliente_id ?? ""}
              className="flex h-10 max-w-56 rounded-md border border-input bg-transparent px-3"
            >
              <option value="">Todos</option>
              {(clientes ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className={cn(buttonVariants({ size: "sm" }), "mt-6")}
          >
            Aplicar
          </button>
        </form>
      </SectionCard>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <Kpi
          label="Abertas"
          value={String(data.kpis.abertas)}
          href={`${listBase}${qs({ status: "aguardando_diagnostico" })}`}
        />
        <Kpi
          label="Em diagnóstico"
          value={String(data.kpis.emDiagnostico)}
          href={`${listBase}${qs({ status: "diagnostico_concluido" })}`}
        />
        <Kpi
          label="Aguardando aprovação"
          value={String(data.kpis.aguardandoAprovacao)}
          href={`${listBase}${qs({ status: "aguardando_aprovacao" })}`}
        />
        <Kpi
          label="Aprovadas"
          value={String(data.kpis.aprovadas)}
          href={`${listBase}${qs({ status: "aprovado" })}`}
        />
        <Kpi
          label="Em execução"
          value={String(data.kpis.emExecucao)}
          href={`${listBase}${qs({ status: "em_execucao" })}`}
        />
        <Kpi
          label="Pendentes"
          value={String(data.kpis.pendentes)}
          href={`${listBase}${qs({ status: "aguardando_peca" })}`}
        />
        <Kpi
          label="Finalizadas"
          value={String(data.kpis.finalizadas)}
          href={`${listBase}${qs({ status: "entregue" })}`}
        />
        <Kpi
          label="Canceladas"
          value={String(data.kpis.canceladas)}
          href={`${listBase}${qs({ status: "cancelado" })}`}
        />
        <Kpi label="Vencidas" value={String(data.kpis.vencidas)} href={listBase} />
        <Kpi
          label="Faturamento"
          value={formatCurrency(data.kpis.faturamento)}
          href={`${listBase}${qs({ status: "faturado" })}`}
        />
        <Kpi
          label="Ticket médio"
          value={formatCurrency(data.kpis.ticketMedio)}
        />
        <Kpi
          label="Tempo médio conclusão"
          value={
            data.kpis.tempoMedioConclusaoDias != null
              ? `${data.kpis.tempoMedioConclusaoDias} d`
              : "—"
          }
        />
        <Kpi
          label="Taxa de aprovação"
          value={
            data.kpis.taxaAprovacao != null
              ? `${data.kpis.taxaAprovacao}%`
              : "—"
          }
        />
        <Kpi
          label="Índice de retrabalho"
          value={
            data.kpis.indiceRetrabalho != null
              ? `${data.kpis.indiceRetrabalho}%`
              : "—"
          }
        />
        <Kpi
          label="Retorno / garantia"
          value={String(data.kpis.retornoGarantia)}
          href={`${listBase}${qs({ status: "retorno" })}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardBarChart
          title="OS por status"
          description="Distribuição no período"
          data={data.porStatus.map((p) => ({
            data: p.label,
            label:
              OS_STATUS_LABELS[p.label as keyof typeof OS_STATUS_LABELS] ??
              p.label,
            value: p.valor,
          }))}
        />
        <DashboardBarChart
          title="OS abertas por dia"
          description="Aberturas no período"
          data={data.abertasPorDia.map((p) => ({
            data: p.label,
            label: p.label.slice(5),
            value: p.valor,
          }))}
        />
        <DashboardBarChart
          title="OS finalizadas por dia"
          description="Entregues / faturadas"
          data={data.finalizadasPorDia.map((p) => ({
            data: p.label,
            label: p.label.slice(5),
            value: p.valor,
          }))}
        />
        <DashboardBarChart
          title="Faturamento por período"
          description="OS faturadas"
          data={data.faturamentoPorDia.map((p) => ({
            data: p.label,
            label: p.label.slice(5),
            value: p.valor,
          }))}
        />
        <DashboardBarChart
          title="Ticket médio por dia"
          description="Média das faturadas"
          data={data.ticketPorDia.map((p) => ({
            data: p.label,
            label: p.label.slice(5),
            value: p.valor,
          }))}
        />
        <DashboardBarChart
          title="OS por mecânico"
          description="Top 10"
          data={data.porMecanico.map((p) => ({
            data: p.label,
            label: p.label,
            value: p.valor,
          }))}
        />
        <DashboardBarChart
          title="OS por consultor"
          description="Top 10"
          data={data.porConsultor.map((p) => ({
            data: p.label,
            label: p.label,
            value: p.valor,
          }))}
        />
        <DashboardBarChart
          title="OS por tipo de serviço"
          description="Categoria dos itens"
          data={data.porTipoServico.map((p) => ({
            data: p.label,
            label: p.label,
            value: p.valor,
          }))}
        />
        <DashboardBarChart
          title="Produtos mais usados"
          description="Peças aplicadas nas OS do período"
          data={data.produtosMaisUsados.map((p) => ({
            data: p.label,
            label: p.label,
            value: p.valor,
          }))}
        />
        <DashboardBarChart
          title="Tempo médio por etapa (dias)"
          description="Com base no histórico de eventos"
          data={data.tempoMedioPorEtapa.map((p) => ({
            data: p.label,
            label:
              OS_STATUS_LABELS[p.label as keyof typeof OS_STATUS_LABELS] ??
              p.label,
            value: p.valor,
          }))}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Clique nos cards de status para abrir a listagem filtrada (drill-down).
      </p>
    </div>
  );
}
