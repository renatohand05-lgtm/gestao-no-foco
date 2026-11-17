import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { gofMotion } from "@/lib/design-system/foundation";
import { gofCardSurface } from "@/lib/design-system/primitives";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import { formatPercent } from "@/lib/format/percent";
import type {
  PlatformAccess,
  PlatformTenantSummary,
} from "@/lib/platform/platform-access-service";
import { CATALOG_SEGMENT_SHORT_LABEL } from "@/lib/segments/catalog-labels";
import type { ProductSegmentId } from "@/lib/segments/types";
import { cn } from "@/lib/utils";

/** Visão do Dono — só apresentação (dados vêm prontos do serviço da plataforma). */

function segmentLabel(segment: string | null) {
  if (!segment) return "Sem segmento";
  return CATALOG_SEGMENT_SHORT_LABEL[segment as ProductSegmentId] ?? segment;
}

/** Cores do tema Aurora: dourado, azul, verde, roxo, laranja, rosa, ciano, índigo. */
const PALETTE = [
  "#f8c208",
  "#1a86e0",
  "#30d158",
  "#bf5af2",
  "#ff9f0a",
  "#ff375f",
  "#64d2ff",
  "#5e5ce6",
] as const;

const colorAt = (i: number) => PALETTE[i % PALETTE.length];

function margem(t: Pick<PlatformTenantSummary, "faturamento" | "lucroLiquido">) {
  return t.faturamento > 0 ? (t.lucroLiquido / t.faturamento) * 100 : null;
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const letras = (partes.length > 1 ? partes.slice(0, 2) : [partes[0] ?? "?"]).map((p) =>
    p.charAt(0),
  );
  return letras.join("").toUpperCase();
}

const toneText = {
  good: "text-emerald-700 dark:text-emerald-300",
  bad: "text-rose-700 dark:text-rose-300",
  warn: "text-amber-700 dark:text-amber-300",
  info: "text-sky-700 dark:text-sky-300",
  muted: "text-muted-foreground",
} as const;

const toneSoft = {
  good: "bg-emerald-500/12",
  bad: "bg-rose-500/12",
  warn: "bg-amber-500/12",
  info: "bg-sky-500/12",
  muted: "bg-foreground/[0.06]",
} as const;

type Tone = keyof typeof toneText;

function Pill({
  tone,
  icon: Icon,
  children,
}: {
  tone: Tone;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold leading-none",
        toneSoft[tone],
        toneText[tone],
      )}
    >
      {Icon ? <Icon className="size-3" aria-hidden /> : null}
      {children}
    </span>
  );
}

