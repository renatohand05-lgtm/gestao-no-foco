"use client";

import { ServiceCard } from "@/components/observability/service-card";
import type { SystemHealth } from "@/lib/observability";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  health: SystemHealth;
  className?: string;
};

export function HealthDashboard({ health, className }: Props) {
  return (
    <section data-health-dashboard className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className={gofTypography.title}>Health Checks</p>
          <p className={gofTypography.caption}>
            Status geral: {health.status} · disponibilidade {health.availabilityPct}%
          </p>
        </div>
        <p className={gofTypography.caption}>
          {new Date(health.checkedAt).toLocaleString("pt-BR")}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {health.services.map((svc) => (
          <ServiceCard key={svc.name} service={svc} />
        ))}
      </div>
    </section>
  );
}
