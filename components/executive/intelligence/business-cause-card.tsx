import { ExecutiveCard } from "@/components/executive";
import {
  ExecutiveConfidence,
  ExecutiveDisclosure,
  ExecutiveEvidence,
} from "@/components/executive/presentation";
import { exAnimations, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { BusinessCause } from "@/lib/business-intelligence";

type Props = {
  cause: BusinessCause;
};

export function BusinessCauseCard({ cause }: Props) {
  return (
    <ExecutiveCard
      padding={24}
      className={cn("h-full", exAnimations.slide)}
      aria-label="Principal causa"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className={exTypography.label}>Principal causa</p>
        <ExecutiveConfidence level={cause.confidence} />
      </div>
      <p className={cn("mt-3", exTypography.title)}>{cause.title}</p>
      <ExecutiveEvidence
        className="mt-2"
        label="Por que importa"
        value={cause.description}
      />
      {cause.supportingMetrics.length > 0 ? (
        <ExecutiveDisclosure summary="Métricas de suporte" className="mt-3">
          <ul className="grid gap-2 sm:grid-cols-2">
            {cause.supportingMetrics.map((m) => (
              <li
                key={m.label}
                className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground">{m.label}</span>
                <span className="font-medium tabular-nums">{m.value}</span>
              </li>
            ))}
          </ul>
        </ExecutiveDisclosure>
      ) : null}
    </ExecutiveCard>
  );
}
