import Link from "next/link";
import {
  Package,
  ShoppingCart,
  UserPlus,
  Wallet,
  Warehouse,
  Wrench,
} from "lucide-react";

import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { DsIconBox } from "@/components/ui/ds-icon";
import {
  dsMotion,
  dsRadius,
  dsSpace,
  dsStatus,
  dsType,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { ActivityItem, ActivityKind } from "@/types/intelligence";

const KIND_ICON: Record<ActivityKind, typeof ShoppingCart> = {
  venda_faturada: ShoppingCart,
  recebimento: Wallet,
  pagamento: Wallet,
  cliente_cadastrado: UserPlus,
  produto_cadastrado: Package,
  estoque_movimentacao: Warehouse,
};

type ActivityGroup =
  | "Financeiro"
  | "Vendas"
  | "Clientes"
  | "Estoque"
  | "Ordens";

const KIND_GROUP: Record<ActivityKind, ActivityGroup> = {
  venda_faturada: "Vendas",
  recebimento: "Financeiro",
  pagamento: "Financeiro",
  cliente_cadastrado: "Clientes",
  produto_cadastrado: "Estoque",
  estoque_movimentacao: "Estoque",
};

const GROUP_TONE: Record<ActivityGroup, string> = {
  Financeiro: dsStatus.info.soft,
  Vendas: dsStatus.success.soft,
  Clientes: dsStatus.warning.soft,
  Estoque: dsStatus.neutral.soft,
  Ordens: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
};

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function dayKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function dayLabel(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (value === iso(today)) return "Hoje";
  if (value === iso(yesterday)) return "Ontem";
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(date);
}

function groupActivities(activities: ActivityItem[]) {
  const map = new Map<string, ActivityItem[]>();
  for (const activity of activities) {
    const key = dayKey(activity.occurredAt);
    const list = map.get(key) ?? [];
    list.push(activity);
    map.set(key, list);
  }
  return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

type Props = {
  activities: ActivityItem[];
};

export function DashboardActivities({ activities }: Props) {
  if (activities.length === 0) {
    return (
      <DashboardSection
        title="Atividades recentes"
        description="Timeline com eventos reais do tenant"
      >
        <DashboardEmptyState
          className="border-0 bg-transparent py-8"
          title="Sem atividades recentes"
          description="Assim que houver vendas, baixas ou cadastros, eles aparecem aqui."
        />
      </DashboardSection>
    );
  }

  const grouped = groupActivities(activities);

  return (
    <DashboardSection
      title="Atividades recentes"
      description="Timeline agrupada por dia e categoria"
      className={dsMotion.fadeUp}
    >
      <div className={dsSpace.section}>
        {grouped.map(([day, items]) => (
          <div key={day} className={dsSpace.stackLg}>
            <div className="sticky top-0 z-10 flex items-center gap-2 bg-card/90 py-1 backdrop-blur-sm">
              <span
                className={cn(
                  "px-2.5 py-1 font-medium capitalize",
                  dsRadius.badge,
                  dsType.caption,
                  dsStatus.neutral.soft,
                )}
              >
                {dayLabel(day)}
              </span>
              <span className={dsType.legend}>
                {items.length} evento{items.length === 1 ? "" : "s"}
              </span>
            </div>

            <ul className={cn("relative", dsSpace.stackLg)}>
              <div
                className="absolute bottom-3 left-5 top-3 w-px bg-border/70"
                aria-hidden
              />
              {items.map((activity) => {
                const Icon = KIND_ICON[activity.kind] ?? Wrench;
                const group = KIND_GROUP[activity.kind] ?? "Ordens";
                return (
                  <li key={activity.id} className="relative flex gap-3 pl-1">
                    <DsIconBox icon={Icon} variant="timeline" iconSize="md" />
                    <div className="min-w-0 flex-1 pb-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <Link
                            href={activity.href}
                            className="truncate font-medium hover:underline"
                          >
                            {activity.title}
                          </Link>
                          <span
                            className={cn(
                              "px-2 py-0.5",
                              dsRadius.badge,
                              dsType.caption,
                              GROUP_TONE[group],
                            )}
                          >
                            {group}
                          </span>
                        </div>
                        <time className={cn("shrink-0", dsType.legend)}>
                          {formatWhen(activity.occurredAt)}
                        </time>
                      </div>
                      <p className={dsType.description}>{activity.description}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </DashboardSection>
  );
}
