import {
  BusinessHealthConfidence,
} from "@/components/dashboard/business-health/business-health-confidence";
import {
  BusinessHealthPriority,
} from "@/components/dashboard/business-health/business-health-priority";
import {
  BusinessHealthReason,
} from "@/components/dashboard/business-health/business-health-reason";
import {
  BusinessHealthScore,
} from "@/components/dashboard/business-health/business-health-score";
import {
  ExecutiveBadge,
  ExecutiveCard,
  ExecutiveSection,
} from "@/components/executive";
import {
  BusinessHealthEngine,
  type BusinessHealthModuleResult,
  type BusinessHealthResult,
  type BusinessHealthStatus,
} from "@/lib/dashboard/business-health-engine";
import type { ExecutiveAiResult } from "@/lib/ai/executive-ai-types";
import { gofMotion, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

function statusTone(
  status: BusinessHealthStatus,
): "success" | "info" | "warning" | "danger" | "neutral" {
  if (status === "excelente") return "success";
  if (status === "saudavel") return "info";
  if (status === "atencao") return "warning";
  if (status === "critico") return "danger";
  return "neutral";
}

function ModuleScoreRow({ mod }: { mod: BusinessHealthModuleResult }) {
  const score = mod.score;
  const pct = score == null ? 0 : Math.min(100, Math.max(0, score));
  return (
    <div
      data-health-domain={mod.key}
      className="space-y-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <p className={cn(gofTypography.caption, "text-foreground")}>
          {mod.label}
        </p>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {score == null ? "—" : score}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-base)]"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score ?? undefined}
        aria-label={`Score ${mod.label}`}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-[var(--motion-normal)] ease-[var(--ease-premium)]",
            statusTone(mod.status) === "danger" && "bg-destructive",
            statusTone(mod.status) === "warning" && "bg-warning",
            statusTone(mod.status) === "success" && "bg-success",
            statusTone(mod.status) === "info" && "bg-[var(--brand-gold)]",
            statusTone(mod.status) === "neutral" && "bg-muted-foreground/40",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={gofTypography.caption}>{mod.statusLabel}</p>
    </div>
  );
}

type Props = {
  ai: ExecutiveAiResult;
  /** Opcional — permite injetar resultado já composto (testes/story). */
  data?: BusinessHealthResult;
};

/**
 * Seção Business Health — leitura visual densa (Sprint 25.7).
 * Somente interpretação determinística dos indicadores existentes.
 */
export function BusinessHealthCard({ ai, data: dataProp }: Props) {
  const data = dataProp ?? BusinessHealthEngine.run(ai);
  const topReasons = [
    data.finance.motivos[0],
    data.commercial.motivos[0],
    data.operation.motivos[0],
    data.crm.motivos[0],
    data.inventory.motivos[0],
  ].filter((item): item is NonNullable<typeof item> => item != null);
  const priority = data.priorities[0] ?? null;

  return (
    <div
      data-dashboard-block="business-health"
      data-business-health-engine={data.engineVersion}
      data-premium-v257="business-health"
      className={cn("space-y-4 premium-enter", gofMotion.fade)}
    >
      <ExecutiveSection
        title="Business Health"
        description="Saúde da empresa · indicadores existentes · sem métricas inventadas."
        panel
        actions={
          <ExecutiveBadge tone="neutral" variant="outline">
            Engine {data.engineVersion}
          </ExecutiveBadge>
        }
        className="space-y-4"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <ExecutiveCard
            padding={20}
            className="space-y-3 border border-[var(--border-premium)] bg-[var(--surface-raised)]"
          >
            <p className={gofTypography.caption}>Score geral</p>
            <BusinessHealthScore
              score={data.overallScore}
              status={data.overallStatus}
              emphasize
            />
            <BusinessHealthConfidence
              level={data.confidence}
              coveragePct={data.coveragePct}
              modulesAvailable={data.modulesAvailable}
            />
          </ExecutiveCard>

          <ExecutiveCard
            padding={20}
            className="space-y-3 border border-[var(--border-subtle)] bg-[var(--surface-raised)]"
          >
            <p className={gofTypography.caption}>Prioridade nº 1</p>
            <BusinessHealthPriority priority={priority} />
          </ExecutiveCard>
        </div>

        <div>
          <p className={cn(gofTypography.caption, "mb-2")}>Scores por domínio</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <ModuleScoreRow mod={data.finance} />
            <ModuleScoreRow mod={data.commercial} />
            <ModuleScoreRow mod={data.operation} />
            <ModuleScoreRow mod={data.crm} />
            <ModuleScoreRow mod={data.inventory} />
          </div>
        </div>

        <details className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] open:shadow-[var(--shadow-card)]">
          <summary
            className={cn(
              gofTypography.caption,
              "cursor-pointer px-3 py-2.5 font-medium text-foreground",
            )}
          >
            Ver diagnóstico · principais motivos
          </summary>
          <div className="border-t border-[var(--border-subtle)] px-3 py-3">
            <BusinessHealthReason items={topReasons} />
          </div>
        </details>
      </ExecutiveSection>
    </div>
  );
}
