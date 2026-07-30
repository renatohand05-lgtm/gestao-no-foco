import { ExecutiveBadge, ExecutiveCard } from "@/components/executive";
import {
  EDC_EFFORT_LABEL,
  type EdcDecision,
  type EdcEffort,
} from "@/lib/executive-decision-center";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  decisions: EdcDecision[];
};

const EFFORT_X: Record<EdcEffort, number> = {
  baixo: 18,
  medio: 50,
  alto: 82,
};

/**
 * Matriz Impacto × Esforço — somente decisões com effort/impact da engine.
 */
export function ImpactEffortMatrix({ decisions }: Props) {
  const points = decisions.filter(
    (d) =>
      Number.isFinite(d.impact) &&
      (d.effort === "baixo" || d.effort === "medio" || d.effort === "alto"),
  );

  if (points.length === 0) {
    return (
      <ExecutiveCard
        padding={16}
        data-premium-v257="impact-effort-matrix"
        className="border border-[var(--border-subtle)] bg-[var(--surface-raised)]"
      >
        <p className={gofTypography.caption}>
          Matriz Impacto × Esforço indisponível — sem decisões com esforço
          confiável.
        </p>
      </ExecutiveCard>
    );
  }

  return (
    <div
      data-premium-v257="impact-effort-matrix"
      className="space-y-2 premium-enter"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className={cn(gofTypography.title, "text-sm")}>
          Impacto × Esforço
        </h3>
        <ExecutiveBadge tone="neutral" variant="outline">
          {points.length} ponto{points.length === 1 ? "" : "s"}
        </ExecutiveBadge>
      </div>
      <ExecutiveCard
        padding={16}
        className="border border-[var(--border-subtle)] bg-[var(--surface-raised)]"
      >
        <div
          className="relative mx-auto aspect-[4/3] w-full max-w-lg rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)]"
          role="img"
          aria-label="Matriz impacto versus esforço das decisões"
        >
          <span
            className={cn(
              gofTypography.caption,
              "absolute top-2 left-2 text-[10px]",
            )}
          >
            Alto impacto
          </span>
          <span
            className={cn(
              gofTypography.caption,
              "absolute bottom-2 left-2 text-[10px]",
            )}
          >
            Baixo impacto
          </span>
          <span
            className={cn(
              gofTypography.caption,
              "absolute right-2 bottom-2 text-[10px]",
            )}
          >
            Alto esforço
          </span>
          <div
            className="pointer-events-none absolute inset-x-8 top-1/2 h-px bg-[var(--border-subtle)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-y-8 left-1/2 w-px bg-[var(--border-subtle)]"
            aria-hidden
          />
          {points.map((d) => {
            const x = EFFORT_X[d.effort];
            const y = 100 - Math.min(100, Math.max(0, d.impact));
            return (
              <span
                key={d.id}
                title={`${d.title} · Impacto ${d.impact} · Esforço ${EDC_EFFORT_LABEL[d.effort]}`}
                className={cn(
                  "absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full",
                  d.quickWin
                    ? "bg-success ring-2 ring-success/30"
                    : d.priority === "critical"
                      ? "bg-destructive"
                      : "bg-[var(--brand-gold)]",
                )}
                style={{ left: `${x}%`, top: `${y}%` }}
              />
            );
          })}
        </div>
        <p className={cn(gofTypography.caption, "mt-2")}>
          Verde = quick win · vermelho = crítica · dourado = demais
        </p>
      </ExecutiveCard>
    </div>
  );
}
