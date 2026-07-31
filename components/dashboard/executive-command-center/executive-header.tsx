import Link from "next/link";
import { ExecutiveBadge, ExecutiveCard } from "@/components/executive";
import { GFButton } from "@/components/gf/gf-button";
import { GFStatusPill } from "@/components/gf/gf-status-pill";
import type {
  EccExecutiveScore,
  EccKpiItem,
  EccMorningBrief,
  EccOpportunityItem,
  EccRiskItem,
} from "@/lib/executive-command-center";
import { gfType } from "@/lib/design-system/signature";
import { cn } from "@/lib/utils";

type Props = {
  greeting: string;
  tenantName: string;
  dateLabel: string;
  updatedAtLabel: string;
  score: EccExecutiveScore;
  brief: EccMorningBrief;
  summaryLine: string;
  criticalDecisionsCount: number;
  pendingDecisionsCount: number;
  highlightKpis: EccKpiItem[];
  topRisk: EccRiskItem | null;
  topOpportunity: EccOpportunityItem | null;
};

function scoreTone(
  value: number | null,
): "success" | "warning" | "danger" | "neutral" {
  if (value == null) return "neutral";
  if (value >= 80) return "success";
  if (value >= 65) return "warning";
  return "danger";
}

/**
 * Hero cinematográfico do Command Center (Sprint 26.2).
 * Leitura de ~5 segundos — sem blocos longos.
 */
export function ExecutiveHeader({
  greeting,
  tenantName,
  dateLabel,
  updatedAtLabel,
  score,
  brief,
  summaryLine,
  criticalDecisionsCount,
  pendingDecisionsCount,
  highlightKpis,
  topRisk,
  topOpportunity,
}: Props) {
  const lines = brief.paragraphs.slice(0, 3);

  return (
    <header
      className="space-y-3"
      data-ecc-block="consolidated-hero"
      data-ecc-cinematic="1"
      data-sprint="26.2"
      aria-label="Executive Command Center"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-1">
          <p className={gfType.overline}>Command Center</p>
          <h2 className={cn(gfType.pageTitle, "break-words")}>
            {greeting}
          </h2>
          <p className={cn(gfType.caption, "break-words")}>
            {tenantName} · {dateLabel} · {updatedAtLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <GFStatusPill tone={scoreTone(score.value)}>
            Score {score.value == null ? "—" : score.value}
          </GFStatusPill>
          <GFStatusPill tone="neutral">{score.healthLabel}</GFStatusPill>
          {criticalDecisionsCount > 0 ? (
            <GFStatusPill tone="danger">
              {criticalDecisionsCount} crítica
              {criticalDecisionsCount === 1 ? "" : "s"}
            </GFStatusPill>
          ) : (
            <GFStatusPill tone="info">
              {pendingDecisionsCount} pendente
              {pendingDecisionsCount === 1 ? "" : "s"}
            </GFStatusPill>
          )}
        </div>
      </div>

      <ExecutiveCard
        padding={16}
        className="space-y-2 border border-[var(--border)] bg-[var(--card)]"
      >
        <ul className="space-y-1.5">
          {lines.map((p, i) => (
            <li
              key={`brief-${i}`}
              className={cn(gfType.body, "text-[var(--text-primary)]")}
            >
              {p}
            </li>
          ))}
        </ul>
        <p className={gfType.caption}>{summaryLine}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {topRisk?.href ? (
            <GFButton
              size="sm"
              variant="default"
              render={<Link href={topRisk.href} />}
              nativeButton={false}
            >
              {topRisk.title}
            </GFButton>
          ) : null}
          {topOpportunity?.href ? (
            <GFButton
              size="sm"
              variant="outline"
              render={<Link href={topOpportunity.href} />}
              nativeButton={false}
            >
              Ver oportunidades
            </GFButton>
          ) : null}
          <ExecutiveBadge tone="neutral" variant="outline">
            {highlightKpis.length} KPI
            {highlightKpis.length === 1 ? "" : "s"}
          </ExecutiveBadge>
        </div>
      </ExecutiveCard>
    </header>
  );
}
