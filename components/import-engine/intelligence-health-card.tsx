import { ShieldCheck } from "lucide-react";

import { ExecutiveBadge } from "@/components/executive/ExecutiveBadge";
import { cn } from "@/lib/utils";
import type { IntelligenceHealthScore } from "./intelligence-presentation";

type Props = {
  health: IntelligenceHealthScore;
  className?: string;
};

function badgeTone(
  badge: IntelligenceHealthScore["badge"],
): "success" | "warning" | "danger" | "neutral" | "info" {
  if (badge === "Excelente" || badge === "Bom") return "success";
  if (badge === "Atenção") return "warning";
  if (badge === "Crítico") return "danger";
  return "neutral";
}

/**
 * Health Score visual da qualidade dos dados de importação (UI only).
 */
export function IntelligenceHealthCard({ health, className }: Props) {
  const pct = health.percent;
  const display = pct == null ? "—" : `${Math.round(pct)}%`;
  const ring = pct == null ? 0 : Math.min(100, Math.max(0, pct));

  return (
    <section
      aria-label="Health Score de qualidade dos dados"
      className={cn(
        "rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-muted-foreground" aria-hidden />
            <h2 className="text-sm font-semibold tracking-tight">Health Score</h2>
          </div>
          <p className="max-w-md text-xs text-muted-foreground">{health.description}</p>
          <div className="flex flex-wrap items-center gap-2">
            <ExecutiveBadge tone={badgeTone(health.badge)} variant="soft">
              {health.badge}
            </ExecutiveBadge>
            {health.placeholder ? (
              <ExecutiveBadge tone="neutral" variant="outline">
                Placeholder
              </ExecutiveBadge>
            ) : null}
          </div>
        </div>

        <div
          className="relative grid size-24 place-items-center"
          role="img"
          aria-label={`Health Score ${display}. ${health.badge}`}
        >
          <svg viewBox="0 0 100 100" className="size-24 -rotate-90" aria-hidden>
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted/40"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(ring / 100) * 264} 264`}
              className={cn(
                health.badge === "Crítico" && "text-red-600",
                health.badge === "Atenção" && "text-amber-600",
                (health.badge === "Bom" || health.badge === "Excelente") &&
                  "text-emerald-600",
                health.badge === "Indisponível" && "text-muted-foreground",
              )}
            />
          </svg>
          <span className="absolute text-lg font-semibold tabular-nums">{display}</span>
        </div>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {health.factors.map((f) => (
          <li
            key={f.label}
            className="rounded-lg border border-border/50 bg-background/50 px-3 py-2"
          >
            <p className="text-[11px] text-muted-foreground">{f.label}</p>
            <p className="text-sm font-medium tabular-nums">
              {f.value}
              {f.placeholder ? (
                <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                  (placeholder)
                </span>
              ) : null}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
