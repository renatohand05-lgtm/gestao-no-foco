"use client";

import { ApprovalStatusBadge } from "@/components/approval/approval-status-badge";
import type { ApprovalRequest } from "@/lib/approval";
import type { ApprovalSlaSnapshot } from "@/lib/approval/runtime";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  request: ApprovalRequest;
  sla: ApprovalSlaSnapshot;
  className?: string;
};

const SLA_LABEL: Record<ApprovalSlaSnapshot["status"], string> = {
  on_track: "No prazo",
  warning: "Atenção",
  overdue: "Atrasado",
  expired: "Expirado",
  completed: "Concluído",
  not_applicable: "N/A",
};

export function ApprovalSlaCard({ request, sla, className }: Props) {
  return (
    <article
      data-approval-sla-card
      className={cn(
        "space-y-2 rounded-xl border border-border/60 bg-card p-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={gofTypography.caption}>SLA</p>
        <ApprovalStatusBadge status={request.status} />
      </div>
      <p className="text-sm font-medium text-foreground">
        {SLA_LABEL[sla.status]}
      </p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <div>
          <dt>Criado</dt>
          <dd className="text-foreground">{sla.createdAt}</dd>
        </div>
        <div>
          <dt>Início</dt>
          <dd className="text-foreground">{sla.startedAt ?? "—"}</dd>
        </div>
        <div>
          <dt>Prazo</dt>
          <dd className="text-foreground">{sla.deadline ?? "—"}</dd>
        </div>
        <div>
          <dt>Restante</dt>
          <dd className="text-foreground">
            {sla.remainingDays != null
              ? `${sla.remainingDays}d ${sla.remainingHours != null ? (sla.remainingHours % 24) : 0}h`
              : "—"}
          </dd>
        </div>
      </dl>
    </article>
  );
}
