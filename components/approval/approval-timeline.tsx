"use client";

import {
  groupApprovalHistoryByLevel,
  summarizeApproval,
  type ApprovalRequest,
} from "@/lib/approval";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

import { ApprovalEmptyState } from "@/components/approval/approval-empty-state";

type Props = {
  request: ApprovalRequest;
  className?: string;
};

export function ApprovalTimeline({ request, className }: Props) {
  const summary = summarizeApproval(request);
  const groups = groupApprovalHistoryByLevel(request);

  if (groups.length === 0) {
    return <ApprovalEmptyState className={className} />;
  }

  return (
    <div data-approval-timeline className={cn("space-y-4", className)}>
      <header className="space-y-1">
        <p className={gofTypography.caption}>Timeline</p>
        <p className="text-sm text-foreground">
          Status: <strong>{summary.status}</strong> · {summary.decisionCount}{" "}
          decisão(ões)
        </p>
      </header>
      {groups.map((group) => (
        <section key={group.key} className="space-y-1" aria-label={group.label}>
          <h3 className={cn(gofTypography.title, "text-sm")}>
            {group.label}{" "}
            <span className={gofTypography.caption}>({group.count})</span>
          </h3>
          <ul className="space-y-1 border-l border-border/60 pl-3">
            {group.entries.map((e) => (
              <li key={e.id} className={gofTypography.caption}>
                {e.decision ?? "create"} · {e.at}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
