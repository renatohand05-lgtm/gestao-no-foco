"use client";

import { OutboxStatusBadge } from "@/components/enterprise/outbox-status-badge";
import { ExecutiveCard } from "@/components/executive";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  pending: number;
  failed: number;
  processing: number;
  className?: string;
};

export function IntegrationStatusCard({
  title = "Integração",
  pending,
  failed,
  processing,
  className,
}: Props) {
  const status =
    failed > 0 ? "failed" : processing > 0 ? "processing" : "pending";

  return (
    <ExecutiveCard padding={16} className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className={cn(gofTypography.title, "text-sm")}>{title}</h3>
        <OutboxStatusBadge status={status} />
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center text-sm">
        <div>
          <dt className={gofTypography.caption}>Pending</dt>
          <dd className="font-semibold">{pending}</dd>
        </div>
        <div>
          <dt className={gofTypography.caption}>Processing</dt>
          <dd className="font-semibold">{processing}</dd>
        </div>
        <div>
          <dt className={gofTypography.caption}>Failed</dt>
          <dd className="font-semibold">{failed}</dd>
        </div>
      </dl>
    </ExecutiveCard>
  );
}
