"use client";

import { gfType } from "@/lib/design-system/signature";
import type {
  TaxAlert,
  TaxCalendarItem,
  TaxConfidenceLevel,
} from "@/lib/tax/types";

export function GFTaxExecutiveKpis({
  period,
  burden,
  effectiveRate,
  confidence,
  coverage,
  disclaimer,
}: {
  period: string;
  burden: number | null;
  effectiveRate: number | null;
  confidence: TaxConfidenceLevel;
  coverage: number | null;
  disclaimer: string;
}) {
  return (
    <div
      data-gf-tax-executive-cockpit=""
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div className="rounded-xl border border-[var(--gf-border-subtle)] p-3">
        <p className={gfType.caption}>Período</p>
        <p className={gfType.cardTitle}>{period}</p>
      </div>
      <div className="rounded-xl border border-[var(--gf-border-subtle)] p-3">
        <p className={gfType.caption}>Carga</p>
        <p className={gfType.cardTitle}>
          {burden == null ? "indisponível" : burden}
        </p>
      </div>
      <div className="rounded-xl border border-[var(--gf-border-subtle)] p-3">
        <p className={gfType.caption}>Alíquota efetiva</p>
        <p className={gfType.cardTitle}>
          {effectiveRate == null ? "indisponível" : effectiveRate}
        </p>
      </div>
      <div className="rounded-xl border border-[var(--gf-border-subtle)] p-3">
        <p className={gfType.caption}>
          Confiança {confidence} · cobertura{" "}
          {coverage == null ? "n/d" : `${coverage}%`}
        </p>
        <p className={gfType.caption}>{disclaimer}</p>
      </div>
    </div>
  );
}

export function GFTaxCalendarList({ items }: { items: TaxCalendarItem[] }) {
  return (
    <ul data-gf-tax-calendar="" className="space-y-2">
      {items.length === 0 ? (
        <li className={gfType.body}>
          Sem obrigações com fonte — nada inventado.
        </li>
      ) : (
        items.map((i) => (
          <li
            key={i.id}
            className="rounded-lg border border-[var(--gf-border-subtle)] p-2 text-sm"
            data-calendar-status={i.status}
          >
            <p className="font-medium">
              {i.obligationName} · {i.status}
            </p>
            <p className={gfType.caption}>
              {i.dueDate ?? "vencimento indisponível"} · fonte{" "}
              {i.source ?? "ausente"}
            </p>
          </li>
        ))
      )}
    </ul>
  );
}

export function GFTaxAlertsList({ alerts }: { alerts: TaxAlert[] }) {
  return (
    <ul data-gf-tax-alerts="" className="space-y-2">
      {alerts.length === 0 ? (
        <li className={gfType.body}>Nenhum alerta configurado/detectado.</li>
      ) : (
        alerts.map((a) => (
          <li
            key={a.id}
            className="rounded-lg border border-[var(--gf-border-subtle)] p-2 text-sm"
            data-alert-severity={a.severity}
          >
            <p className="font-medium">
              {a.title} · {a.severity}
            </p>
            <p className={gfType.caption}>
              {a.suggestedAction ?? "—"} · confiança {a.confidence}
            </p>
          </li>
        ))
      )}
    </ul>
  );
}
