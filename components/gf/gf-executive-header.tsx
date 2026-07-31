"use client";

import Link from "next/link";
import { Download, Focus } from "lucide-react";

import { DashboardRefreshButton } from "@/components/dashboard/dashboard-refresh-button";
import { GFIcon } from "@/components/gf/gf-icon";
import { GFStatusPill } from "@/components/gf/gf-status-pill";
import {
  META_DIA_STATUS_LABEL,
  type MetaDiaStatus,
} from "@/lib/dashboard/faturamento-agregacao";
import { gfType } from "@/lib/design-system/signature";
import { cn } from "@/lib/utils";

type Props = {
  greeting?: string;
  tenantName: string;
  dataHoje: string;
  updatedAtLabel: string;
  status: MetaDiaStatus;
  /** Saúde de caixa / empresa — label real do cockpit, nunca inventado. */
  companyStatusLabel?: string;
  companyStatusTone?: "success" | "warning" | "danger" | "neutral" | "info";
  tenantSlug?: string;
};

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
 * Header executivo autoral — compacto, com profundidade (Sprint 26.2).
 */
export function GFExecutiveHeader({
  greeting: _greeting,
  tenantName,
  dataHoje,
  updatedAtLabel,
  status,
  companyStatusLabel,
  companyStatusTone = "neutral",
  tenantSlug,
}: Props) {
  void _greeting;
  const dateLabel = formatLongDate(dataHoje);

  return (
    <header
      data-dashboard-block="executive-header"
      data-gf-executive-header=""
      data-sprint="26.2.1"
      className={cn(
        "gf-executive-header relative overflow-hidden rounded-[var(--gf-radius)] p-4 sm:p-5",
        "border border-border bg-card shadow-[var(--elevation-card)]",
      )}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgb(201_168_76_/0.14),transparent_70%)]"
        aria-hidden
      />
      <div className="relative flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-1.5">
          <p className={gfType.overline}>Cockpit Executivo</p>
          <h1 className={gfType.pageTitle}>{tenantName}</h1>
          <p className={cn(gfType.caption, "capitalize")}>{dateLabel}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {companyStatusLabel ? (
              <GFStatusPill tone={companyStatusTone}>
                Status · {companyStatusLabel}
              </GFStatusPill>
            ) : null}
            <GFStatusPill tone={metaTone(status)}>
              Meta do dia · {META_DIA_STATUS_LABEL[status]}
            </GFStatusPill>
            <span className={cn(gfType.caption, "px-1")}>
              Atualizado {updatedAtLabel}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DashboardRefreshButton updatedAtLabel={updatedAtLabel} />
          {tenantSlug ? (
            <>
              <Link
                href={`/${tenantSlug}/dashboard`}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-xl border border-border",
                  "bg-muted px-3 text-xs font-medium text-[var(--text-secondary)]",
                  "hover:border-[var(--gf-border-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40",
                )}
                aria-label="Abrir foco no dashboard"
              >
                <GFIcon icon={Focus} size="sm" variant="neutral" />
                Foco
              </Link>
              <Link
                href={`/${tenantSlug}/relatorios`}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-xl border border-border",
                  "bg-muted px-3 text-xs font-medium text-[var(--text-secondary)]",
                  "hover:border-[var(--gf-border-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40",
                )}
                aria-label="Exportar e relatórios"
              >
                <GFIcon icon={Download} size="sm" variant="neutral" />
                Exportar
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
