"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import type { DreComparativeRow } from "@/lib/dre/dre-compare";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  rows: DreComparativeRow[];
  mesALabel: string;
  mesBLabel: string;
  tenantSlug: string;
  periodA: { dataDe: string; dataAte: string };
  periodB: { dataDe: string; dataAte: string };
};

function fmtMoney(v: number | null) {
  if (v == null) return "Indisponível";
  return formatCurrency(v);
}

function fmtPct(v: number | null) {
  if (v == null) return "—";
  return `${v.toFixed(1)}%`;
}

function Icon({ icon }: { icon: DreComparativeRow["icon"] }) {
  if (icon === "up") return <ArrowUp className="size-3.5" aria-hidden />;
  if (icon === "down") return <ArrowDown className="size-3.5" aria-hidden />;
  if (icon === "flat") return <Minus className="size-3.5" aria-hidden />;
  return <span className="text-[10px]">N/A</span>;
}

export function DreComparativeStatement({
  rows,
  mesALabel,
  mesBLabel,
  tenantSlug,
  periodB,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="hidden overflow-x-auto rounded-lg border border-border/60 md:block">
        <table className="w-full min-w-[920px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
            <tr className="border-b border-border/60 text-left text-xs tracking-wide text-muted-foreground uppercase">
              <th className="sticky left-0 z-20 bg-card/95 px-3 py-3 font-medium">
                Conta / grupo
              </th>
              <th className="px-3 py-3 font-medium">{mesALabel}</th>
              <th className="px-3 py-3 font-medium">{mesBLabel}</th>
              <th className="px-3 py-3 font-medium">Diferença</th>
              <th className="px-3 py-3 font-medium">Variação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const drillHref =
                row.drillable && row.dreLinha
                  ? `/${tenantSlug}/financeiro/dre?comparativo=1&dataDe=${periodB.dataDe}&dataAte=${periodB.dataAte}&linha=${row.dreLinha}`
                  : null;
              return (
                <tr
                  key={row.codigo}
                  className={cn(
                    "border-b border-border/40",
                    row.destaque && "bg-muted/30 font-medium",
                  )}
                >
                  <td
                    className="sticky left-0 bg-card/95 px-3 py-2.5"
                    style={{ paddingLeft: `${12 + row.depth * 14}px` }}
                  >
                    {drillHref ? (
                      <a
                        href={drillHref}
                        className="hover:text-[var(--brand-gold)] hover:underline"
                      >
                        {row.label}
                      </a>
                    ) : (
                      row.label
                    )}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">
                    <div>{fmtMoney(row.valorA)}</div>
                    <div className="text-xs text-muted-foreground">
                      {fmtPct(row.pctReceitaA)} receita
                    </div>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">
                    <div>{fmtMoney(row.valorB)}</div>
                    <div className="text-xs text-muted-foreground">
                      {fmtPct(row.pctReceitaB)} receita
                    </div>
                  </td>
                  <td className={cn("px-3 py-2.5 tabular-nums", row.toneCss)}>
                    {fmtMoney(row.diffReais)}
                  </td>
                  <td className={cn("px-3 py-2.5", row.toneCss)}>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Icon icon={row.icon} />
                      {row.variancePct == null
                        ? "Indisponível"
                        : `${row.variancePct.toFixed(1)}%`}
                      <span className="sr-only">{row.toneLabel}</span>
                      <span className="text-[10px] uppercase tracking-wide opacity-80">
                        {row.toneLabel}
                      </span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {rows
          .filter((r) => r.depth === 0 || r.destaque)
          .map((row) => (
            <article
              key={row.codigo}
              className="rounded-lg border border-border/60 bg-card p-3"
            >
              <h3 className="text-sm font-medium">{row.label}</h3>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">{mesALabel}</dt>
                  <dd className="tabular-nums">{fmtMoney(row.valorA)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{mesBLabel}</dt>
                  <dd className="tabular-nums">{fmtMoney(row.valorB)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Diferença</dt>
                  <dd className={cn("tabular-nums", row.toneCss)}>
                    {fmtMoney(row.diffReais)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Variação</dt>
                  <dd className={cn("inline-flex items-center gap-1", row.toneCss)}>
                    <Icon icon={row.icon} />
                    {row.variancePct == null
                      ? "Indisponível"
                      : `${row.variancePct.toFixed(1)}%`}{" "}
                    · {row.toneLabel}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
      </div>
    </div>
  );
}
