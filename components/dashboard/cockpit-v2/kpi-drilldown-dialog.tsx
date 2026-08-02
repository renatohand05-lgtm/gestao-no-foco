"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { Download, ExternalLink, X } from "lucide-react";

import type { CockpitKpiItem } from "@/lib/dashboard/cockpit-v2/kpis";
import { cn } from "@/lib/utils";

type Props = {
  item: CockpitKpiItem | null;
  periodoLabel: string;
  onClose: () => void;
};

/**
 * Drill-down leve — sem reload full-page; abre origem/exportação.
 */
export function KpiDrilldownDialog({ item, periodoLabel, onClose }: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!item) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
      data-cockpit-drilldown=""
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "w-full max-w-md rounded-2xl border border-[var(--border-premium)]",
          "bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-elevated)]",
          "dark:bg-[var(--brand-graphite-elevated)]",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium tracking-[0.14em] text-[var(--brand-gold)] uppercase">
              Drill-down
            </p>
            <h2 id={titleId} className="mt-1 text-lg font-semibold tracking-tight">
              {item.title}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex size-10 items-center justify-center rounded-lg border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/45"
            aria-label="Fechar detalhe do KPI"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--text-muted)]">Valor</dt>
            <dd className="font-semibold tabular-nums">{item.value}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--text-muted)]">Comparação</dt>
            <dd className="text-right text-pretty">{item.comparisonLabel}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--text-muted)]">Período</dt>
            <dd className="text-right">{periodoLabel}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-muted)]">Contexto</dt>
            <dd className="mt-0.5 text-[var(--text-secondary)] text-pretty">
              {item.supportingText}
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={item.drillHref}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[var(--brand-gold)]/40 bg-[var(--brand-gold)]/12 px-3 text-sm font-medium text-[var(--brand-gold-deep)] dark:text-[var(--brand-gold-soft)]"
          >
            Abrir origem
            <ExternalLink className="size-3.5" aria-hidden />
          </Link>
          {item.exportHref ? (
            <Link
              href={item.exportHref}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border px-3 text-sm"
            >
              <Download className="size-3.5" aria-hidden />
              Exportação / detalhe
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
