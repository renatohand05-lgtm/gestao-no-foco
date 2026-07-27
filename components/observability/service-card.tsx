"use client";

import type { ServiceHealth } from "@/lib/observability";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  service: ServiceHealth;
  className?: string;
};

const STATUS_CLASS: Record<string, string> = {
  healthy: "border-emerald-500/40 text-emerald-700",
  degraded: "border-amber-500/40 text-amber-700",
  unhealthy: "border-red-500/40 text-red-700",
  unknown: "border-border text-muted-foreground",
};

export function ServiceCard({ service, className }: Props) {
  return (
    <article
      data-service-card
      className={cn(
        "rounded-xl border px-3 py-3",
        STATUS_CLASS[service.status] ?? STATUS_CLASS.unknown,
        className,
      )}
    >
      <p className={cn(gofTypography.caption, "uppercase tracking-wide")}>
        {service.name}
      </p>
      <p className={cn(gofTypography.title, "mt-1 text-base capitalize")}>
        {service.status}
      </p>
      <p className={cn(gofTypography.caption, "mt-1")}>
        {service.latencyMs != null ? `${service.latencyMs} ms` : "—"}
        {service.message ? ` · ${service.message}` : ""}
      </p>
    </article>
  );
}
