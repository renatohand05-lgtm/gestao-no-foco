import { DecisionCard } from "@/components/dashboard/executive-decision-center/decision-card";
import { ExecutiveBadge, ExecutiveSection } from "@/components/executive";
import type { EdcDecision } from "@/lib/executive-decision-center";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  items: EdcDecision[];
};

export function QuickWins({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <ExecutiveSection
      title="Quick Wins"
      description="Baixo esforço · alto impacto · confiança útil"
      panel
      actions={
        <ExecutiveBadge tone="success" variant="soft">
          {items.length} ação{items.length === 1 ? "" : "ões"}
        </ExecutiveBadge>
      }
      className="space-y-3"
    >
      <p className={cn(gofTypography.caption)}>
        Priorize estas ações para ganho rápido com evidência no snapshot.
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((d) => (
          <li key={d.id}>
            <DecisionCard decision={d} />
          </li>
        ))}
      </ul>
    </ExecutiveSection>
  );
}
