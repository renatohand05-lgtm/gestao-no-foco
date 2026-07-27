"use client";

import type { ObservabilityAlert } from "@/lib/observability";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  alerts: ObservabilityAlert[];
  className?: string;
};

export function AlertsPanel({ alerts, className }: Props) {
  return (
    <section
      data-alerts-panel
      className={cn(
        "space-y-3 rounded-xl border border-border/60 p-4",
        className,
      )}
    >
      <p className={gofTypography.title}>Alertas</p>
      {alerts.length === 0 ? (
        <p className={gofTypography.caption}>Nenhum alerta aberto.</p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className="rounded-lg border border-border/40 px-3 py-2"
            >
              <p className="text-sm font-medium text-foreground">{alert.title}</p>
              <p className={gofTypography.caption}>
                {alert.severity} · {alert.kind} · {alert.service}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{alert.message}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
