import Link from "next/link";

import { ExecutiveCommandEmptyState } from "@/components/dashboard/executive-command-center/executive-command-empty-state";
import { ExecutiveBadge, ExecutiveCard, ExecutiveSection } from "@/components/executive";
import {
  ECC_OPPORTUNITY_KIND_LABEL,
  type EccOpportunityItem,
} from "@/lib/executive-command-center";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  items: EccOpportunityItem[];
  quickWins: EccOpportunityItem[];
};

export function ExecutiveOpportunityPanel({ items, quickWins }: Props) {
  return (
    <ExecutiveSection
      title="Oportunidades"
      description="Ganhos rápidos · economias · receitas · redução de perdas"
      panel
      actions={
        quickWins.length > 0 ? (
          <ExecutiveBadge tone="success" variant="soft">
            {quickWins.length} quick win{quickWins.length === 1 ? "" : "s"}
          </ExecutiveBadge>
        ) : undefined
      }
      className="space-y-3"
    >
      {items.length === 0 ? (
        <ExecutiveCommandEmptyState
          title="Sem oportunidades"
          description="Nenhum ganho potencial evidenciado."
          className="py-6"
        />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <ExecutiveCard
                padding={16}
                className="space-y-2"
                accent={item.kind === "quick_win" ? "success" : "none"}
              >
                <div className="flex flex-wrap gap-2">
                  <ExecutiveBadge
                    tone={item.kind === "quick_win" ? "success" : "info"}
                    variant="soft"
                  >
                    {ECC_OPPORTUNITY_KIND_LABEL[item.kind]}
                  </ExecutiveBadge>
                </div>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className={cn(gofTypography.subtitle, "text-sm")}>
                  {item.description}
                </p>
                {item.potentialGainLabel ? (
                  <p className={cn(gofTypography.caption, "text-foreground")}>
                    {item.potentialGainLabel}
                  </p>
                ) : null}
                {item.href ? (
                  <Link
                    href={item.href}
                    className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                  >
                    Abrir
                  </Link>
                ) : null}
              </ExecutiveCard>
            </li>
          ))}
        </ul>
      )}
    </ExecutiveSection>
  );
}
