import Link from "next/link";

import { ExecutiveCommandEmptyState } from "@/components/dashboard/executive-command-center/executive-command-empty-state";
import { ExecutiveBadge, ExecutiveCard, ExecutiveSection } from "@/components/executive";
import {
  ECC_PRIORITY_LABEL,
  type EccPriorityItem,
} from "@/lib/executive-command-center";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

function tone(
  p: EccPriorityItem["priority"],
): "danger" | "warning" | "info" | "neutral" {
  if (p === "critical") return "danger";
  if (p === "high") return "warning";
  if (p === "medium") return "info";
  return "neutral";
}

type Props = {
  items: EccPriorityItem[];
};

export function ExecutivePriorityList({ items }: Props) {
  return (
    <ExecutiveSection
      title="Top prioridades"
      description="Até 5 · fila Decision Center + Intelligence Center"
      panel
      className="space-y-3"
    >
      {items.length === 0 ? (
        <ExecutiveCommandEmptyState
          title="Sem prioridades"
          description="Nenhuma prioridade evidenciada no snapshot."
          className="py-6"
        />
      ) : (
        <ol className="space-y-2">
          {items.map((item, idx) => (
            <li key={item.id}>
              <ExecutiveCard padding={16} className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <ExecutiveBadge tone="primary" variant="soft">
                    #{idx + 1}
                  </ExecutiveBadge>
                  <ExecutiveBadge tone={tone(item.priority)} variant="soft">
                    {ECC_PRIORITY_LABEL[item.priority]}
                  </ExecutiveBadge>
                  <ExecutiveBadge tone="neutral" variant="outline">
                    Impacto {item.impact}
                  </ExecutiveBadge>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {item.title}
                </p>
                <p className={cn(gofTypography.subtitle, "text-sm")}>
                  {item.description}
                </p>
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
        </ol>
      )}
    </ExecutiveSection>
  );
}
