import Link from "next/link";

import type { MetaPanelModel } from "@/lib/dashboard/cockpit-v2/panels";
import { cn } from "@/lib/utils";

type Props = { meta: MetaPanelModel };

export function MetaPanel({ meta }: Props) {
  const pctNum = Number.parseFloat(meta.pct.replace("%", "").replace(",", "."));
  const width =
    meta.available && Number.isFinite(pctNum)
      ? Math.min(100, Math.max(0, pctNum))
      : 0;

  return (
    <section
      aria-label="Painel de metas"
      data-cockpit-block="metas"
      data-sprint="30.4"
      className="rounded-2xl border border-[var(--border-premium)] bg-[var(--surface-raised)] p-4 sm:p-5 dark:bg-[var(--brand-graphite-elevated)]/90"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-medium tracking-[0.14em] text-[var(--brand-gold)] uppercase">
            Metas
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">Meta do mês</h2>
        </div>
        <Link
          href={meta.href}
          className="text-xs font-medium text-[var(--brand-gold)] underline-offset-2 hover:underline"
        >
          {meta.available ? "Ajustar meta" : "Cadastrar meta"}
        </Link>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Meta" value={meta.meta} />
        <Stat label="Realizado" value={meta.realizado} />
        <Stat label="%" value={meta.pct} />
        <Stat label="Projeção" value={meta.projecao} />
        <Stat label="Dias restantes" value={meta.diasRestantes} />
        <Stat label="Valor restante" value={meta.valorRestante} />
      </dl>

      <div className="mt-4">
        <div
          className="h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={width}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso da meta"
        >
          <div
            className={cn(
              "h-full rounded-full motion-safe:transition-[width]",
              meta.tone === "success" && "bg-success",
              meta.tone === "warning" && "bg-warning",
              meta.tone === "danger" && "bg-danger",
              (meta.tone === "info" || meta.tone === "neutral") &&
                "bg-[var(--brand-gold)]",
            )}
            style={{ width: `${width}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">{meta.vsMesAnterior}</p>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/50 px-3 py-2">
      <dt className="text-[10px] tracking-wide text-[var(--text-muted)] uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
