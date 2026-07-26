import Link from "next/link";

import { ExecutiveCommandEmptyState } from "@/components/dashboard/executive-command-center/executive-command-empty-state";
import { ExecutiveBadge, ExecutiveCard, ExecutiveSection } from "@/components/executive";
import {
  ECC_ALERT_KIND_LABEL,
  ECC_PRIORITY_LABEL,
  type EccAlertItem,
  type EccAlertKind,
} from "@/lib/executive-command-center";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

const KIND_ORDER: EccAlertKind[] = [
  "critical",
  "finance",
  "operations",
  "commercial",
  "inventory",
];

type Props = {
  items: EccAlertItem[];
};

export function ExecutiveAlertCenter({ items }: Props) {
  const grouped = KIND_ORDER.map((kind) => ({
    kind,
    items: items.filter((a) => a.kind === kind),
  })).filter((g) => g.items.length > 0);

  return (
    <ExecutiveSection
      title="Alert Center"
      description="Críticos · financeiros · operacionais · comerciais · estoque"
      panel
      actions={
        items.length > 0 ? (
          <ExecutiveBadge tone="danger" variant="soft">
            {items.length} alerta{items.length === 1 ? "" : "s"}
          </ExecutiveBadge>
        ) : undefined
      }
      className="space-y-4"
    >
      {grouped.length === 0 ? (
        <ExecutiveCommandEmptyState
          title="Sem alertas"
          description="Nenhum alerta crítico derivado do snapshot."
          className="py-6"
        />
      ) : (
        grouped.map((group) => (
          <div key={group.kind} className="space-y-2">
            <p className={cn(gofTypography.caption, "font-medium")}>
              {ECC_ALERT_KIND_LABEL[group.kind]}
            </p>
            <ul className="space-y-2">
              {group.items.map((item) => (
                <li key={item.id}>
                  <ExecutiveCard padding={12} className="space-y-1.5">
                    <div className="flex flex-wrap gap-2">
                      <ExecutiveBadge
                        tone={
                          item.priority === "critical" ? "danger" : "warning"
                        }
                        variant="soft"
                      >
                        {ECC_PRIORITY_LABEL[item.priority]}
                      </ExecutiveBadge>
                    </div>
                    <p className="text-sm font-semibold">{item.title}</p>
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
            </ul>
          </div>
        ))
      )}
    </ExecutiveSection>
  );
}
