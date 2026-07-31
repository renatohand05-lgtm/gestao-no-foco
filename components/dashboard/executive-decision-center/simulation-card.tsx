"use client";

import { useId, useState } from "react";

import { ExecutiveBadge, ExecutiveCard } from "@/components/executive";
import { Button } from "@/components/ui/button";
import {
  EDC_CONFIDENCE_LABEL,
  formatSimulationProjection,
  type EdcSimulation,
} from "@/lib/executive-decision-center";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  simulation: EdcSimulation;
};

/**
 * Cartão “E se?” — preview interativo local sobre baseline real.
 * Não persiste e não altera dados do tenant.
 */
export function SimulationCard({ simulation }: Props) {
  const sliderId = useId();
  const declared = simulation.deltaPct;
  const [pct, setPct] = useState(declared);
  const canInteract =
    simulation.available &&
    simulation.baselineAmount != null &&
    Number.isFinite(simulation.baselineAmount);

  const preview = canInteract
    ? formatSimulationProjection(simulation.baselineAmount!, pct)
    : null;

  const min = declared < 0 ? Math.min(declared * 2, -1) : 1;
  const max = declared < 0 ? -1 : Math.max(declared * 2, 1);

  return (
    <div
      data-sim-kind={simulation.kind}
      data-sim-available={simulation.available ? "1" : "0"}
      data-premium-v257="simulation-card"
      data-sim-interactive={canInteract ? "1" : "0"}
      data-sprint="26.1"
      className="h-full premium-enter"
    >
      <ExecutiveCard
        padding={16}
        className={cn(
          "gf-surface gf-surface-raised h-full space-y-3",
          "border border-[var(--border-premium)] bg-[var(--surface-raised)]",
          !simulation.available && "opacity-80",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <ExecutiveBadge
            tone={simulation.available ? "info" : "neutral"}
            variant="soft"
          >
            E se?
          </ExecutiveBadge>
          <ExecutiveBadge tone="neutral" variant="outline">
            Confiança {EDC_CONFIDENCE_LABEL[simulation.confidence]}
          </ExecutiveBadge>
        </div>

        <p className="text-sm font-semibold text-foreground">
          {simulation.title}
        </p>
        <p className={cn(gofTypography.subtitle, "text-sm")}>
          {simulation.description}
        </p>

        {simulation.available ? (
          <dl className="grid gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-interactive)]/60 p-2.5 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">
                {simulation.baselineLabel}
              </dt>
              <dd className="font-medium tabular-nums">
                {simulation.baselineValue}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">
                {simulation.projectedLabel}
              </dt>
              <dd
                className="font-semibold tabular-nums text-[var(--brand-gold-deep)] dark:text-[var(--brand-gold-soft)]"
                data-sim-projected=""
              >
                {preview?.projectedValue ?? simulation.projectedValue}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Delta</dt>
              <dd className="font-semibold tabular-nums text-foreground" data-sim-delta="">
                {preview?.deltaLabel ?? simulation.deltaLabel}
              </dd>
            </div>
          </dl>
        ) : (
          <p className={gofTypography.caption}>
            {simulation.unavailableReason ?? "Simulação indisponível."}
          </p>
        )}

        {canInteract ? (
          <div className="space-y-2 border-t border-[var(--border-subtle)] pt-3">
            <label
              htmlFor={sliderId}
              className={cn(gofTypography.caption, "block")}
            >
              Intensidade ({pct > 0 ? "+" : ""}
              {pct}%) · só análise
            </label>
            <input
              id={sliderId}
              type="range"
              min={min}
              max={max}
              step={1}
              value={pct}
              onChange={(e) => setPct(Number(e.target.value))}
              className="h-2.5 w-full cursor-pointer accent-[var(--brand-gold)]"
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuenow={pct}
              data-sim-slider=""
            />
            <div
              className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-base)]"
              aria-hidden
            >
              <div
                className="h-full rounded-full bg-[var(--brand-gold)] transition-[width] duration-[var(--motion-fast)]"
                style={{
                  width: `${Math.min(100, Math.max(4, ((pct - min) / Math.max(1, max - min)) * 100))}%`,
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => setPct(declared)}
              >
                Reset
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => setPct(Math.round((min + max) / 2))}
              >
                Meio
              </Button>
              <span className={gofTypography.caption}>
                Declarado: {declared > 0 ? "+" : ""}
                {declared}% · não grava no banco
              </span>
            </div>
          </div>
        ) : null}

        {simulation.evidence.length > 0 ? (
          <ul className="space-y-0.5 border-t border-border/50 pt-2">
            {simulation.evidence.map((ev) => (
              <li key={ev.id} className={gofTypography.caption}>
                {ev.label}: {ev.value}
              </li>
            ))}
          </ul>
        ) : null}
      </ExecutiveCard>
    </div>
  );
}
