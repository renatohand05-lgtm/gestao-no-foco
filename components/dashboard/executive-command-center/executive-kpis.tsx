import { MetricCard, ExecutiveSection } from "@/components/executive";
import {
  ECC_UNAVAILABLE_LABEL,
  type EccKpiItem,
} from "@/lib/executive-command-center";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  items: EccKpiItem[];
};

export function ExecutiveKpis({ items }: Props) {
  return (
    <ExecutiveSection
      title="KPIs executivos"
      description="Valores evidenciados no snapshot · DRE fora deste ciclo"
      panel
      className="space-y-3"
    >
      <div className="grid gap-2 grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 min-w-0">
        {items.map((kpi) => (
          <div key={kpi.key} className="min-w-0" title={kpi.hint ?? undefined}>
            <MetricCard
              label={kpi.label}
              value={
                kpi.available ? (
                  kpi.value
                ) : (
                  <span className="text-sm font-medium text-muted-foreground leading-snug">
                    {kpi.value === "Indisponível"
                      ? ECC_UNAVAILABLE_LABEL
                      : kpi.value}
                  </span>
                )
              }
              hint={kpi.hint ?? undefined}
              tone={kpi.tone}
              className="min-w-0"
            />
            {!kpi.available && kpi.hint ? (
              <p className={cn(gofTypography.caption, "mt-1 px-1 line-clamp-2")}>
                {kpi.hint}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </ExecutiveSection>
  );
}
