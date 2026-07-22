"use client";

import { useMemo, useState } from "react";

import { formatCurrency } from "@/lib/dashboard/format";
import {
  buildSerieAcumulada,
  calcProjecaoFechamento,
  type ResumoDiaRow,
  type ResumoTotalGeral,
} from "@/lib/dashboard/resumo-vendas-mes";
import { cn } from "@/lib/utils";

type Props = {
  rows: ResumoDiaRow[];
  total: ResumoTotalGeral;
  metaMensal: number | null;
};

export function ResumoEvolucaoAcumulada({ rows, total, metaMensal }: Props) {
  const serie = useMemo(() => buildSerieAcumulada(rows), [rows]);
  const [hover, setHover] = useState<number | null>(null);

  const diasDecorridos = rows.filter((r) => r.kind !== "futuro").length;
  const projecao = calcProjecaoFechamento({
    realizadoAcumulado: total.realizado_acumulado,
    diasDecorridos,
    diasTotais: rows.length,
  });

  const maxY = Math.max(
    ...serie.map((p) =>
      Math.max(p.meta_acumulada, p.realizado_acumulado ?? 0),
    ),
    projecao ?? 0,
    1,
  );

  const w = 720;
  const h = 220;
  const padX = 12;
  const padY = 16;
  const chartW = w - padX * 2;
  const chartH = h - padY * 2;

  function xAt(i: number) {
    if (serie.length <= 1) return padX + chartW / 2;
    return padX + (i / (serie.length - 1)) * chartW;
  }
  function yAt(v: number) {
    return padY + chartH - (v / maxY) * chartH;
  }

  const metaPath = serie
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(p.meta_acumulada)}`)
    .join(" ");

  const realPoints = serie
    .map((p, i) =>
      p.realizado_acumulado == null
        ? null
        : `${i === 0 || serie[i - 1]?.realizado_acumulado == null ? "M" : "L"} ${xAt(i)} ${yAt(p.realizado_acumulado)}`,
    )
    .filter(Boolean)
    .join(" ");

  const active = hover != null ? serie[hover] : null;
  const gapAtual =
    total.diferenca != null ? total.diferenca : null;

  return (
    <section
      className="rounded-2xl border border-border/55 bg-card p-5 shadow-sm sm:p-6"
      aria-labelledby="evolucao-acumulada-titulo"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="evolucao-acumulada-titulo"
            className="text-sm font-semibold tracking-tight text-foreground"
          >
            Evolução acumulada do mês
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Meta acumulada × realizado acumulado
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-blue-600" aria-hidden /> Meta
            acum.
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-600" aria-hidden />{" "}
            Realizado acum.
          </span>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Stat
          label="Gap acumulado"
          value={
            gapAtual == null
              ? "—"
              : `${gapAtual >= 0 ? "+" : "-"}${formatCurrency(Math.abs(gapAtual))}`
          }
          tone={
            gapAtual == null ? "neutral" : gapAtual >= 0 ? "ok" : "bad"
          }
        />
        <Stat
          label="Projeção de fechamento"
          value={
            projecao == null ? "—" : formatCurrency(projecao)
          }
          tone="neutral"
        />
        <Stat
          label="Tendência do mês"
          value={
            metaMensal == null || projecao == null
              ? "—"
              : projecao >= metaMensal
                ? "Acima da meta"
                : "Abaixo da meta"
          }
          tone={
            metaMensal == null || projecao == null
              ? "neutral"
              : projecao >= metaMensal
                ? "ok"
                : "bad"
          }
        />
      </div>

      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="h-44 w-full min-w-[480px]"
          role="img"
          aria-label="Gráfico de linhas: meta acumulada versus realizado acumulado"
          onMouseLeave={() => setHover(null)}
        >
          <path
            d={metaPath}
            fill="none"
            stroke="currentColor"
            className="text-blue-600"
            strokeWidth="2"
          />
          {realPoints ? (
            <path
              d={realPoints}
              fill="none"
              stroke="currentColor"
              className="text-emerald-600"
              strokeWidth="2.5"
            />
          ) : null}
          {serie.map((p, i) => (
            <circle
              key={p.data}
              cx={xAt(i)}
              cy={yAt(
                p.realizado_acumulado ?? p.meta_acumulada,
              )}
              r={hover === i ? 4.5 : 2.5}
              className={cn(
                p.realizado_acumulado == null
                  ? "fill-blue-600/40"
                  : "fill-emerald-600",
              )}
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>
      </div>

      {active ? (
        <p className="mt-1 text-xs text-muted-foreground" role="status">
          {active.label}: meta {formatCurrency(active.meta_acumulada)}
          {active.realizado_acumulado != null
            ? ` · realizado ${formatCurrency(active.realizado_acumulado)}`
            : " · realizado —"}
          {active.gap != null
            ? ` · gap ${active.gap >= 0 ? "+" : "-"}${formatCurrency(Math.abs(active.gap))}`
            : ""}
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          Passe o mouse nos pontos para ver o detalhe do dia.
        </p>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "bad" | "neutral";
}) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-sm font-semibold tabular-nums",
          tone === "ok" && "text-emerald-700 dark:text-emerald-400",
          tone === "bad" && "text-rose-700 dark:text-rose-400",
        )}
      >
        {value}
      </p>
    </div>
  );
}
