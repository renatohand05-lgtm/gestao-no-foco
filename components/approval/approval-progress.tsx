"use client";

import { approvalProgressPercent, type ApprovalRequest } from "@/lib/approval";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  request: ApprovalRequest;
  className?: string;
};

export function ApprovalProgress({ request, className }: Props) {
  const percent = approvalProgressPercent(request);

  return (
    <div data-approval-progress className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className={gofTypography.caption}>Progresso</p>
        <p className={cn(gofTypography.caption, "tabular-nums")}>{percent}%</p>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-[var(--brand-gold)] transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
