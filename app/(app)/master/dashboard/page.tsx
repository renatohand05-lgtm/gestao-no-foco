import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { requireAuth } from "@/lib/tenants";
import {
  getPlatformAccess,
  type PlatformTenantSummary,
} from "@/lib/platform/platform-access-service";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import { CATALOG_SEGMENT_SHORT_LABEL } from "@/lib/segments/catalog-labels";
import type { ProductSegmentId } from "@/lib/segments/types";

export const metadata = { title: "Visão do Dono · Gestão no Foco" };

function segmentLabel(segment: string | null) {
  if (!segment) return "Sem segmento";
  return CATALOG_SEGMENT_SHORT_LABEL[segment as ProductSegmentId] ?? segment;
}

const CHART_PALETTE = [
  "var(--brand-gold, #C9A84C)",
  "var(--brand-silver, #8B93A0)",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EC4899",
  "#8B5CF6",
  "#06B6D4",
];

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/40 p-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-4 text-[var(--brand-gold,#C9A84C)]" />
        {label}
      </div>
      <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export default async function MasterDashboardPage() {
  await requireAuth();
  const access = await getPlatformAccess();

  if (!access) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-3 text-center">
        <h1 className="text-xl font-semibold text-foreground">
          Acesso restrito
        </h1>
        <p className="text-sm text-muted-foreground">
          Esta área é exclusiva do dono da plataforma e de associados
          autorizados. Sua conta não tem esse acesso.
        </p>
      </div>
    );
  }

  const isOwner = access.role === "owner";

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1 border-b border-border/60 pb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-gold,#C9A84C)]">
          {isOwner ? "Visão do Dono / Gestor Master" : "Painel do Associado"}
        </p>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Olá, {access.partnerName.split(" ")[0]}.
        </h1>
        <p className="text-sm text-muted-foreground">
          {isOwner
            ? "Todas as empresas da plataforma, na palma da sua mão."
            : "As empresas que você trouxe para a plataforma."}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Wallet}
          label="Faturamento total"
          value={formatCurrencyCompact(access.totals.faturamento)}
          hint="Mês corrente · soma de todas as empresas"
        />
        <KpiCard
          icon={TrendingUp}
          label="Lucro líquido total"
          value={formatCurrencyCompact(access.totals.lucroLiquido)}
          hint="Mês corrente"
        />
        <KpiCard
          icon={Wallet}
          label="Ticket médio por empresa"
          value={formatCurrencyCompact(access.totals.ticketMedio)}
        />
        <KpiCard
          icon={Building2}
          label="Empresas ativas"
          value={String(access.totals.empresasAtivas)}
          hint={
            access.totals.empresasInativas > 0
              ? `${access.totals.empresasInativas} sem movimento no mês`
              : undefined
          }
        />
      </div>

      {access.tenants.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <FaturamentoPorEmpresaChart tenants={access.tenants} />
            <DistribuicaoFaturamentoDonut tenants={access.tenants} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <EmpresasComAlertasPanel tenants={access.tenants} />
            <RankingEmpresasTable tenants={access.tenants} />
          </div>
        </>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-[var(--brand-gold,#C9A84C)]" />
          <h2 className="text-lg font-semibold text-foreground">
            {isOwner ? "Empresas na plataforma" : "Empresas indicadas por você"}
          </h2>
        </div>

        {access.tenants.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 p-10 text-center">
            <p className="text-sm text-muted-foreground">
              {isOwner
                ? "Nenhuma empresa cadastrada ainda."
                : "Nenhum cliente indicado por você ainda. Compartilhe seu link de indicação para começar."}
            </p>
          </div>
        ) : (
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
            {access.tenants.map((tenant) => (
              <div key={tenant.tenantId} className="w-60 shrink-0">
                <Link
                  href={`/${tenant.tenantSlug}/dashboard`}
                  className="group block rounded-xl border border-border/70 bg-card/30 p-4 transition hover:border-[var(--brand-gold,#C9A84C)]/60 hover:bg-card/50"
                >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground group-hover:text-[var(--brand-gold,#C9A84C)]">
                      {tenant.tenantName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {segmentLabel(tenant.segment)}
                    </p>
                  </div>
                  <span
                    className={
                      tenant.isActive
                        ? "shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300"
                        : "shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                    }
                  >
                    {tenant.isActive ? "Ativa" : "Inativa"}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Faturamento
                    </p>
                    <p className="text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrency(tenant.faturamento)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Lucro líquido
                    </p>
                    <p
                      className={
                        tenant.lucroLiquido >= 0
                          ? "text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400"
                          : "text-sm font-semibold tabular-nums text-rose-700 dark:text-rose-400"
                      }
                    >
                      {formatCurrency(tenant.lucroLiquido)}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs font-medium text-[var(--brand-gold,#C9A84C)] opacity-0 transition group-hover:opacity-100">
                  Ver dashboard →
                </p>
                </Link>
                <Link href={`/master/empresas/${tenant.tenantId}`} className="mt-2 block text-xs font-medium text-muted-foreground hover:text-[var(--brand-gold,#C9A84C)] hover:underline">Gerenciar empresa →</Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/** Gráfico de barras verticais — Faturamento por empresa (top 8). */
function FaturamentoPorEmpresaChart({
  tenants,
}: {
  tenants: PlatformTenantSummary[];
}) {
  const top = tenants.slice(0, 8);
  const max = Math.max(1, ...top.map((t) => t.faturamento));
  const chartHeight = 200;
  const barAreaHeight = 150;
  const slotWidth = 70;
  const width = top.length * slotWidth;

  return (
    <div className="rounded-xl border border-border/70 bg-card/40 p-5">
      <h3 className="text-sm font-semibold text-foreground">
        Faturamento por empresa
      </h3>
      <p className="mb-4 text-xs text-muted-foreground">
        Mês corrente · top {top.length}
      </p>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${chartHeight}`}
          className="h-52 w-full"
          style={{ minWidth: width }}
          role="img"
          aria-label="Faturamento por empresa"
        >
          {top.map((tenant, i) => {
            const barHeight = (tenant.faturamento / max) * barAreaHeight;
            const x = i * slotWidth;
            const barWidth = 32;
            const barX = x + (slotWidth - barWidth) / 2;
            const barY = barAreaHeight - barHeight + 10;

            return (
              <g key={tenant.tenantId}>
                <text
                  x={x + slotWidth / 2}
                  y={barY - 6}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[9px]"
                >
                  {formatCurrencyCompact(tenant.faturamento)}
                </text>
                <rect
                  x={barX}
                  y={barY}
                  width={barWidth}
                  height={Math.max(barHeight, 2)}
                  rx={4}
                  fill={CHART_PALETTE[i % CHART_PALETTE.length]}
                />
                <text
                  x={x + slotWidth / 2}
                  y={barAreaHeight + 28}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[9px]"
                >
                  {tenant.tenantName.length > 10
                    ? `${tenant.tenantName.slice(0, 9)}…`
                    : tenant.tenantName}
                </text>
              </g>
            );
          })}
          <line
            x1="0"
            x2={width}
            y1={barAreaHeight + 10}
            y2={barAreaHeight + 10}
            stroke="currentColor"
            className="text-border"
            strokeWidth="1"
          />
        </svg>
      </div>
    </div>
  );
}

function DistribuicaoFaturamentoDonut({
  tenants,
}: {
  tenants: PlatformTenantSummary[];
}) {
  const total = tenants.reduce((acc, t) => acc + t.faturamento, 0);

  if (total <= 0) {
    return (
      <div className="rounded-xl border border-border/70 bg-card/40 p-5">
        <h3 className="text-sm font-semibold text-foreground">
          Distribuição do faturamento
        </h3>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Sem faturamento neste período para compor o gráfico.
        </p>
      </div>
    );
  }

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offsetAcc = 0;

  const top = tenants.slice(0, 8);
  const arcs = top.map((tenant, i) => {
    const fraction = tenant.faturamento / total;
    const dash = fraction * circumference;
    const arc = {
      tenant,
      color: CHART_PALETTE[i % CHART_PALETTE.length],
      fraction,
      dashArray: `${dash} ${circumference - dash}`,
      dashOffset: -offsetAcc,
    };
    offsetAcc += dash;
    return arc;
  });

  return (
    <div className="rounded-xl border border-border/70 bg-card/40 p-5">
      <h3 className="text-sm font-semibold text-foreground">
        Distribuição do faturamento
      </h3>
      <p className="mb-4 text-xs text-muted-foreground">
        Participação de cada empresa no total
      </p>
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <div className="relative shrink-0">
          <svg
            viewBox="0 0 160 160"
            className="size-40 -rotate-90"
            role="img"
            aria-label="Distribuição do faturamento por empresa"
          >
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="currentColor"
              className="text-muted"
              strokeWidth="20"
            />
            {arcs.map((arc) => (
              <circle
                key={arc.tenant.tenantId}
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={arc.color}
                strokeWidth="20"
                strokeDasharray={arc.dashArray}
                strokeDashoffset={arc.dashOffset}
              />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-base font-bold tabular-nums text-foreground">
              {formatCurrencyCompact(total)}
            </p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
        </div>
        <ul className="w-full space-y-2">
          {arcs.map((arc) => (
            <li
              key={arc.tenant.tenantId}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2 text-foreground/85">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: arc.color }}
                />
                <span className="truncate">{arc.tenant.tenantName}</span>
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {(arc.fraction * 100).toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

type Alert = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  label: string;
  severity: "warning" | "danger";
};

/**
 * Empresas com alertas — baseado só em dados que já temos (sem movimento no
 * mês, ou lucro negativo). Não inventa sinais de estoque/OS que ainda não
 * cruzamos entre empresas.
 */
function EmpresasComAlertasPanel({
  tenants,
}: {
  tenants: PlatformTenantSummary[];
}) {
  const alerts: Alert[] = [];

  for (const tenant of tenants) {
    if (!tenant.isActive) {
      alerts.push({
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName,
        tenantSlug: tenant.tenantSlug,
        label: "Sem movimento no mês",
        severity: "warning",
      });
    } else if (tenant.lucroLiquido < 0) {
      alerts.push({
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName,
        tenantSlug: tenant.tenantSlug,
        label: "Prejuízo no mês",
        severity: "danger",
      });
    }
  }

  return (
    <div className="rounded-xl border border-border/70 bg-card/40 p-5">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-foreground">
          Empresas com alertas
        </h3>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Baseado no faturamento e resultado do mês corrente
      </p>

      {alerts.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nenhum alerta neste ciclo — todas as empresas com movimento estão
          com resultado positivo.
        </p>
      ) : (
        <ul className="space-y-2">
          {alerts.slice(0, 6).map((alert) => (
            <li key={`${alert.tenantId}-${alert.label}`}>
              <Link
                href={`/${alert.tenantSlug}/dashboard`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm transition hover:border-[var(--brand-gold,#C9A84C)]/50 hover:bg-card/50"
              >
                <span className="truncate text-foreground/85">
                  {alert.tenantName}
                </span>
                <span
                  className={
                    alert.severity === "danger"
                      ? "shrink-0 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:text-rose-300"
                      : "shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300"
                  }
                >
                  {alert.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Tabela de ranking — empresas ordenadas por faturamento (já vem ordenado). */
function RankingEmpresasTable({
  tenants,
}: {
  tenants: PlatformTenantSummary[];
}) {
  const ranked = tenants.slice(0, 8);

  return (
    <div className="rounded-xl border border-border/70 bg-card/40 p-5">
      <h3 className="text-sm font-semibold text-foreground">
        Ranking de empresas
      </h3>
      <p className="mb-4 text-xs text-muted-foreground">
        Ordenado por faturamento do mês
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="w-8 pb-2 font-medium">#</th>
              <th className="pb-2 font-medium">Empresa</th>
              <th className="pb-2 text-right font-medium">Faturamento</th>
              <th className="pb-2 text-right font-medium">Lucro líquido</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((tenant, i) => (
              <tr
                key={tenant.tenantId}
                className="border-b border-border/30 last:border-0"
              >
                <td className="py-2 tabular-nums text-muted-foreground">
                  {i + 1}
                </td>
                <td className="py-2">
                  <Link
                    href={`/${tenant.tenantSlug}/dashboard`}
                    className="text-foreground/90 hover:text-[var(--brand-gold,#C9A84C)]"
                  >
                    {tenant.tenantName}
                  </Link>
                </td>
                <td className="py-2 text-right tabular-nums text-foreground">
                  {formatCurrency(tenant.faturamento)}
                </td>
                <td
                  className={
                    tenant.lucroLiquido >= 0
                      ? "py-2 text-right tabular-nums text-emerald-700 dark:text-emerald-400"
                      : "py-2 text-right tabular-nums text-rose-700 dark:text-rose-400"
                  }
                >
                  {formatCurrency(tenant.lucroLiquido)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
