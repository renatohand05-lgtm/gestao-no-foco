import { ALERT_PRIORITY_WEIGHT } from "@/lib/intelligence/alerts/thresholds";
import type {
  ChecklistResult,
  IntelligenceAlert,
  PriorityItem,
} from "@/types/intelligence";

export function buildPriorityCenter(params: {
  alerts: IntelligenceAlert[];
  checklist: ChecklistResult;
  limit?: number;
}): PriorityItem[] {
  const limit = params.limit ?? 8;
  const items: PriorityItem[] = [];

  for (const alert of params.alerts) {
    if (alert.priority === "info") continue;
    items.push({
      id: `alert-${alert.id}`,
      rank: 0,
      priority: alert.priority,
      title: alert.title,
      description: alert.description,
      href: alert.href,
      source: "alert",
    });
  }

  const pendingChecklist = params.checklist.items.filter((item) => !item.completed);
  for (const item of pendingChecklist.slice(0, 3)) {
    items.push({
      id: `checklist-${item.id}`,
      rank: 0,
      priority: "low",
      title: `Pendência: ${item.title}`,
      description: item.description,
      href: item.href,
      source: "checklist",
    });
  }

  items.sort((a, b) => {
    const wa = ALERT_PRIORITY_WEIGHT[a.priority] ?? 0;
    const wb = ALERT_PRIORITY_WEIGHT[b.priority] ?? 0;
    if (wa !== wb) return wb - wa;
    return a.title.localeCompare(b.title, "pt-BR");
  });

  return items.slice(0, limit).map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}
