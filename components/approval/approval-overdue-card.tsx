"use client";

import { ApprovalStatusBadge } from "@/components/approval/approval-status-badge";
import type { ApprovalRuntimeListItem } from "@/lib/approval/runtime";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  items: ApprovalRuntimeListItem[];
  className?: string;
  limit?: number;
};

export function ApprovalOverdueCard({ items, className, limit = 5 }: Props) {
  const overdue = items
    .filter(
      (i) =>
        i.sla.status === "overdue" ||
        i.sla.status === "expired" ||
        i.request.status === "expired",
    )
    .slice(0, limit);

  return (
    <section
      data-approval-overdue-card
      className={cn(
        "space-y-2 rounded-xl border border-destructive/30 bg-[var(--brand-white)] p-3",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-2">
        <h3 className={cn(gofTypography.title, "text-sm text-destructive")}>
          Atrasadas / Expiradas
        </h3>
        <span className={gofTypography.caption}>{overdue.length}</span>
      </header>
      {overdue.length === 0 ? (
        <p className={gofTypography.caption}>Nenhuma atrasada.</p>
      ) : (
        <ul className="space-y-2">
          {overdue.map((item) => (
            <li
              key={item.request.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/20 px-2 py-1.5"
            >
              <span className="truncate text-sm">{item.request.id}</span>
              <ApprovalStatusBadge status={item.request.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
