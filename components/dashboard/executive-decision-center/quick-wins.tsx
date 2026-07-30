import { DecisionCard } from "@/components/dashboard/executive-decision-center/decision-card";
import { ExecutiveBadge, ExecutiveSection } from "@/components/executive";
import type { EdcDecision } from "@/lib/executive-decision-center";

type Props = {
  items: EdcDecision[];
};

export function QuickWins({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <div data-premium-v257="quick-wins" className="premium-enter">
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
        <ul className="grid gap-2 sm:grid-cols-2">
          {items.map((d) => (
            <li key={d.id}>
              <div className="rounded-xl border border-success/35">
                <DecisionCard decision={d} />
              </div>
            </li>
          ))}
        </ul>
      </ExecutiveSection>
    </div>
  );
}
