import { ExecutiveBadge, ExecutiveCard } from "@/components/executive";
import {
  EDC_CONFIDENCE_LABEL,
  type EdcSimulation,
} from "@/lib/executive-decision-center";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  simulation: EdcSimulation;
};

export function SimulationCard({ simulation }: Props) {
  return (
    <div
      data-sim-kind={simulation.kind}
      data-sim-available={simulation.available ? "1" : "0"}
      className="h-full"
    >
    <ExecutiveCard
      padding={16}
      className={cn(
        "space-y-2 h-full",
        !simulation.available && "opacity-80",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ExecutiveBadge
          tone={simulation.available ? "info" : "neutral"}
          variant="soft"
        >
          E se?
        </ExecutiveBadge>
        <ExecutiveBadge tone="neutral" variant="outline">
          Confiança {EDC_CONFIDENCE_LABEL[simulation.confidence]}
        </ExecutiveBadge>
      </div>

      <p className="text-sm font-semibold text-foreground">{simulation.title}</p>
      <p className={cn(gofTypography.subtitle, "text-sm")}>
        {simulation.description}
      </p>

      {simulation.available ? (
        <dl className="grid gap-1 text-xs">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{simulation.baselineLabel}</dt>
            <dd className="font-medium tabular-nums">{simulation.baselineValue}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{simulation.projectedLabel}</dt>
            <dd className="font-medium tabular-nums">{simulation.projectedValue}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Delta</dt>
            <dd className="font-semibold tabular-nums text-foreground">
              {simulation.deltaLabel}
            </dd>
          </div>
        </dl>
      ) : (
        <p className={gofTypography.caption}>
          {simulation.unavailableReason ?? "Simulação indisponível."}
        </p>
      )}

      {simulation.evidence.length > 0 ? (
        <ul className="space-y-0.5 border-t border-border/50 pt-2">
          {simulation.evidence.map((ev) => (
            <li key={ev.id} className={gofTypography.caption}>
              {ev.label}: {ev.value}
            </li>
          ))}
        </ul>
      ) : null}
    </ExecutiveCard>
    </div>
  );
}
