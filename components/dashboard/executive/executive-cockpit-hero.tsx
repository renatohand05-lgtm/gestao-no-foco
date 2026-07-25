import {
  ExecutiveBadge,
  ExecutivePanel,
  MetricCard,
} from "@/components/executive";
import { DashboardRefreshButton } from "@/components/dashboard/dashboard-refresh-button";
import {
  EXECUTIVE_AI_HEALTH_LABEL,
  formatExecutiveConfidence,
  formatExecutiveScore,
} from "@/lib/ai/executive-ai-summary";
import type { ExecutiveAiHealth } from "@/lib/ai/executive-ai-types";
import { gofGrid, gofMotion, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

export type ExecutiveCockpitHeroProps = {
  greeting: string;
  tenantName: string;
  dateLabel: string;
  updatedAtLabel: string;
  score: number | null;
  health: ExecutiveAiHealth;
  confidence: number;
  partial: boolean;
  summaryLine: string;
  priorityTitle: string;
  priorityReason: string;
  priorityHref?: string;
};

function healthTone(
  health: ExecutiveAiHealth,
): "success" | "warning" | "danger" | "neutral" | "info" {
  if (health === "excelente") return "success";
  if (health === "saudavel") return "info";
  if (health === "atencao") return "warning";
  if (health === "critico") return "danger";
  return "neutral";
}

/**
 * Hero Executivo Premium — ponto focal do cockpit (Gate 20.1.1).
 * Somente apresentação · dados já carregados · sem fetch.
 */
export function ExecutiveCockpitHero({
  greeting,
  tenantName,
  dateLabel,
  updatedAtLabel,
  score,
  health,
  confidence,
  partial,
  summaryLine,
  priorityTitle,
  priorityReason,
  priorityHref,
}: ExecutiveCockpitHeroProps) {
  return (
    <div
      data-dashboard-block="executive-cockpit-hero"
      className={gofMotion.slide}
      aria-labelledby="executive-cockpit-hero-title"
    >
    <ExecutivePanel
      className="border-[var(--brand-gold)]/25 bg-gradient-to-br from-[var(--brand-white)] via-[var(--brand-white)] to-[var(--brand-gold)]/[0.06]"
    >
      <div className="space-y-5 p-1 sm:p-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <p
              id="executive-cockpit-hero-title"
              className={cn(gofTypography.title, "text-xl sm:text-2xl")}
            >
              {greeting}
            </p>
            <p className={gofTypography.subtitle}>
              {tenantName}
              <span className="text-muted-foreground"> · </span>
              <span className="capitalize">{dateLabel}</span>
            </p>
            <p className={cn(gofTypography.caption, "max-w-2xl")}>
              {summaryLine}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <div className="flex flex-wrap gap-2">
              <ExecutiveBadge tone={healthTone(health)} variant="soft">
                {EXECUTIVE_AI_HEALTH_LABEL[health]}
              </ExecutiveBadge>
              {partial ? (
                <ExecutiveBadge tone="warning" variant="outline">
                  Cobertura parcial
                </ExecutiveBadge>
              ) : (
                <ExecutiveBadge tone="neutral" variant="outline">
                  Decision Engine
                </ExecutiveBadge>
              )}
            </div>
            <DashboardRefreshButton updatedAtLabel={updatedAtLabel} />
          </div>
        </div>

        <div className={gofGrid.threeCol}>
          <MetricCard
            label="Executive Score"
            value={formatExecutiveScore(score)}
            hint="0–100 · estado da empresa"
            tone={healthTone(health)}
            emphasize
          />
          <MetricCard
            label="Saúde geral"
            value={EXECUTIVE_AI_HEALTH_LABEL[health]}
            hint={formatExecutiveConfidence(confidence)}
            tone={healthTone(health)}
          />
          <MetricCard
            label="Prioridade do dia"
            value={priorityTitle}
            hint={priorityReason}
            tone="primary"
          />
        </div>

        {priorityHref ? (
          <p className={gofTypography.caption}>
            <a
              href={priorityHref}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Abrir ação prioritária
            </a>
          </p>
        ) : null}
      </div>
    </ExecutivePanel>
    </div>
  );
}
