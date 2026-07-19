import {
  ExecutiveBadge,
  ExecutiveCard,
  ExecutiveProgress,
} from "@/components/executive";
import { exAnimations, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { ExecutiveHealthResult } from "@/lib/intelligence/types";

const STATUS_LABEL: Record<ExecutiveHealthResult["status"], string> = {
  critica: "Crítica",
  atencao: "Atenção",
  saudavel: "Saudável",
  excelente: "Excelente",
  sem_meta: "Sem meta",
  informativo: "Informativo",
};

type Props = {
  health: ExecutiveHealthResult;
};

export function ExecutiveHealthBar({ health }: Props) {
  return (
    <ExecutiveCard
      padding={24}
      className={cn("h-full", exAnimations.slide)}
      aria-label={`Saúde comercial: ${STATUS_LABEL[health.status]}`}
    >
      <p className={exTypography.label}>Saúde comercial</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className={cn(exTypography.kpiPrimary, "leading-none")}>
          {health.percentage === null ? "—" : `${health.percentage}%`}
        </p>
        <ExecutiveBadge tone={health.tone}>
          {STATUS_LABEL[health.status]}
        </ExecutiveBadge>
      </div>
      <p className={cn("mt-3", exTypography.caption)}>{health.reason}</p>
      {health.percentage !== null ? (
        <ExecutiveProgress
          value={health.percentage}
          tone={
            health.tone === "neutral" || health.tone === "info"
              ? "primary"
              : health.tone
          }
          showValue={false}
          size="lg"
          className="mt-4"
          label="Saúde"
        />
      ) : null}
      {health.supportingMetrics.length > 0 ? (
        <dl className="mt-4 grid grid-cols-3 gap-2">
          {health.supportingMetrics.map((m) => (
            <div key={m.label}>
              <dt className={exTypography.label}>{m.label}</dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums">
                {m.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </ExecutiveCard>
  );
}
