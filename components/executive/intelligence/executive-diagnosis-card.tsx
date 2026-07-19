import { ExecutiveBadge, ExecutiveCard } from "@/components/executive";
import { exAnimations, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { ExecutiveDiagnosisResult } from "@/lib/intelligence/types";

type Props = {
  diagnosis: ExecutiveDiagnosisResult;
};

export function ExecutiveDiagnosisCard({ diagnosis }: Props) {
  return (
    <ExecutiveCard
      padding={24}
      className={cn("h-full", exAnimations.slide)}
      aria-label="Diagnóstico executivo"
    >
      <p className={exTypography.label}>Diagnóstico</p>
      <p className="mt-3 text-base font-semibold tracking-tight">
        {diagnosis.summary}
      </p>
      <ul className="mt-4 space-y-2">
        {diagnosis.findings.map((f) => (
          <li
            key={f.label}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span className="text-muted-foreground">{f.label}</span>
            <ExecutiveBadge
              tone={f.tone}
              className="font-normal normal-case tracking-normal"
            >
              {f.value}
            </ExecutiveBadge>
          </li>
        ))}
      </ul>
      <p className={cn("mt-4", exTypography.caption)}>
        <span className="font-medium text-foreground">Causa principal:</span>{" "}
        {diagnosis.primaryCause}
      </p>
      <p className={cn("mt-2", exTypography.caption)}>
        <span className="font-medium text-foreground">Conclusão:</span>{" "}
        {diagnosis.conclusion}
      </p>
    </ExecutiveCard>
  );
}
