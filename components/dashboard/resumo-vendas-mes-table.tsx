"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ChevronRight, Eraser, Loader2 } from "lucide-react";

import { ResumoDiaDrawer } from "@/components/dashboard/resumo-dia-drawer";
import { ResumoEvolucaoAcumulada } from "@/components/dashboard/resumo-evolucao-acumulada";
import { SituacaoBadge } from "@/components/dashboard/resumo-situacao-badge";
import { Button } from "@/components/ui/button";
import { loadResumoDiaDetailAction } from "@/lib/dashboard/resumo-vendas-mes-actions";
import { formatCurrency, formatPercent } from "@/lib/dashboard/format";
import type {
  ResumoMesDiaDetail,
  ResumoVendasMesData,
} from "@/lib/dashboard/resumo-vendas-mes-service";
import type { ResumoDiaRow } from "@/lib/dashboard/resumo-vendas-mes";
import { cn } from "@/lib/utils";
import type { DashboardFilterOption } from "@/types/dashboard-executive";

type Props = {
  tenantSlug: string;
  data: ResumoVendasMesData;
  centrosCusto: DashboardFilterOption[];
  initialFilters: {
    year: number;
    month: number;
    centroCustoId?: string;
    origem?: string;
  };
};

function signedCurrency(value: number | null) {
  if (value == null) return "—";
  const abs = formatCurrency(Math.abs(value));
  if (value > 0) return `+${abs}`;
  if (value < 0) return `-${abs}`;
  return abs;
}

function signedPercent(value: number | null) {
  if (value == null) return "—";
  const abs = formatPercent(Math.abs(value));
  if (value > 0) return `+${abs}`;
  if (value < 0) return `-${abs}`;
  return abs;
}

function diffClass(value: number | null) {
  if (value == null) return "text-muted-foreground";
  if (value > 0) return "font-medium text-emerald-700 dark:text-emerald-400";
  if (value < 0) return "font-medium text-rose-700 dark:text-rose-400";
  return "text-muted-foreground";
}

const MONTHS = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

/**
 * Planilha gerencial diária premium — dashboard principal.
 */
