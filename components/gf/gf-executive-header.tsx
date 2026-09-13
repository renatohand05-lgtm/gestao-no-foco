"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Download } from "lucide-react";

import { DashboardRefreshButton } from "@/components/dashboard/dashboard-refresh-button";
import { GFIcon } from "@/components/gf/gf-icon";
import { GFStatusPill } from "@/components/gf/gf-status-pill";
import {
  META_DIA_STATUS_LABEL,
  type MetaDiaStatus,
} from "@/lib/dashboard/faturamento-agregacao";
import { formatCurrencyCompact } from "@/lib/dashboard/format";
import { gfType } from "@/lib/design-system/signature";
import { cn } from "@/lib/utils";

type Props = {
  greeting?: string;
  tenantName: string;
  dataHoje: string;
  updatedAtLabel: string;
  status: MetaDiaStatus;
  /** Meta mensal vigente (R$) — ausente ≠ 0. */
  metaMensal?: number | null;
  /** Saúde de caixa / empresa — label real do cockpit, nunca inventado. */
  companyStatusLabel?: string;
  companyStatusTone?: "success" | "warning" | "danger" | "neutral" | "info";
  tenantSlug?: string;
};

const MOTIVATIONAL_QUOTES = [
  "Gestão clara, resultado real.",
  "Disciplina hoje. Liberdade amanhã.",
  "Quem mede, melhora.",
  "Pequenos ajustes, grandes resultados.",
];

function quoteForToday(civilDate: string): string {
  const seed = civilDate
    .split("-")
    .reduce((acc, part) => acc + Number(part), 0);
  return MOTIVATIONAL_QUOTES[seed % MOTIVATIONAL_QUOTES.length];
}

function formatLongDate(civilDate: string) {
  const [y, m, d] = civilDate.split("-").map(Number);
  if (!y || !m || !d) return civilDate;
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function periodRanges(hoje: string) {
  const [y, m, d] = hoje.split("-").map(Number);
  const today = new Date(Date.UTC(y, m - 1, d));
  const daysAgo = (n: number) => {
    const dt = new Date(today);
    dt.setUTCDate(dt.getUTCDate() - n);
    return dt;
  };
  const monthStart = new Date(Date.UTC(y, m - 1, 1));

  return {
    hoje: { dataDe: hoje, dataAte: hoje },
    sete: { dataDe: toIsoDate(daysAgo(6)), dataAte: hoje },
    trinta: { dataDe: toIsoDate(daysAgo(29)), dataAte: hoje },
    mesAtual: { dataDe: toIsoDate(monthStart), dataAte: hoje },
  };
}

function metaTone(
  status: MetaDiaStatus,
): "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "superada":
    case "atingida":
      return "success";
    case "atencao":
      return "warning";
    case "abaixo":
      return "danger";
    default:
      return "neutral";
  }
}

/**
 * Header executivo — saudação em destaque, fundo atmosférico e abas de
 * período reais (ligadas aos filtros dataDe/dataAte da URL).
 */
