"use client";

import { ApprovalHistory } from "@/components/approval/approval-history";
import { ApprovalLevelCard } from "@/components/approval/approval-level-card";
import { ApprovalProgress } from "@/components/approval/approval-progress";
import { ApprovalStatusBadge } from "@/components/approval/approval-status-badge";
import { ApprovalSummary } from "@/components/approval/approval-summary";
import type { ApprovalDefinition, ApprovalRequest } from "@/lib/approval";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  request: ApprovalRequest;
  definition?: ApprovalDefinition | null;
  className?: string;
};

export function ApprovalDetails({
  request,
  definition,
  className,
}: Props) {
  return (
    <article
      data-approval-details
      className={cn(
        "space-y-4 rounded-xl border border-border/60 bg-card p-4 sm:p-5",
        className,
      )}
    >
      <header className="space-y-2">
        <p className={gofTypography.caption}>Solicitação {request.id}</p>
        <div className="flex flex-wrap gap-1.5">
          <ApprovalStatusBadge status={request.status} />
        </div>
      </header>

      <ApprovalSummary request={request} />
      <ApprovalProgress request={request} />

      {definition ? (
        <section className="space-y-2">
          <h3 className={cn(gofTypography.title, "text-sm")}>Níveis</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {definition.levels.map((level) => (
              <ApprovalLevelCard
                key={level.id}
                level={level}
                progress={request.levelProgress.find(
                  (p) => p.levelId === level.id,
                )}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-2">
        <h3 className={cn(gofTypography.title, "text-sm")}>Histórico</h3>
        <ApprovalHistory request={request} />
      </section>
    </article>
  );
}