export function ResumoVendasMesTable({
  tenantSlug,
  data,
  centrosCusto,
  initialFilters,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [selectedRow, setSelectedRow] = useState<ResumoDiaRow | null>(null);
  const [detail, setDetail] = useState<ResumoMesDiaDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const years = useMemo(() => {
    const current = Number(data.data_hoje.slice(0, 4));
    return [current - 1, current, current + 1];
  }, [data.data_hoje]);

  const hasActiveFilters = Boolean(
    initialFilters.centroCustoId || initialFilters.origem,
  );

  function pushFilters(next: {
    year?: number;
    month?: number;
    centroCustoId?: string | null;
    origem?: string | null;
    clear?: boolean;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.clear) {
      params.delete("resumoUnidade");
      params.delete("resumoOrigem");
      params.delete("resumoVendedor");
      params.set("resumoAno", String(initialFilters.year));
      params.set("resumoMes", String(initialFilters.month));
    } else {
      const year = next.year ?? initialFilters.year;
      const month = next.month ?? initialFilters.month;
      params.set("resumoAno", String(year));
      params.set("resumoMes", String(month));

      const centro =
        next.centroCustoId !== undefined
          ? next.centroCustoId
          : initialFilters.centroCustoId;
      const origem =
        next.origem !== undefined ? next.origem : initialFilters.origem;

      if (centro) params.set("resumoUnidade", centro);
      else params.delete("resumoUnidade");
      params.delete("resumoVendedor");
      if (origem) params.set("resumoOrigem", origem);
      else params.delete("resumoOrigem");
    }

    startTransition(() => {
      router.push(`/${tenantSlug}/dashboard?${params.toString()}`);
    });
  }

  async function openDay(row: ResumoDiaRow) {
    if (row.kind === "futuro") return;
    setSelectedRow(row);
    setDetail(null);
    setDetailError(null);
    setDrawerOpen(true);
    setLoadingDetail(true);
    const result = await loadResumoDiaDetailAction(tenantSlug, row.data, {
      centroCustoId: initialFilters.centroCustoId ?? null,
      origem: initialFilters.origem ?? null,
    });
    setLoadingDetail(false);
    if (!result.success) {
      setDetailError(result.error);
      return;
    }
    setDetail(result.data);
  }

  return (
    <div className="space-y-5">
      <section
        className="overflow-hidden rounded-2xl border border-border/55 bg-card shadow-sm"
        aria-labelledby="resumo-vendas-mes-titulo"
      >
        <div className="border-b bg-gradient-to-r from-muted/40 to-transparent px-5 py-4 sm:px-6">
          <h2
            id="resumo-vendas-mes-titulo"
            className="text-sm font-semibold tracking-tight text-foreground sm:text-base"
          >
            Resumo de Vendas do Mês
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {data.meta_fonte_padrao}
            {data.meta_mensal != null
              ? ` · meta mensal ${formatCurrency(data.meta_mensal)}`
              : " · sem meta mensal"}
            {" · "}
            {data.rows.length} dias
          </p>
        </div>

        <div
          className="flex flex-wrap items-end gap-3 border-b bg-muted/20 px-5 py-3.5 sm:px-6"
          role="toolbar"
          aria-label="Filtros do resumo de vendas"
        >
          <FilterSelect
            label="Mês"
            value={String(initialFilters.month)}
            onChange={(v) => pushFilters({ month: Number(v) })}
            options={MONTHS.map((m) => ({
              value: String(m.value),
              label: m.label,
            }))}
          />
          <FilterSelect
            label="Ano"
            value={String(initialFilters.year)}
            onChange={(v) => pushFilters({ year: Number(v) })}
            options={years.map((y) => ({
              value: String(y),
              label: String(y),
            }))}
          />
          <FilterSelect
            label="Unidade"
            value={initialFilters.centroCustoId ?? ""}
            onChange={(v) => pushFilters({ centroCustoId: v || null })}
            options={[
              { value: "", label: "Todas" },
              ...centrosCusto.map((c) => ({ value: c.id, label: c.nome })),
            ]}
          />
          <FilterSelect
            label="Origem da venda"
            value={initialFilters.origem ?? ""}
            onChange={(v) => pushFilters({ origem: v || null })}
            options={[
              { value: "", label: "Todas" },
              ...data.filter_options.origens.map((o) => ({
                value: o,
                label: o,
              })),
            ]}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            disabled={!hasActiveFilters && !pending}
            onClick={() => pushFilters({ clear: true })}
            aria-label="Limpar filtros"
          >
            <Eraser className="size-3.5" aria-hidden />
            Limpar filtros
          </Button>
          {pending ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Atualizando…
            </span>
          ) : null}
        </div>

        {/* Desktop table */}
        <div className="relative hidden max-h-[min(72vh,48rem)] overflow-auto md:block">
          <table className="w-full min-w-[1080px] table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-8" />
              <col className="w-[15rem]" />
              <col className="w-[11rem]" />
              <col className="w-[11rem]" />
              <col className="w-[11rem]" />
              <col className="w-[8.5rem]" />
              <col className="w-[9.5rem]" />
              <col className="w-10" />
            </colgroup>
            <thead className="sticky top-0 z-[2] bg-muted/95 text-left text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
              <tr>
                <th className="border-b px-2 py-3" aria-hidden />
                <th className="border-b px-4 py-3 font-semibold">Dia</th>
                <th className="border-b px-4 py-3 text-right font-semibold">
                  Meta de vendas
                </th>
                <th className="border-b px-4 py-3 text-right font-semibold">
                  Realizado de vendas
                </th>
                <th className="border-b px-4 py-3 text-right font-semibold">
                  Diferença de vendas
                </th>
                <th className="border-b px-4 py-3 text-right font-semibold">
                  % diferença
                </th>
                <th className="border-b px-4 py-3 font-semibold">Situação</th>
                <th className="border-b px-2 py-3" aria-label="Abrir" />
              </tr>
            </thead>
            <tbody>
              <tr className="sticky top-[2.75rem] z-[1] border-y-2 border-foreground/20 bg-slate-100 font-bold shadow-sm dark:bg-slate-900">
                <td className="px-2 py-4">
                  <span
                    className="block h-9 w-1 rounded-full bg-foreground/40"
                    aria-hidden
                  />
                </td>
                <td className="px-4 py-4 text-[0.9375rem]">TOTAL GERAL</td>
                <td className="px-4 py-4 text-right text-[0.9375rem] tabular-nums whitespace-nowrap">
                  {formatCurrency(data.total.meta_total)}
                </td>
                <td className="px-4 py-4 text-right text-[0.9375rem] tabular-nums whitespace-nowrap">
                  {formatCurrency(data.total.realizado_acumulado)}
                </td>
                <td
                  className={cn(
                    "px-4 py-4 text-right text-[0.9375rem] tabular-nums whitespace-nowrap",
                    diffClass(data.total.diferenca),
                  )}
                >
                  {signedCurrency(data.total.diferenca)}
                </td>
                <td
                  className={cn(
                    "px-4 py-4 text-right text-[0.9375rem] tabular-nums whitespace-nowrap",
                    diffClass(data.total.pct_diferenca),
                  )}
                >
                  {signedPercent(data.total.pct_diferenca)}
                </td>
                <td className="px-4 py-4">
                  <SituacaoBadge situacao={data.total.situacao} />
                </td>
                <td />
              </tr>

              {data.rows.map((row, idx) => {
                const clickable = row.kind !== "futuro";
                return (
                  <tr
                    key={row.data}
                    tabIndex={clickable ? 0 : undefined}
                    onClick={clickable ? () => void openDay(row) : undefined}
                    onKeyDown={(e) => {
                      if (!clickable) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        void openDay(row);
                      }
                    }}
                    className={cn(
                      "border-b border-border/50 transition-colors",
                      idx % 2 === 1 && row.kind !== "hoje" && "bg-muted/15",
                      clickable &&
                        "cursor-pointer hover:bg-muted/40 focus-visible:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sky-500",
                      row.kind === "hoje" &&
                        "bg-amber-50/90 dark:bg-amber-950/25",
                      row.kind === "futuro" && "text-muted-foreground",
                      (row.situacao === "atingida" ||
                        row.situacao === "superou") &&
                        row.kind !== "hoje" &&
                        "bg-emerald-50/40 dark:bg-emerald-950/10",
                      row.situacao === "muito_abaixo" &&
                        row.kind !== "futuro" &&
                        row.kind !== "hoje" &&
                        "bg-rose-50/30 dark:bg-rose-950/10",
                    )}
                    aria-label={
                      clickable
                        ? `${row.label_dia}, abrir detalhes`
                        : row.label_dia
                    }
                  >
                    <td className="px-2 py-3">
                      <span
                        className={cn(
                          "block h-8 w-1 rounded-full",
                          row.situacao === "superou" && "bg-emerald-600",
                          row.situacao === "atingida" && "bg-emerald-500",
                          row.situacao === "atencao" && "bg-amber-400",
                          row.situacao === "abaixo" && "bg-orange-400",
                          row.situacao === "muito_abaixo" && "bg-rose-500",
                          (row.situacao === "futuro" ||
                            row.situacao === "neutro") &&
                            "bg-border",
                        )}
                        aria-hidden
                      />
                    </td>
                    <td className="px-4 py-3 capitalize">
                      <span className="inline-flex flex-wrap items-center gap-1.5">
                        <span className="font-medium">{row.label_dia}</span>
                        {row.kind === "hoje" ? (
                          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-amber-800 uppercase dark:text-amber-200">
                            Hoje
                          </span>
                        ) : null}
                        {row.meta_fonte === "rateio" ? (
                          <span className="text-[10px] text-muted-foreground">
                            rateio
                          </span>
                        ) : null}
                        {row.meta_fonte === "manual" ? (
                          <span className="text-[10px] text-muted-foreground">
                            manual
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                      {formatCurrency(row.meta)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                      {row.realizado == null
                        ? "—"
                        : formatCurrency(row.realizado)}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right tabular-nums whitespace-nowrap",
                        diffClass(row.diferenca),
                      )}
                    >
                      {signedCurrency(row.diferenca)}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right tabular-nums whitespace-nowrap",
                        diffClass(row.pct_diferenca),
                      )}
                    >
                      {signedPercent(row.pct_diferenca)}
                    </td>
                    <td className="px-4 py-3">
                      <SituacaoBadge situacao={row.situacao} />
                    </td>
                    <td className="px-2 py-3 text-muted-foreground">
                      {clickable ? (
                        <ChevronRight className="size-4" aria-hidden />
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="space-y-2 border-t p-3 md:hidden">
          <div className="rounded-lg border-2 border-foreground/15 bg-slate-100 p-3 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold">TOTAL GERAL</p>
              <SituacaoBadge situacao={data.total.situacao} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs font-semibold">
              <span>Meta</span>
              <span className="text-right tabular-nums">
                {formatCurrency(data.total.meta_total)}
              </span>
              <span>Realizado</span>
              <span className="text-right tabular-nums">
                {formatCurrency(data.total.realizado_acumulado)}
              </span>
              <span>Diferença</span>
              <span
                className={cn(
                  "text-right tabular-nums",
                  diffClass(data.total.diferenca),
                )}
              >
                {signedCurrency(data.total.diferenca)}
              </span>
              <span>% diferença</span>
              <span
                className={cn(
                  "text-right tabular-nums",
                  diffClass(data.total.pct_diferenca),
                )}
              >
                {signedPercent(data.total.pct_diferenca)}
              </span>
            </div>
          </div>
          {data.rows.map((row) => (
            <button
              key={row.data}
              type="button"
              disabled={row.kind === "futuro"}
              onClick={() => void openDay(row)}
              className={cn(
                "w-full rounded-lg border p-3 text-left text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500",
                row.kind === "hoje" &&
                  "border-amber-400/60 bg-amber-50 dark:bg-amber-950/40",
                row.kind === "futuro" && "opacity-60",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold capitalize">
                  {row.label_dia}
                  {row.kind === "hoje" ? (
                    <span className="ml-1.5 text-[10px] font-bold text-amber-700 uppercase">
                      Hoje
                    </span>
                  ) : null}
                </span>
                <SituacaoBadge situacao={row.situacao} />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1">
                <span className="text-muted-foreground">Meta</span>
                <span className="text-right tabular-nums">
                  {formatCurrency(row.meta)}
                </span>
                <span className="text-muted-foreground">Realizado</span>
                <span className="text-right tabular-nums">
                  {row.realizado == null ? "—" : formatCurrency(row.realizado)}
                </span>
                <span className="text-muted-foreground">Diferença</span>
                <span
                  className={cn(
                    "text-right tabular-nums",
                    diffClass(row.diferenca),
                  )}
                >
                  {signedCurrency(row.diferenca)}
                </span>
                <span className="text-muted-foreground">% diferença</span>
                <span
                  className={cn(
                    "text-right tabular-nums",
                    diffClass(row.pct_diferenca),
                  )}
                >
                  {signedPercent(row.pct_diferenca)}
                </span>
              </div>
            </button>
          ))}
        </div>

        <p className="border-t px-4 py-2 text-[11px] text-muted-foreground">
          Clique em um dia (ou Enter) para abrir o detalhamento lateral.
        </p>
      </section>

      <ResumoEvolucaoAcumulada
        rows={data.rows}
        total={data.total}
        metaMensal={data.meta_mensal}
      />

      <ResumoDiaDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        tenantSlug={tenantSlug}
        row={selectedRow}
        detail={detail}
        loading={loadingDetail}
        error={detailError}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block min-w-[8.5rem] flex-1 space-y-1 text-xs sm:max-w-[11rem]">
      <span className="font-medium text-muted-foreground">{label}</span>
      <select
        className="h-9 w-full rounded-md border bg-background px-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value || "__all"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
