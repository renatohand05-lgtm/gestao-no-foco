"use client";

import { ApprovalEmptyState } from "@/components/approval/approval-empty-state";
import { listApprovalHistory, type ApprovalRequest } from "@/lib/approval";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  request: ApprovalRequest;
  className?: string;
};

export function ApprovalHistory({ request, className }: Props) {
  const entries = listApprovalHistory(request, "desc");
  if (entries.length === 0) {
    return <ApprovalEmptyState title="Histórico vazio" className={className} />;
  }

  return (
    <ol
      data-approval-history
      className={cn("space-y-2", className)}
      aria-label="Histórico de aprovação"
    >
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="rounded-xl border border-border/60 bg-card px-3 py-2.5"
        >
          <p className={gofTypography.caption}>{entry.at}</p>
          <p className="text-sm font-medium text-foreground">
            {entry.decision ?? "—"} · {entry.fromStatus ?? "—"} → {entry.toStatus}
          </p>
          <p className={cn(gofTypography.subtitle, "text-xs")}>
            {entry.actor.userId ?? entry.actor.type ?? "system"}
            {entry.levelId ? ` · ${entry.levelId}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
