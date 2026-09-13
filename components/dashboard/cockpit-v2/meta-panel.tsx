import Link from "next/link";
import { Target } from "lucide-react";

import type { MetaPanelModel } from "@/lib/dashboard/cockpit-v2/panels";
import { cn } from "@/lib/utils";

type Props = { meta: MetaPanelModel };

/** Anel de progresso compacto — substitui o texto solto por um indicador visual imediato. */
function RadialProgress({
  pctNum,
  available,
  tone,
}: {
  pctNum: number;
  available: boolean;
  tone: MetaPanelModel["tone"];
}) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, pctNum));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <svg
      width="60"
      height="60"
      viewBox="0 0 60 60"
      className={cn(
        "shrink-0",
        tone === "success" && "text-success",
        tone === "warning" && "text-warning",
        tone === "danger" && "text-danger",
        (tone === "info" || tone === "neutral") && "text-[var(--brand-gold)]",
      )}
      role="img"
      aria-label={available ? `${Math.round(clamped)}% da meta atingido` : "Meta indisponível para este período"}
    >
      <circle
        cx="30"
        cy="30"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.15"
        strokeWidth="5"
      />
      {available ? (
        <circle
          cx="30"
          cy="30"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 30 30)"
          className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-500"
        />
      ) : null}
      <text
        x="30"
        y="34"
        textAnchor="middle"
        className="fill-current text-[11px] font-semibold"
      >
        {available ? `${Math.round(clamped)}%` : "—"}
      </text>
    </svg>
  );
}

export function MetaPanel({ meta }: Props) {
  const pctNum = Number.parseFloat(meta.pct.replace("%", "").replace(",", "."));
  const hasPct = meta.available && Number.isFinite(pctNum);

  return (
    <section
      aria-label="Painel de metas"
      data-cockpit-block="metas"
      data-sprint="30.4.2"
      className="rounded-2xl border border-[var(--border-premium)] bg-[var(--surface-raised)] p-4 sm:p-5 dark:bg-[var(--brand-graphite-elevated)]/90"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <RadialProgress
            pctNum={hasPct ? pctNum : 0}
            available={hasPct}
            tone={meta.tone}
          />
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-medium tracking-[0.14em] text-[var(--brand-gold)] uppercase">
              <Target className="size-3" aria-hidden />
              Meta do mês
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">
              {meta.realizado}
              <span className="ml-1 text-xs font-normal text-[var(--text-muted)]">
                de {meta.meta}
              </span>
            </p>
          </div>
        </div>
        <Link
          href={meta.href}
          className="text-xs font-medium text-[var(--brand-gold)] underline-offset-2 hover:underline"
        >
          {meta.available
            ? "Ajustar meta"
            : meta.outOfPeriodView
              ? "Ver meta do mês"
              : "Cadastrar meta"}
        </Link>
      </div>

      <dl className="mt-4 grid gap-2 grid-cols-2 sm:grid-cols-3">
        <Stat label="Projeção" value={meta.projecao} />
        <Stat label="Dias restantes" value={meta.diasRestantes} />
        <Stat label="Valor restante" value={meta.valorRestante} />
      </dl>

      <p className="mt-3 text-xs text-[var(--text-secondary)]">{meta.vsMesAnterior}</p>
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
