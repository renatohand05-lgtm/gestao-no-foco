import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileStack,
  HelpCircle,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { MetricCard } from "@/components/executive";
import { ExecutiveBadge } from "@/components/executive/ExecutiveBadge";
import { cn } from "@/lib/utils";
import type { IntelligenceKpi } from "./intelligence-presentation";

const ICONS: Record<string, LucideIcon> = {
  total: FileStack,
  completed: CheckCircle2,
  errors: AlertTriangle,
  pending: Clock3,
  avgDuration: Clock3,
  processedRows: Activity,
  autoClassify: Sparkles,
  qualityScore: Sparkles,
};

type Props = {
  kpis: IntelligenceKpi[];
  className?: string;
};

/**
 * Painel executivo de KPIs da Central de Inteligência (Sprint 22.6.1).
 * Placeholders claramente identificados quando o dado ainda não existe na engine.
 */
export function IntelligenceKpiPanel({ kpis, className }: Props) {
  return (
    <section
      aria-label="Indicadores executivos de importação"
      className={cn(
        "grid gap-3 sm:grid-cols-2 xl:grid-cols-4",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500",
        className,
      )}
    >
      {kpis.map((kpi) => (
        <div key={kpi.key} className="relative min-w-0">
          <MetricCard
            label={kpi.label}
            value={kpi.value}
            hint={kpi.hint}
            tone={kpi.tone ?? "neutral"}
            icon={ICONS[kpi.key] ?? HelpCircle}
          />
          {kpi.placeholder ? (
            <div className="pointer-events-none absolute right-2 top-2">
              <ExecutiveBadge tone="neutral" variant="outline">
                Placeholder
              </ExecutiveBadge>
            </div>
          ) : null}
        </div>
      ))}
    </section>
  );
}