export function GFExecutiveHeader({
  greeting,
  tenantName,
  dataHoje,
  updatedAtLabel,
  status,
  metaMensal = null,
  companyStatusLabel,
  companyStatusTone = "neutral",
  tenantSlug,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customOpen, setCustomOpen] = useState(false);
  const [customDe, setCustomDe] = useState(dataHoje);
  const [customAte, setCustomAte] = useState(dataHoje);
  const dateLabel = formatLongDate(dataHoje);
  const hasMetaMensal =
    metaMensal != null && Number.isFinite(metaMensal) && metaMensal > 0;
  const quote = quoteForToday(dataHoje);
  const ranges = periodRanges(dataHoje);

  const currentDataDe = searchParams.get("dataDe");
  const currentDataAte = searchParams.get("dataAte");

  function periodHref(range: { dataDe: string; dataAte: string }) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("dataDe", range.dataDe);
    params.set("dataAte", range.dataAte);
    return `${pathname}?${params.toString()}`;
  }

  function isActive(range: { dataDe: string; dataAte: string }) {
    if (!currentDataDe || !currentDataAte) return range === ranges.mesAtual;
    return currentDataDe === range.dataDe && currentDataAte === range.dataAte;
  }

  const periodTabs = [
    { label: "Hoje", range: ranges.hoje },
    { label: "7 dias", range: ranges.sete },
    { label: "30 dias", range: ranges.trinta },
    { label: "Mês atual", range: ranges.mesAtual },
  ];

  return (
    <header
      data-dashboard-block="executive-header"
      data-gf-executive-header=""
      data-sprint="26.2.2"
      className={cn(
        "relative isolate overflow-hidden rounded-[var(--gf-radius)] p-5 sm:p-7",
        "border border-white/10 text-white shadow-[var(--elevation-card)]",
      )}
      style={{
        backgroundImage:
          "radial-gradient(ellipse 130% 90% at 18% -15%, rgba(230,192,105,0.30), transparent 52%)," +
          "radial-gradient(ellipse 90% 70% at 88% 115%, rgba(59,92,158,0.32), transparent 60%)," +
          "linear-gradient(175deg, #04060b 0%, #0a1120 34%, #131a2a 62%, #05070c 100%)",
      }}
    >
      {/* Camada atmosférica — silhueta de montanhas + névoa, dá a sensação de
          fundo fotográfico (nascer do sol) sem usar uma foto de terceiros. */}
      <svg
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 w-full opacity-[0.55] sm:h-40"
        viewBox="0 0 800 200"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M0 200 L0 120 L90 60 L170 130 L240 40 L320 150 L410 70 L480 160 L560 90 L650 170 L740 100 L800 150 L800 200 Z"
          fill="rgba(6,9,16,0.55)"
        />
        <path
          d="M0 200 L0 150 L120 100 L210 160 L300 90 L390 175 L470 120 L560 180 L650 130 L740 185 L800 160 L800 200 Z"
          fill="rgba(4,6,11,0.85)"
        />
      </svg>
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgb(230_192_105_/0.22),transparent_70%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
        aria-hidden
      />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm text-white/55">
            {greeting ?? "Bom dia"},{" "}
            <span className="font-semibold text-[var(--brand-gold)]">
              {tenantName.split(" ")[0] ?? tenantName}!
            </span>
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {tenantName}
          </h1>
          <p className={cn(gfType.caption, "capitalize text-white/45")}>
            {dateLabel}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {companyStatusLabel ? (
              <GFStatusPill tone={companyStatusTone}>
                Status · {companyStatusLabel}
              </GFStatusPill>
            ) : null}
            <span data-meta-mes-pill="">
              <GFStatusPill tone={hasMetaMensal ? "info" : "neutral"}>
                {hasMetaMensal
                  ? `Meta do mês · ${formatCurrencyCompact(metaMensal)}`
                  : "Meta do mês · Não cadastrada"}
              </GFStatusPill>
            </span>
            <span data-meta-dia-pill="">
              <GFStatusPill tone={metaTone(status)}>
                Meta do dia · {META_DIA_STATUS_LABEL[status]}
              </GFStatusPill>
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
          <p className="max-w-[220px] text-right text-sm italic text-white/50">
            &quot;{quote}&quot;
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <DashboardRefreshButton updatedAtLabel={updatedAtLabel} />
            {tenantSlug ? (
              <Link
                href={`/${tenantSlug}/relatorios`}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/15",
                  "bg-white/5 px-3 text-xs font-medium text-white/70",
                  "hover:border-white/25 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40",
                )}
                aria-label="Exportar e relatórios"
              >
                <GFIcon icon={Download} size="sm" variant="neutral" />
                Exportar
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="relative mt-6 flex flex-wrap gap-1.5">
        {periodTabs.map((tab) => (
          <Link
            key={tab.label}
            href={periodHref(tab.range)}
            onClick={() => setCustomOpen(false)}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-xs font-medium transition",
              !customOpen && isActive(tab.range)
                ? "bg-[var(--brand-gold)] text-[var(--brand-navy)]"
                : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/85",
            )}
          >
            {tab.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setCustomOpen((v) => !v)}
          className={cn(
            "rounded-lg px-3.5 py-1.5 text-xs font-medium transition",
            customOpen
              ? "bg-[var(--brand-gold)] text-[var(--brand-navy)]"
              : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/85",
          )}
        >
          Personalizado
        </button>
      </div>

      {customOpen ? (
        <div className="relative mt-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-white/40">De</span>
            <input
              type="date"
              value={customDe}
              onChange={(e) => setCustomDe(e.target.value)}
              className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-white"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-white/40">Até</span>
            <input
              type="date"
              value={customAte}
              onChange={(e) => setCustomAte(e.target.value)}
              className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-white"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("dataDe", customDe);
              params.set("dataAte", customAte);
              router.push(`${pathname}?${params.toString()}`);
            }}
            className="rounded-lg bg-[var(--brand-gold)] px-3 py-1.5 text-xs font-medium text-[var(--brand-navy)]"
          >
            Aplicar
          </button>
        </div>
      ) : null}

      <p className={cn(gfType.caption, "relative mt-3 text-white/35")}>
        Atualizado {updatedAtLabel}
      </p>
    </header>
  );
}
