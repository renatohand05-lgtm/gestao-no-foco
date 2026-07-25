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
  MetricCard,
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

function ModuleScoreCard({ mod }: { mod: BusinessHealthModuleResult }) {
  return (
    <MetricCard
      label={mod.label}
      value={mod.score == null ? "Indisponível" : String(mod.score)}
      hint={mod.statusLabel}
      tone={statusTone(mod.status)}
    />
  );
}

type Props = {
  ai: ExecutiveAiResult;
  /** Opcional — permite injetar resultado já composto (testes/story). */
  data?: BusinessHealthResult;
};

/**
 * Seção Business Health — abaixo do Executive Score (Gate 20.2).
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
      className={cn("space-y-4", gofMotion.fade)}
    >
      <ExecutiveSection
        title="Business Health"
        description="Leitura determinística da saúde da empresa — indicadores já existentes, sem inventar métricas."
        panel
        actions={
          <ExecutiveBadge tone="neutral" variant="outline">
            Engine {data.engineVersion}
          </ExecutiveBadge>
        }
        className="space-y-4"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <ExecutiveCard padding={20} className="space-y-3">
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

          <ExecutiveCard padding={20} className="space-y-3">
            <p className={gofTypography.caption}>Prioridade nº 1</p>
            <BusinessHealthPriority priority={priority} />
          </ExecutiveCard>
        </div>

        <div>
          <p className={cn(gofTypography.caption, "mb-2")}>Scores por domínio</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <ModuleScoreCard mod={data.finance} />
            <ModuleScoreCard mod={data.commercial} />
            <ModuleScoreCard mod={data.operation} />
            <ModuleScoreCard mod={data.crm} />
            <ModuleScoreCard mod={data.inventory} />
          </div>
        </div>

        <div>
          <p className={cn(gofTypography.caption, "mb-2")}>Principais motivos</p>
          <BusinessHealthReason items={topReasons} />
        </div>
      </ExecutiveSection>
    </div>
  );
}
