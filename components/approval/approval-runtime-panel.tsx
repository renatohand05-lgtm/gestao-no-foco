"use client";

import { ApprovalDecisionPanel } from "@/components/approval/approval-decision-panel";
import { ApprovalHistoryPanel } from "@/components/approval/approval-history-panel";
import { ApprovalLevelsCard } from "@/components/approval/approval-levels-card";
import { ApprovalSlaCard } from "@/components/approval/approval-sla-card";
import { ApprovalSummary } from "@/components/approval/approval-summary";
import type { ApprovalDefinition, ApprovalRequest } from "@/lib/approval";
import type {
  ApprovalSlaSnapshot,
  ApprovalTimelineEvent,
} from "@/lib/approval/runtime";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  request: ApprovalRequest;
  definition?: ApprovalDefinition | null;
  sla: ApprovalSlaSnapshot;
  timeline: ApprovalTimelineEvent[];
  className?: string;
  disabled?: boolean;
  onDecide?: (input: {
    type: "APPROVE" | "REJECT" | "CANCEL";
    comment?: string;
  }) => void | Promise<void>;
};

/**
 * Painel operacional — apenas callbacks; mutações via Server Actions.
 */
export function ApprovalRuntimePanel({
  request,
  definition,
  sla,
  timeline,
  className,
  disabled,
  onDecide,
}: Props) {
  return (
    <article
      data-approval-runtime-panel
      className={cn(
        "space-y-4 rounded-xl border border-border/60 bg-[var(--brand-white)] p-4 sm:p-5",
        className,
      )}
    >
      <header className="space-y-1">
        <p className={gofTypography.caption}>Runtime · {request.id}</p>
        <ApprovalSummary request={request} />
      </header>

      <div className="grid gap-3 lg:grid-cols-2">
        <ApprovalSlaCard request={request} sla={sla} />
        <ApprovalLevelsCard request={request} definition={definition} />
      </div>

      <ApprovalHistoryPanel events={timeline} />

      <ApprovalDecisionPanel
        disabled={disabled || !onDecide}
        onDecide={(type) => {
          if (type === "APPROVE" || type === "REJECT" || type === "CANCEL") {
            void onDecide?.({ type });
          }
        }}
      />
    </article>
  );
}
