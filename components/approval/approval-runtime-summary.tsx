"use client";

import type { ApprovalRuntimeKpis } from "@/lib/approval/runtime";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  kpis: ApprovalRuntimeKpis;
  className?: string;
};

function KpiCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/40 px-2 py-1.5">
      <p className={gofTypography.caption}>{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function ApprovalRuntimeSummary({ kpis, className }: Props) {
  return (
    <section
      data-approval-runtime-summary
      className={cn(
        "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5",
        className,
      )}
    >
      <KpiCell label="Pendentes" value={kpis.pending} />
      <KpiCell label="Aprovadas" value={kpis.approved} />
      <KpiCell label="Rejeitadas" value={kpis.rejected} />
      <KpiCell label="Expiradas" value={kpis.expired} />
      <KpiCell label="Escalonadas" value={kpis.escalated} />
      <KpiCell label="Delegadas" value={kpis.delegated} />
      <KpiCell
        label="Tempo médio (min)"
        value={kpis.averageApprovalTimeMinutes ?? "—"}
      />
      <KpiCell label="SLA médio (min)" value={kpis.averageSlaMinutes ?? "—"} />
      <KpiCell
        label="Taxa aprovação"
        value={
          kpis.approvalRate != null ? `${Math.round(kpis.approvalRate * 100)}%` : "—"
        }
      />
      <KpiCell
        label="First pass"
        value={
          kpis.firstPassRate != null
            ? `${Math.round(kpis.firstPassRate * 100)}%`
            : "—"
        }
      />
      <KpiCell
        label="Reabertura"
        value={
          kpis.reopenRate != null ? `${Math.round(kpis.reopenRate * 100)}%` : "—"
        }
      />
    </section>
  );
}
