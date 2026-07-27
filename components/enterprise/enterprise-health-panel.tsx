"use client";

import { EnterpriseHealthBadge } from "@/components/enterprise/enterprise-health-badge";
import type { EnterpriseHealthSnapshot } from "@/lib/enterprise";
import { gofRadius, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  health: EnterpriseHealthSnapshot;
  className?: string;
};

export function EnterpriseHealthPanel({ health, className }: Props) {
  return (
    <section
      aria-label="Saúde Enterprise"
      data-enterprise-health
      className={cn(
        "space-y-4 bg-card/40 p-4 ring-1 ring-border/50 sm:p-5",
        gofRadius.xl,
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className={cn(gofTypography.title, "text-base")}>
            Enterprise Health
          </h2>
          <p className={gofTypography.caption}>{health.checkedAt}</p>
        </div>
        <EnterpriseHealthBadge status={health.status} />
      </header>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className={gofTypography.caption}>Database</dt>
          <dd className="font-medium">
            {health.database.connected ? "conectado" : "indisponível"}
          </dd>
        </div>
        <div>
          <dt className={gofTypography.caption}>Outbox pending</dt>
          <dd className="font-medium">{health.outbox.pending}</dd>
        </div>
        <div>
          <dt className={gofTypography.caption}>Outbox failed</dt>
          <dd className="font-medium">{health.outbox.failed}</dd>
        </div>
        <div>
          <dt className={gofTypography.caption}>Workflows blocked</dt>
          <dd className="font-medium">{health.workflows.blocked}</dd>
        </div>
        <div>
          <dt className={gofTypography.caption}>Approvals expired</dt>
          <dd className="font-medium">{health.approvals.expired}</dd>
        </div>
        <div>
          <dt className={gofTypography.caption}>Notifications failed</dt>
          <dd className="font-medium">{health.notifications.failed}</dd>
        </div>
      </dl>
      {health.details.length > 0 ? (
        <ul className="list-disc pl-5 text-sm text-muted-foreground">
          {health.details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
