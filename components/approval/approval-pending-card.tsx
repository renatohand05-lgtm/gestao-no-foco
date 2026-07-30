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

export function ApprovalPendingCard({ items, className, limit = 5 }: Props) {
  const pending = items
    .filter((i) =>
      ["pending", "partially_approved", "waiting", "requested"].includes(
        i.request.status,
      ),
    )
    .slice(0, limit);

  return (
    <section
      data-approval-pending-card
      className={cn(
        "space-y-2 rounded-xl border border-border/60 bg-card p-3",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-2">
        <h3 className={cn(gofTypography.title, "text-sm")}>Pendentes</h3>
        <span className={gofTypography.caption}>{pending.length}</span>
      </header>
      {pending.length === 0 ? (
        <p className={gofTypography.caption}>Nenhuma pendência.</p>
      ) : (
        <ul className="space-y-2">
          {pending.map((item) => (
            <li
              key={item.request.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 px-2 py-1.5"
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