/** Anel de progresso (como a "Meta do mês" do demo). */
function Ring({ value, label }: { value: number; label: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const v = Math.min(1, Math.max(0, value));
  return (
    <svg viewBox="0 0 56 56" className="size-14 shrink-0 -rotate-90" role="img" aria-label={label}>
      <defs>
        <linearGradient id="master-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1a86e0" />
          <stop offset="1" stopColor="#f8c208" />
        </linearGradient>
      </defs>
      <circle cx="28" cy="28" r={r} fill="none" stroke="currentColor" className="text-foreground/10" strokeWidth="6" />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke="url(#master-ring)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${v * c} ${c}`}
      />
    </svg>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  chip,
  pill,
  aside,
  valueClassName,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  /** Cor do chip do ícone (hex). */
  chip: string;
  pill?: React.ReactNode;
  aside?: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div
      data-kpi-card=""
      className={cn(gofCardSurface, gofMotion.fade, "relative min-w-0 overflow-hidden p-4 sm:p-5")}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg"
          style={{ color: chip, background: `${chip}24` }}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        <p className="text-xs font-medium leading-tight text-muted-foreground sm:text-sm">{label}</p>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p
            data-kpi-value=""
            className={cn(
              "whitespace-nowrap text-2xl font-bold leading-none tabular-nums sm:text-[1.9rem]",
              valueClassName,
            )}
          >
            {value}
          </p>
          {pill ? <div className="mt-3">{pill}</div> : null}
        </div>
        {aside}
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  icon: Icon,
  right,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(gofCardSurface, gofMotion.fade, "min-w-0 p-5 sm:p-6", className)}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {Icon ? <Icon className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden /> : null}
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-tight text-foreground">{title}</h2>
            {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

/** Faturamento por empresa — barras com gradiente (top 8). */
function FaturamentoPorEmpresa({
  tenants,
  total,
}: {
  tenants: PlatformTenantSummary[];
  total: number;
}) {
  const top = tenants.slice(0, 8);
  const max = Math.max(1, ...top.map((t) => t.faturamento));

  return (
    <Panel title="Faturamento por empresa" subtitle={`Mês corrente · top ${top.length}`}>
      <ul className="space-y-5">
        {top.map((t, i) => {
          const cor = colorAt(i);
          const m = margem(t);
          const largura = t.faturamento > 0 ? Math.max(3, (t.faturamento / max) * 100) : 0;
          const share = total > 0 ? (t.faturamento / total) * 100 : 0;
          return (
            <li key={t.tenantId}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-baseline gap-2.5">
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="truncate text-sm font-medium text-foreground">{t.tenantName}</span>
                </span>
                <span className="shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums text-foreground">
                  {formatCurrency(t.faturamento)}
                </span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-foreground/[0.07]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${largura}%`,
                    background: `linear-gradient(90deg, ${cor}b3, ${cor})`,
                    boxShadow: `0 0 14px ${cor}59`,
                  }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                <span>{formatPercent(share)} do total</span>
                <span
                  className={cn(
                    "whitespace-nowrap tabular-nums",
                    t.lucroLiquido < 0 ? toneText.bad : t.faturamento > 0 ? toneText.good : "",
                  )}
                >
                  {t.faturamento > 0
                    ? `Lucro ${formatCurrency(t.lucroLiquido)}${m !== null ? ` · ${formatPercent(m)}` : ""}`
                    : "Sem movimento"}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function DistribuicaoDonut({
  tenants,
  total,
}: {
  tenants: PlatformTenantSummary[];
  total: number;
}) {
  if (total <= 0) {
    return (
      <Panel title="Distribuição do faturamento" subtitle="Participação de cada empresa no total">
        <p className="py-10 text-center text-sm text-muted-foreground">
          Sem faturamento neste período para compor o gráfico.
        </p>
      </Panel>
    );
  }

  const r = 74;
  const c = 2 * Math.PI * r;
  const top = tenants.slice(0, 8);
  const gap = top.length > 1 ? 3 : 0;
  const arcs = top.map((t, i) => {
    const antes = top.slice(0, i).reduce((soma, x) => soma + x.faturamento, 0);
    const fracao = t.faturamento / total;
    return {
      t,
      cor: colorAt(i),
      fracao,
      dash: Math.max(0, fracao * c - gap),
      offset: -(antes / total) * c,
    };
  });

  return (
    <Panel title="Distribuição do faturamento" subtitle="Participação de cada empresa no total">
      <div className="flex flex-col items-center gap-6 sm:flex-row lg:flex-col xl:flex-row">
        <div className="relative shrink-0">
          <svg
            viewBox="0 0 200 200"
            className="size-44 -rotate-90 sm:size-48"
            role="img"
            aria-label="Distribuição do faturamento por empresa"
          >
            <circle cx="100" cy="100" r={r} fill="none" stroke="currentColor" className="text-foreground/[0.07]" strokeWidth="22" />
            {arcs
              .filter((a) => a.dash > 0)
              .map((a) => (
                <circle
                  key={a.t.tenantId}
                  cx="100"
                  cy="100"
                  r={r}
                  fill="none"
                  stroke={a.cor}
                  strokeWidth="22"
                  strokeDasharray={`${a.dash} ${c - a.dash}`}
                  strokeDashoffset={a.offset}
                  style={{ filter: `drop-shadow(0 0 7px ${a.cor}66)` }}
                />
              ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-lg font-bold tabular-nums text-foreground">{formatCurrencyCompact(total)}</p>
            <p className="mt-0.5 text-[11px] uppercase tracking-widest text-muted-foreground">Total</p>
          </div>
        </div>
        <ul className="w-full min-w-0 space-y-2">
          {arcs.map((a) => (
            <li
              key={a.t.tenantId}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-foreground/[0.03] px-3 py-2 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2.5 text-foreground/90">
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: a.cor, boxShadow: `0 0 8px ${a.cor}80` }} />
                <span className="truncate">{a.t.tenantName}</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-foreground">
                {formatPercent(a.fracao * 100)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

type Alerta = {
  tenant: PlatformTenantSummary;
  label: string;
  tone: "warn" | "bad";
};

/**
 * Alertas só com dados que já temos (sem movimento no mês ou lucro negativo).
 * Não inventa sinais de estoque/OS que ainda não cruzamos entre empresas.
 */
function EmpresasComAlertas({ tenants }: { tenants: PlatformTenantSummary[] }) {
  const alertas: Alerta[] = [];
  for (const t of tenants) {
    if (!t.isActive) alertas.push({ tenant: t, label: "Sem movimento no mês", tone: "warn" });
    else if (t.lucroLiquido < 0) alertas.push({ tenant: t, label: "Prejuízo no mês", tone: "bad" });
  }

  return (
    <Panel
      title="Empresas com alertas"
      subtitle="Baseado no faturamento e resultado do mês corrente"
      icon={AlertTriangle}
      right={alertas.length ? <Pill tone={alertas.some((a) => a.tone === "bad") ? "bad" : "warn"}>{alertas.length}</Pill> : null}
    >
      {alertas.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <span className="inline-flex size-10 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-300">
            <CheckCircle2 className="size-5" aria-hidden />
          </span>
          <p className="max-w-xs text-sm text-muted-foreground">
            Nenhum alerta neste ciclo — todas as empresas com movimento estão com resultado positivo.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {alertas.slice(0, 6).map((a) => (
            <li key={`${a.tenant.tenantId}-${a.label}`}>
              <Link
                href={`/${a.tenant.tenantSlug}/dashboard`}
                className="group flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-foreground/[0.03] px-3.5 py-3 transition hover:border-[var(--brand-gold,#f8c208)]/45 hover:bg-foreground/[0.06]"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
                      toneSoft[a.tone],
                      toneText[a.tone],
                    )}
                  >
                    {a.tone === "bad" ? <TrendingDown className="size-4" aria-hidden /> : <AlertTriangle className="size-4" aria-hidden />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">{a.tenant.tenantName}</span>
                    <span className={cn("block text-xs", toneText[a.tone])}>{a.label}</span>
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

const MEDAL = [
  "bg-[#f8c208] text-[#0a1428]",
  "bg-[#c9d3e3] text-[#0a1428]",
  "bg-[#d98b4a] text-[#0a1428]",
] as const;

function RankingEmpresas({ tenants }: { tenants: PlatformTenantSummary[] }) {
  const ranked = tenants.slice(0, 8);

  return (
    <Panel title="Ranking de empresas" subtitle="Ordenado por faturamento do mês">
      <div className="-mx-1 overflow-x-auto px-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="w-10 pb-2.5 font-medium">#</th>
              <th className="pb-2.5 font-medium">Empresa</th>
              <th className="hidden pb-2.5 text-right font-medium sm:table-cell">Faturamento</th>
              <th className="hidden pb-2.5 text-right font-medium sm:table-cell">Lucro líquido</th>
              <th className="pb-2.5 text-right font-medium sm:hidden">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((t, i) => {
              const m = margem(t);
              return (
                <tr key={t.tenantId} className="border-b border-border/30 last:border-0">
                  <td className="py-3">
                    <span
                      className={cn(
                        "inline-flex size-6 items-center justify-center rounded-full text-[11px] font-bold tabular-nums",
                        i < 3 ? MEDAL[i] : "bg-foreground/[0.06] text-muted-foreground",
                      )}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="py-3 pr-2">
                    <Link
                      href={`/${t.tenantSlug}/dashboard`}
                      className="font-medium text-foreground/95 hover:text-[var(--brand-gold,#f8c208)]"
                    >
                      {t.tenantName}
                    </Link>
                    <p className="text-[11px] text-muted-foreground">{segmentLabel(t.segment)}</p>
                  </td>
                  <td className="hidden whitespace-nowrap py-3 text-right font-semibold tabular-nums text-foreground sm:table-cell">
                    {formatCurrency(t.faturamento)}
                  </td>
                  <td className="hidden whitespace-nowrap py-3 text-right tabular-nums sm:table-cell">
                    <span className={cn("font-semibold", t.lucroLiquido < 0 ? toneText.bad : toneText.good)}>
                      {formatCurrency(t.lucroLiquido)}
                    </span>
                    {m !== null ? (
                      <p className="text-[11px] text-muted-foreground">margem {formatPercent(m)}</p>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap py-3 text-right tabular-nums sm:hidden">
                    <span className="block text-sm font-semibold text-foreground">
                      {formatCurrencyCompact(t.faturamento)}
                    </span>
                    <span className={cn("block text-[11px] font-semibold", t.lucroLiquido < 0 ? toneText.bad : toneText.good)}>
                      {formatCurrencyCompact(t.lucroLiquido)}
                      {m !== null ? ` · ${formatPercent(m, 0)}` : ""}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function EmpresaCard({
  tenant,
  index,
  total,
}: {
  tenant: PlatformTenantSummary;
  index: number;
  total: number;
}) {
  const cor = colorAt(index);
  const m = margem(tenant);
  const share = total > 0 ? (tenant.faturamento / total) * 100 : 0;

  return (
    <article
      data-kpi-card=""
      className={cn(
        gofCardSurface,
        gofMotion.fade,
        "group relative flex min-w-0 flex-col gap-4 p-5 transition-transform duration-200 hover:-translate-y-0.5",
      )}
    >
      {/* Card inteiro clicável (abre o dashboard); os botões do rodapé ficam por cima. */}
      <Link
        href={`/${tenant.tenantSlug}/dashboard`}
        aria-label={`Abrir o dashboard de ${tenant.tenantName}`}
        className="absolute inset-0 z-0 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold,#f8c208)]/50"
      />

      <div className="pointer-events-none relative z-10 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-[#0a1428]"
            style={{ background: `linear-gradient(145deg, ${cor}, ${cor}b3)` }}
            aria-hidden
          >
            {iniciais(tenant.tenantName)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{tenant.tenantName}</p>
            <p className="truncate text-xs text-muted-foreground">{segmentLabel(tenant.segment)}</p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
            tenant.isActive ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : "bg-foreground/[0.07] text-muted-foreground",
          )}
        >
          <span className={cn("size-1.5 rounded-full", tenant.isActive ? "bg-emerald-500" : "bg-muted-foreground/60")} />
          {tenant.isActive ? "Ativa" : "Inativa"}
        </span>
      </div>

      <dl className="pointer-events-none relative z-10 grid grid-cols-3 gap-3">
        <div className="min-w-0">
          <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Faturamento</dt>
          <dd className="mt-1 whitespace-nowrap text-sm font-semibold tabular-nums text-foreground">
            {formatCurrencyCompact(tenant.faturamento)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Lucro</dt>
          <dd className={cn("mt-1 whitespace-nowrap text-sm font-semibold tabular-nums", tenant.lucroLiquido < 0 ? toneText.bad : toneText.good)}>
            {formatCurrencyCompact(tenant.lucroLiquido)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Margem</dt>
          <dd className={cn("mt-1 whitespace-nowrap text-sm font-semibold tabular-nums", m === null ? "text-muted-foreground" : m < 0 ? toneText.bad : toneText.good)}>
            {m === null ? "—" : formatPercent(m)}
          </dd>
        </div>
      </dl>

      <div className="pointer-events-none relative z-10">
        <div className="h-1.5 overflow-hidden rounded-full bg-foreground/[0.07]">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, share)}%`, background: `linear-gradient(90deg, ${cor}b3, ${cor})` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {formatPercent(share)} do faturamento da plataforma
        </p>
      </div>

      <div className="relative z-10 mt-auto flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
        <Link
          href={`/${tenant.tenantSlug}/dashboard`}
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "pointer-events-auto")}
        >
          Ver dashboard
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
        <Link
          href={`/master/empresas/${tenant.tenantId}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "pointer-events-auto")}
        >
          Gerenciar
        </Link>
      </div>
    </article>
  );
}

export function MasterDashboardView({ access }: { access: PlatformAccess }) {
  const isOwner = access.role === "owner";
  const { totals, tenants } = access;
  const totalEmpresas = tenants.length;
  const margemTotal = totals.faturamento > 0 ? (totals.lucroLiquido / totals.faturamento) * 100 : null;
  const lucroNegativo = totals.lucroLiquido < 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8 lg:px-8">
      <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", gofMotion.fade)}>
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-gold,#f8c208)]">
            <span className="size-1.5 rounded-full bg-[var(--brand-gold,#f8c208)] shadow-[0_0_10px_var(--brand-gold,#f8c208)]" />
            {isOwner ? "Visão do Dono / Gestor Master" : "Painel do Associado"}
          </p>
          <h1 className="mt-2 text-4xl font-bold text-foreground sm:text-5xl">
            Olá, {access.partnerName.split(" ")[0]}.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            {isOwner
              ? "Todas as empresas da plataforma, na palma da sua mão."
              : "As empresas que você trouxe para a plataforma."}
          </p>
        </div>
        {isOwner ? (
          <Link
            href="/master/plano-preview"
            className={cn(buttonVariants({ size: "lg" }), "gf-cta self-start sm:self-auto")}
          >
            <Sparkles aria-hidden />
            Simular planos
          </Link>
        ) : null}
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard
          icon={Wallet}
          label="Faturamento total"
          chip="#f8c208"
          value={formatCurrencyCompact(totals.faturamento)}
          pill={<Pill tone="muted">Mês corrente</Pill>}
        />
        <KpiCard
          icon={lucroNegativo ? TrendingDown : TrendingUp}
          label="Lucro líquido total"
          chip={lucroNegativo ? "#ff453a" : "#30d158"}
          value={formatCurrencyCompact(totals.lucroLiquido)}
          valueClassName={lucroNegativo ? toneText.bad : undefined}
          pill={
            margemTotal !== null ? (
              <Pill tone={lucroNegativo ? "bad" : "good"} icon={lucroNegativo ? TrendingDown : TrendingUp}>
                {formatPercent(margemTotal)} margem
              </Pill>
            ) : (
              <Pill tone="muted">Mês corrente</Pill>
            )
          }
        />
        <KpiCard
          icon={Building2}
          label="Ticket médio por empresa"
          chip="#4fb3ff"
          value={formatCurrencyCompact(totals.ticketMedio)}
          pill={<Pill tone="info">÷ {totalEmpresas} {totalEmpresas === 1 ? "empresa" : "empresas"}</Pill>}
        />
        <KpiCard
          icon={Users}
          label="Empresas ativas"
          chip="#bf5af2"
          value={
            <>
              {totals.empresasAtivas}
              <span className="ml-1 text-base font-semibold text-muted-foreground">/ {totalEmpresas}</span>
            </>
          }
          pill={
            totals.empresasInativas > 0 ? (
              <Pill tone="warn">{totals.empresasInativas} sem movimento</Pill>
            ) : (
              <Pill tone="good">Todas com movimento</Pill>
            )
          }
          aside={
            totalEmpresas > 0 ? (
              <span className="hidden sm:block">
              <Ring
                value={totals.empresasAtivas / totalEmpresas}
                label={`${totals.empresasAtivas} de ${totalEmpresas} empresas ativas`}
              />
              </span>
            ) : null
          }
        />
      </div>

      {tenants.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[1.35fr_1fr]">
            <FaturamentoPorEmpresa tenants={tenants} total={totals.faturamento} />
            <DistribuicaoDonut tenants={tenants} total={totals.faturamento} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
            <EmpresasComAlertas tenants={tenants} />
            <RankingEmpresas tenants={tenants} />
          </div>
        </>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-[#f8c208]/15 text-[#f8c208]">
            <Users className="size-4" aria-hidden />
          </span>
          <h2 className="text-lg font-semibold text-foreground">
            {isOwner ? "Empresas na plataforma" : "Empresas indicadas por você"}
          </h2>
          <Pill tone="muted">{totalEmpresas}</Pill>
        </div>

        {tenants.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 p-10 text-center">
            <p className="text-sm text-muted-foreground">
              {isOwner
                ? "Nenhuma empresa cadastrada ainda."
                : "Nenhum cliente indicado por você ainda. Compartilhe seu link de indicação para começar."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tenants.map((tenant, i) => (
              <EmpresaCard key={tenant.tenantId} tenant={tenant} index={i} total={totals.faturamento} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
