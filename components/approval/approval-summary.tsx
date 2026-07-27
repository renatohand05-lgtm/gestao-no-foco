"use client";

import { ApprovalStatusBadge } from "@/components/approval/approval-status-badge";
import { summarizeApproval, type ApprovalRequest } from "@/lib/approval";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  request: ApprovalRequest;
  className?: string;
};

export function ApprovalSummary({ request, className }: Props) {
  const summary = summarizeApproval(request);

  return (
    <div
      data-approval-summary
      className={cn(
        "space-y-2 rounded-xl border border-border/60 bg-[var(--brand-white)] p-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ApprovalStatusBadge status={request.status} />
        <span className={gofTypography.caption}>
          {request.definitionId}@{request.definitionVersion}
        </span>
      </div>
      <p className="text-sm text-foreground">
        Níveis atuais:{" "}
        <strong>
          {summary.currentLevels.length
            ? summary.currentLevels.join(", ")
            : "—"}
        </strong>
      </p>
      <p className={gofTypography.caption}>
        Aprovados: {summary.approvedLevels} · Pendentes: {summary.pendingLevels}
        {request.amount != null ? ` · Valor: ${request.amount}` : ""}
      </p>
    </div>
  );
}
