import Link from "next/link";

import { ExecutiveCommandEmptyState } from "@/components/dashboard/executive-command-center/executive-command-empty-state";
import { ExecutiveBadge, ExecutiveCard, ExecutiveSection } from "@/components/executive";
import {
  ECC_PRIORITY_LABEL,
  type EccRiskItem,
} from "@/lib/executive-command-center";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  items: EccRiskItem[];
};

export function ExecutiveRiskPanel({ items }: Props) {
  return (
    <ExecutiveSection
      title="Riscos"
      description="Top 5 com evidência"
      panel
      className="space-y-3"
    >
      {items.length === 0 ? (
        <ExecutiveCommandEmptyState
          title="Sem riscos críticos"
          description="Nenhum risco priorizado no momento."
          className="py-6"
        />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <ExecutiveCard padding={16} className="space-y-2" accent="danger">
                <div className="flex flex-wrap gap-2">
                  <ExecutiveBadge
                    tone={
                      item.priority === "critical" ? "danger" : "warning"
                    }
                    variant="soft"
                  >
                    {ECC_PRIORITY_LABEL[item.priority]}
                  </ExecutiveBadge>
                  <ExecutiveBadge tone="neutral" variant="outline">
                    {item.category}
                  </ExecutiveBadge>
                </div>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className={cn(gofTypography.subtitle, "text-sm")}>
                  {item.description}
                </p>
                {item.impactLabel ? (
                  <p className={gofTypography.caption}>{item.impactLabel}</p>
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
