import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { ExecutiveBriefV2Model } from "@/lib/dashboard/cockpit-v2/panels";
import { cn } from "@/lib/utils";

type Props = { brief: ExecutiveBriefV2Model };

export function ExecutiveBriefV2({ brief }: Props) {
  const periods = [brief.day, brief.week, brief.month];

  return (
    <section
      aria-label="Executive Brief"
      data-cockpit-block="executive-brief"
      data-sprint="30.4"
      className={cn(
        "rounded-2xl border border-[var(--border-premium)] bg-[var(--surface-raised)] p-4 sm:p-5",
        "shadow-[var(--shadow-elevated)] dark:bg-[var(--brand-graphite-elevated)]/90",
      )}
      data-ux-polish="30.4.1"
    >
      <p className="text-[10px] font-medium tracking-[0.16em] text-[var(--brand-gold)] uppercase">
        Executive Brief
      </p>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
        {periods.map((p) => (
          <div
            key={p.id}
            className="rounded-xl border border-border/60 bg-[var(--surface-interactive)]/40 px-3 py-2.5"
            data-brief-period={p.id}
          >
            <p className="text-[10px] tracking-wide text-[var(--text-muted)] uppercase">
              {p.label}
            </p>
            <p
              className={cn(
                "mt-1 text-lg font-semibold tabular-nums",
                !p.available && "text-[var(--text-muted)]",
              )}
            >
              {p.value}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)] text-pretty">
              {p.detail}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <Signal
          title="Maior oportunidade"
          body={brief.biggestOpportunity?.body ?? "Indisponível"}
          href={brief.biggestOpportunity?.href}
        />
        <Signal
          title="Maior risco"
          body={brief.biggestRisk?.body ?? "Indisponível"}
          href={brief.biggestRisk?.href}
          danger
        />
        <Signal
          title={brief.biggestGrowth?.title ?? "Maior crescimento"}
          body={brief.biggestGrowth?.body ?? "Indisponível neste ciclo"}
        />
        <Signal
          title={brief.biggestDrop?.title ?? "Maior queda"}
          body={brief.biggestDrop?.body ?? "Indisponível neste ciclo"}
        />
      </div>

      {brief.topAlerts.length > 0 ? (
        <ul className="mt-4 space-y-1.5" aria-label="Principais alertas">
          {brief.topAlerts.map((a) => (
            <li key={a.id} className="text-sm text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">
                {a.title}
              </span>
              {" — "}
              {a.description}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Sem alertas acionáveis neste ciclo.
        </p>
      )}

      <Link
        href={brief.nextAction.href}
        className={cn(
          "mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3.5",
          "border border-[var(--brand-gold)]/40 bg-[var(--brand-gold)]/12 text-sm font-medium",
          "text-[var(--brand-gold-deep)] dark:text-[var(--brand-gold-soft)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/45",
        )}
      >
        Próxima ação · {brief.nextAction.label}
        <ArrowRight className="size-3.5" aria-hidden />
      </Link>
      <p className="mt-1.5 text-xs text-[var(--text-muted)]">
        {brief.nextAction.reason}
      </p>
    </section>
  );
}

function Signal({
  title,
  body,
  href,
  danger,
}: {
  title: string;
  body: string;
  href?: string;
  danger?: boolean;
}) {
  const inner = (
    <>
      <p
        className={cn(
          "text-[10px] tracking-wide uppercase",
          danger ? "text-danger" : "text-[var(--text-muted)]",
        )}
      >
        {title}
      </p>
      <p className="mt-1 text-sm text-[var(--text-secondary)] text-pretty">{body}</p>
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="rounded-xl border border-border/60 px-3 py-2.5 transition-colors hover:border-[var(--brand-gold)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40"
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className="rounded-xl border border-border/60 px-3 py-2.5">{inner}</div>
  );
}
