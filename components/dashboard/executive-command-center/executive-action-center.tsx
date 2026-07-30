import Link from "next/link";

import { ExecutiveCommandEmptyState } from "@/components/dashboard/executive-command-center/executive-command-empty-state";
import { ExecutiveBadge, ExecutiveCard, ExecutiveSection } from "@/components/executive";
import {
  ECC_PRIORITY_LABEL,
  type EccActionItem,
  type EccActionStatus,
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

const STATUS_GROUPS: { key: EccActionStatus | "todas"; label: string }[] = [
  { key: "pendente", label: "Críticas / pendentes" },
  { key: "sugerida", label: "Hoje · sugeridas" },
  { key: "monitorar", label: "Próximas · monitorar" },
];

export function ExecutiveActionCenter({ items }: Props) {
  const byStatus = (status: EccActionStatus) =>
    items.filter((i) => i.status === status);

  return (
    <div data-premium-v257="action-center" className="premium-enter">
      <ExecutiveSection
        title="Action Center"
        description="Fila operacional · origem Decision Center · sem execução automática"
        panel
        className="space-y-3"
        actions={
          items.length > 0 ? (
            <ExecutiveBadge tone="primary" variant="soft">
              {items.length} ação{items.length === 1 ? "" : "ões"}
            </ExecutiveBadge>
          ) : undefined
        }
      >
        {items.length === 0 ? (
          <ExecutiveCommandEmptyState
            title="Sem ações pendentes"
            description="Nenhuma decisão na fila executiva."
            className="py-6"
          />
        ) : (
          <div className="space-y-4">
            {STATUS_GROUPS.map((group) => {
              const groupItems = byStatus(group.key as EccActionStatus);
              if (groupItems.length === 0) return null;
              return (
                <div key={group.key} className="space-y-2">
                  <p className={cn(gofTypography.caption, "font-medium")}>
                    {group.label} · {groupItems.length}
                  </p>
                  <ul className="space-y-2">
                    {groupItems.map((item) => (
                      <li key={item.id}>
                        <ExecutiveCard
                          padding={16}
                          className={cn(
                            "space-y-2 border border-[var(--border-subtle)] bg-[var(--surface-raised)] transition-[box-shadow,transform] duration-[var(--motion-fast)] ease-[var(--ease-premium)]",
                            "hover:shadow-[var(--shadow-card)] motion-safe:hover:-translate-y-px",
                            item.priority === "critical" &&
                              "border-destructive/40",
                          )}
                        >
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
                            <p
                              className={cn(
                                gofTypography.caption,
                                "tabular-nums text-foreground",
                              )}
                            >
                              Impacto: {item.financialImpactLabel}
                            </p>
                          ) : null}
                          <p className={gofTypography.caption}>
                            Origem · {item.source}
                          </p>
                          <div className="flex flex-wrap gap-3">
                            {item.href ? (
                              <Link
                                href={item.href}
                                className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                              >
                                Executar
                              </Link>
                            ) : (
                              <span className={gofTypography.caption}>
                                Executar indisponível
                              </span>
                            )}
                            <span className={gofTypography.caption}>
                              Adiar · manual
                            </span>
                            <span className={gofTypography.caption}>
                              Evidências · {item.source}
                            </span>
                          </div>
                        </ExecutiveCard>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </ExecutiveSection>
    </div>
  );
}
