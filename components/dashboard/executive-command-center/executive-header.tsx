import { ExecutiveBadge, ExecutiveCard } from "@/components/executive";
import type {
  EccExecutiveScore,
  EccKpiItem,
  EccMorningBrief,
  EccOpportunityItem,
  EccRiskItem,
} from "@/lib/executive-command-center";
import { gofTypography } from "@/lib/design-system";
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
  /** KPIs disponíveis (já filtrados) — faixa compacta do hero. */
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
 * Hero consolidado do Command Center (RC1).
 * Única superfície de destaque no topo · sem Hero paralelo.
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
  return (
    <header
      className="space-y-4"
      data-ecc-block="consolidated-hero"
      aria-label="Executive Command Center"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-1">
          <p className={gofTypography.caption}>Executive Command Center</p>
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl md:text-3xl break-words">
            <span className="block sm:inline">{greeting}</span>{" "}
            <span className="text-foreground">{tenantName}</span>
          </h2>
          <p className={cn(gofTypography.caption, "break-words")}>
            {dateLabel} · atualizado {updatedAtLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExecutiveBadge tone={scoreTone(score.value)} variant="soft">
            Score {score.value == null ? "—" : score.value}
          </ExecutiveBadge>
          <ExecutiveBadge tone="neutral" variant="outline">
            {score.healthLabel}
          </ExecutiveBadge>
          <ExecutiveBadge tone="neutral" variant="outline">
            Confiança {score.confidence}
          </ExecutiveBadge>
          {criticalDecisionsCount > 0 ? (
            <ExecutiveBadge tone="danger" variant="soft">
              {criticalDecisionsCount} crítica
              {criticalDecisionsCount === 1 ? "" : "s"}
            </ExecutiveBadge>
          ) : (
            <ExecutiveBadge tone="info" variant="outline">
              {pendingDecisionsCount} pendente
              {pendingDecisionsCount === 1 ? "" : "s"}
            </ExecutiveBadge>
          )}
        </div>
      </div>

      <ExecutiveCard padding={20} className="space-y-3">
        <p className={cn(gofTypography.caption, "uppercase tracking-[0.12em]")}>
          Morning Brief
        </p>
        <p className="text-base font-medium text-foreground sm:text-lg">
          {brief.greetingLine}
        </p>
        <div className="space-y-2">
          {brief.paragraphs.map((p, i) => (
            <p
              key={`brief-${i}`}
              className={cn(gofTypography.subtitle, "text-sm sm:text-[15px]")}
            >
              {p}
            </p>
          ))}
        </div>
        <p className={gofTypography.caption}>{summaryLine}</p>
      </ExecutiveCard>

      {highlightKpis.length > 0 ? (
        <div
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
          aria-label="KPIs em destaque"
        >
          {highlightKpis.slice(0, 4).map((kpi) => (
            <div
              key={kpi.key}
              className="min-w-0 rounded-xl border border-border/60 bg-[var(--brand-white)] px-3 py-2.5"
              title={kpi.hint ?? undefined}
            >
              <p className={cn(gofTypography.caption, "truncate")}>
                {kpi.label}
              </p>
              <p className="truncate text-sm font-semibold tabular-nums text-foreground sm:text-base">
                {kpi.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <ExecutiveCard padding={16} className="min-w-0 space-y-1.5">
          <p className={gofTypography.caption}>Principal risco</p>
          {topRisk ? (
            <>
              <p className="text-sm font-semibold text-foreground line-clamp-2">
                {topRisk.title}
              </p>
              <p className={cn(gofTypography.subtitle, "text-xs line-clamp-2")}>
                {topRisk.description}
              </p>
            </>
          ) : (
            <p className={gofTypography.caption}>Nenhum risco priorizado.</p>
          )}
        </ExecutiveCard>
        <ExecutiveCard padding={16} className="min-w-0 space-y-1.5">
          <p className={gofTypography.caption}>Principal oportunidade</p>
          {topOpportunity ? (
            <>
              <p className="text-sm font-semibold text-foreground line-clamp-2">
                {topOpportunity.title}
              </p>
              <p className={cn(gofTypography.subtitle, "text-xs line-clamp-2")}>
                {topOpportunity.description}
              </p>
            </>
          ) : (
            <p className={gofTypography.caption}>
              Nenhuma oportunidade evidenciada.
            </p>
          )}
        </ExecutiveCard>
      </div>
    </header>
  );
}
