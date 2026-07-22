"use client";

import Link from "next/link";
import { useState } from "react";

import {
  ExecutiveCard,
  ExecutiveMetric,
  ExecutiveSection,
} from "@/components/executive";
import { Button } from "@/components/ui/button";
import {
  META_DIA_STATUS_LABEL,
  type MetaDiaStatus,
} from "@/lib/dashboard/faturamento-agregacao";
import { formatCurrency, formatPercent } from "@/lib/dashboard/format";
import type { DashboardHojeSnapshot } from "@/lib/dashboard/vendas-dia-service";
import { exAnimations, exSpacing, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  data: DashboardHojeSnapshot;
};

function statusTone(status: MetaDiaStatus) {
  switch (status) {
    case "superada":
    case "atingida":
      return "success" as const;
    case "atencao":
      return "warning" as const;
    case "abaixo":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}

function ProgressBar({ pct }: { pct: number | null }) {
  const width = Math.min(Math.max(pct ?? 0, 0), 140);
  const color =
    (pct ?? 0) >= 100
      ? "bg-emerald-600"
      : (pct ?? 0) >= 80
        ? "bg-amber-500"
        : "bg-rose-500";

  return (
    <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full transition-all", color)}
        style={{ width: `${Math.min(width, 100)}%` }}
        role="progressbar"
        aria-valuenow={pct ?? 0}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}

export function ExecutiveHojePanel({ tenantSlug, data }: Props) {
  const [openDrill, setOpenDrill] = useState(false);
  const h = data.hoje;
  const m = data.mes;
  const c = data.comparacoes;

  return (
    <ExecutiveSection
      title="Hoje — meta × realizado"
      description={`Visão executiva do dia (${data.data_hoje}) · fuso ${data.timezone}`}
      panel
    >
      <div className={cn("grid gap-4 lg:grid-cols-12", exSpacing[16])}>
        <button
          type="button"
          onClick={() => setOpenDrill((v) => !v)}
          className={cn(
            "col-span-full rounded-xl border bg-card p-5 text-left transition hover:border-foreground/25 lg:col-span-5",
            exAnimations.slide,
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={exTypography.caption}>Meta do dia × realizado</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
                {formatCurrency(h.faturamento)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Meta:{" "}
                {h.meta == null ? "—" : formatCurrency(h.meta)}
                {h.percentual != null
                  ? ` · ${formatPercent(h.percentual)}`
                  : ""}
              </p>
            </div>
            <span
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium",
                h.status === "atingida" || h.status === "superada"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : h.status === "atencao"
                    ? "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                    : h.status === "abaixo"
                      ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                      : "bg-muted text-muted-foreground",
              )}
            >
              {META_DIA_STATUS_LABEL[h.status]}
            </span>
          </div>
          <ProgressBar pct={h.percentual} />
          <p className="mt-2 text-xs text-muted-foreground">
            Diferença:{" "}
            {h.meta == null
              ? "—"
              : formatCurrency(h.faturamento - h.meta)}
            {" · "}
            Falta: {h.falta == null ? "—" : formatCurrency(h.falta)}
            {" · "}
            Clique para ver vendas
          </p>
        </button>

        <div
          className={cn(
            "col-span-full grid gap-3 sm:grid-cols-2 lg:col-span-7 lg:grid-cols-3",
          )}
        >
          <ExecutiveCard padding={16} className={exAnimations.slide}>
            <ExecutiveMetric
              label="Faturamento hoje"
              value={formatCurrency(h.faturamento)}
              tone={statusTone(h.status)}
            />
          </ExecutiveCard>
          <ExecutiveCard padding={16} className={exAnimations.slide}>
            <ExecutiveMetric
              label="Meta hoje"
              value={h.meta == null ? "—" : formatCurrency(h.meta)}
              hint={`Fonte: ${h.meta_fonte}`}
            />
          </ExecutiveCard>
          <ExecutiveCard padding={16} className={exAnimations.slide}>
            <ExecutiveMetric
              label="% atingido"
              value={h.percentual == null ? "—" : formatPercent(h.percentual)}
            />
          </ExecutiveCard>
          <ExecutiveCard padding={16} className={exAnimations.slide}>
            <ExecutiveMetric
              label="Qtd. vendas hoje"
              value={String(h.quantidade_vendas)}
            />
          </ExecutiveCard>
          <ExecutiveCard padding={16} className={exAnimations.slide}>
            <ExecutiveMetric
              label="Ticket médio hoje"
              value={formatCurrency(h.ticket_medio)}
            />
          </ExecutiveCard>
          <ExecutiveCard padding={16} className={exAnimations.slide}>
            <ExecutiveMetric
              label="Vs ontem"
              value={
                c.vs_ontem_pct == null
                  ? "—"
                  : `${c.vs_ontem_pct >= 0 ? "+" : ""}${c.vs_ontem_pct.toFixed(1)}%`
              }
              hint={`Ontem: ${formatCurrency(c.vs_ontem_valor)}`}
            />
          </ExecutiveCard>
        </div>
      </div>

      <div
        className={cn(
          "mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6",
        )}
      >
        <ExecutiveCard padding={16}>
          <ExecutiveMetric
            label="Faturamento do mês"
            value={formatCurrency(m.faturamento)}
          />
        </ExecutiveCard>
        <ExecutiveCard padding={16}>
          <ExecutiveMetric
            label="Meta do mês"
            value={m.meta == null ? "—" : formatCurrency(m.meta)}
          />
        </ExecutiveCard>
        <ExecutiveCard padding={16}>
          <ExecutiveMetric
            label="% mensal"
            value={m.percentual == null ? "—" : formatPercent(m.percentual)}
          />
        </ExecutiveCard>
        <ExecutiveCard padding={16}>
          <ExecutiveMetric
            label="Projeção fechamento"
            value={
              m.projecao_fechamento == null
                ? "—"
                : formatCurrency(m.projecao_fechamento)
            }
          />
        </ExecutiveCard>
        <ExecutiveCard padding={16}>
          <ExecutiveMetric
            label="Média diária"
            value={formatCurrency(m.media_diaria)}
          />
        </ExecutiveCard>
        <ExecutiveCard padding={16}>
          <ExecutiveMetric
            label="Melhor dia do mês"
            value={
              m.melhor_dia == null
                ? "—"
                : formatCurrency(m.melhor_dia.valor)
            }
            hint={m.melhor_dia?.data}
          />
        </ExecutiveCard>
        <ExecutiveCard padding={16} className="sm:col-span-2">
          <ExecutiveMetric
            label="Vs mesmo dia da semana anterior"
            value={
              c.vs_mesmo_dia_semana_anterior_pct == null
                ? "—"
                : `${c.vs_mesmo_dia_semana_anterior_pct >= 0 ? "+" : ""}${c.vs_mesmo_dia_semana_anterior_pct.toFixed(1)}%`
            }
            hint={`Base: ${formatCurrency(c.vs_mesmo_dia_semana_anterior_valor)}`}
          />
        </ExecutiveCard>
      </div>

      {openDrill ? (
        <div className="mt-4 overflow-x-auto rounded-xl border">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-semibold">
              Vendas de hoje ({data.vendas_hoje.length})
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpenDrill(false)}
            >
              Fechar
            </Button>
          </div>
          {data.vendas_hoje.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Nenhuma venda faturada hoje.
            </p>
          ) : (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Horário</th>
                  <th className="px-3 py-2 font-medium">Cliente</th>
                  <th className="px-3 py-2 font-medium">Vendedor</th>
                  <th className="px-3 py-2 font-medium">Origem</th>
                  <th className="px-3 py-2 font-medium text-right">Bruto</th>
                  <th className="px-3 py-2 font-medium text-right">Desconto</th>
                  <th className="px-3 py-2 font-medium text-right">Líquido</th>
                </tr>
              </thead>
              <tbody>
                {data.vendas_hoje.map((v) => (
                  <tr key={v.id} className="border-t">
                    <td className="px-3 py-2 tabular-nums">
                      <Link
                        href={`/${tenantSlug}/vendas/${v.id}`}
                        className="underline-offset-2 hover:underline"
                      >
                        #{v.numero} · {v.horario}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{v.cliente}</td>
                    <td className="px-3 py-2">{v.vendedor ?? "—"}</td>
                    <td className="px-3 py-2">{v.origem}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatCurrency(v.valor_bruto)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatCurrency(v.desconto)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">
                      {formatCurrency(v.valor_liquido)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </ExecutiveSection>
  );
}
