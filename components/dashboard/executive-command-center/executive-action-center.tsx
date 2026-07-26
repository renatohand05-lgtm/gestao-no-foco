import Link from "next/link";

import { ExecutiveCommandEmptyState } from "@/components/dashboard/executive-command-center/executive-command-empty-state";
import { ExecutiveBadge, ExecutiveCard, ExecutiveSection } from "@/components/executive";
import {
  ECC_PRIORITY_LABEL,
  type EccActionItem,
} from "@/lib/executive-command-center";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  items: EccActionItem[];
};

function priorityTone(
  p: EccActionItem["priority"],
): "danger" | "warning" | "info" | "neutral" {
  if (p === "critical") return "danger";
  if (p === "high") return "warning";
  if (p === "medium") return "info";
  return "neutral";
}

export function ExecutiveActionCenter({ items }: Props) {
  return (
    <ExecutiveSection
      title="Action Center"
      description="Decisões pendentes · origem Decision Center"
      panel
      actions={
        items.length > 0 ? (
          <ExecutiveBadge tone="primary" variant="soft">
            {items.length} ação{items.length === 1 ? "" : "ões"}
          </ExecutiveBadge>
        ) : undefined
      }
      className="space-y-3"
    >
      {items.length === 0 ? (
        <ExecutiveCommandEmptyState
          title="Sem ações pendentes"
          description="Nenhuma decisão na fila executiva."
          className="py-6"
        />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <ExecutiveCard padding={16} className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <ExecutiveBadge
                    tone={priorityTone(item.priority)}
                    variant="soft"
                  >
                    {ECC_PRIORITY_LABEL[item.priority]}
                  </ExecutiveBadge>
                  <ExecutiveBadge tone="neutral" variant="outline">
                    {item.status}
                  </ExecutiveBadge>
                  <ExecutiveBadge tone="neutral" variant="outline">
                    {item.category}
                  </ExecutiveBadge>
                </div>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className={cn(gofTypography.subtitle, "text-sm")}>
                  {item.description}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  <span className={gofTypography.caption}>
                    Urgência {item.urgency}
                  </span>
                  <span className={gofTypography.caption}>
                    Confiança {item.confidence}
                  </span>
                  <span className={gofTypography.caption}>
                    Área {item.owner}
                  </span>
                </div>
                {item.financialImpactLabel ? (
                  <p className={cn(gofTypography.caption, "text-foreground")}>
                    Impacto: {item.financialImpactLabel}
                  </p>
                ) : null}
                <p className={gofTypography.caption}>Origem · {item.source}</p>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                  >
                    Executar
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
