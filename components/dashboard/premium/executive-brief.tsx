import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import type { ExecutiveBriefModel } from "@/lib/dashboard/executive-brief";
import { cn } from "@/lib/utils";

function chipToneClass(tone: ExecutiveBriefModel["chips"][number]["tone"]) {
  if (tone === "success") return "border-success/35 bg-success/10 text-success";
  if (tone === "warning") return "border-warning/35 bg-warning/10 text-warning";
  if (tone === "danger") return "border-danger/35 bg-danger/10 text-danger";
  if (tone === "info")
    return "border-[var(--brand-gold)]/35 bg-[var(--brand-gold)]/10 text-[var(--brand-gold-deep)] dark:text-[var(--brand-gold-soft)]";
  return "border-[var(--border-subtle)] bg-[var(--surface-interactive)] text-[var(--text-secondary)]";
}

/**
 * Sprint 26.1 — Executive Brief compacto (1 headline + narrativa + chips + CTA).
 */
export function ExecutiveBrief({ brief }: { brief: ExecutiveBriefModel }) {
  return (
    <section
      data-dashboard-block="executive-brief"
      data-sprint="26.1"
      data-gf-surface="brief"
      className={cn(
        "gf-surface gf-surface-brief relative overflow-hidden rounded-[1.25rem]",
        "border border-[var(--border-premium)] bg-[var(--surface-raised)]",
        "p-4 shadow-[var(--shadow-elevated)] sm:p-5",
        "dark:bg-[var(--brand-graphite-elevated)]/90",
      )}
      aria-label="Executive Brief"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgb(201_168_76_/0.18),transparent_70%)]"
        aria-hidden
      />
      <div className="relative flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles
              className="size-4 shrink-0 text-[var(--brand-gold)]"
              aria-hidden
            />
            <p className="text-[10px] font-medium tracking-[0.16em] text-[var(--text-muted)] uppercase">
              Executive Brief
            </p>
            {brief.alertCount > 0 ? (
              <span className="rounded-md border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                {brief.alertCount} alerta{brief.alertCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
          <h2
            className={cn(
              "font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--text-primary)]",
              "sm:text-2xl",
            )}
            data-brief-headline=""
          >
            {brief.headline}
          </h2>
          <p
            className="max-w-3xl text-sm leading-relaxed text-[var(--text-secondary)] text-pretty"
            data-brief-narrative=""
          >
            {brief.narrative}
          </p>
        </div>

        <Link
          href={brief.focusHref}
          className={cn(
            "gf-cta inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl",
            "border border-[var(--brand-gold)]/40 bg-[var(--brand-gold)]/12 px-3.5 py-2",
            "text-sm font-medium text-[var(--brand-gold-deep)] transition-colors",
            "hover:bg-[var(--brand-gold)]/20 dark:text-[var(--brand-gold-soft)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/45",
          )}
          data-brief-cta=""
        >
          {brief.focusLabel}
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>

      <ul
        className="relative mt-4 flex flex-wrap gap-2"
        data-brief-chips=""
        aria-label="Sinais do ciclo"
      >
        {brief.chips.map((chip) => (
          <li
            key={chip.id}
            className={cn(
              "inline-flex min-w-0 items-baseline gap-1.5 rounded-lg border px-2.5 py-1.5",
              chipToneClass(chip.tone),
            )}
            data-brief-chip={chip.id}
          >
            <span className="text-[10px] tracking-wide uppercase opacity-80">
              {chip.label}
            </span>
            <span className="whitespace-nowrap text-sm font-semibold tabular-nums">
              {chip.value}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
