"use client";

import { useCallback, useState, useTransition } from "react";

import { AlertsPanel } from "@/components/observability/alerts-panel";
import { HealthDashboard } from "@/components/observability/health-dashboard";
import { MetricsDashboard } from "@/components/observability/metrics-dashboard";
import { SystemStatus } from "@/components/observability/system-status";
import { TracePanel } from "@/components/observability/trace-panel";
import {
  getObservabilitySnapshot,
} from "@/lib/observability/actions";
import type {
  ObservabilityFilters,
  ObservabilitySnapshot,
} from "@/lib/observability";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  initial: ObservabilitySnapshot;
  initialFilters?: ObservabilityFilters;
};

export function ObservabilityClient({
  tenantSlug,
  initial,
  initialFilters = {},
}: Props) {
  const [snapshot, setSnapshot] = useState(initial);
  const [filters, setFilters] = useState<ObservabilityFilters>(initialFilters);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reload = useCallback(
    (next: ObservabilityFilters) => {
      startTransition(async () => {
        setError(null);
        const result = await getObservabilitySnapshot(tenantSlug, next);
        if (!result.success) {
          setError(result.error);
          return;
        }
        setSnapshot(result.snapshot);
        setFilters(next);
      });
    },
    [tenantSlug],
  );

  return (
    <div data-observability-client className="space-y-6">
      {error ? (
        <p className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          reload({
            service: String(fd.get("service") || "") || null,
            module: String(fd.get("module") || "") || null,
            status: String(fd.get("status") || "") || null,
            severity: (String(fd.get("severity") || "") ||
              null) as ObservabilityFilters["severity"],
            from: String(fd.get("from") || "") || null,
            to: String(fd.get("to") || "") || null,
          });
        }}
      >
        <input
          name="service"
          placeholder="serviço"
          defaultValue={filters.service ?? ""}
          className="h-9 rounded-md border border-input px-2 text-sm"
        />
        <input
          name="module"
          placeholder="módulo"
          defaultValue={filters.module ?? ""}
          className="h-9 rounded-md border border-input px-2 text-sm"
        />
        <input
          name="status"
          placeholder="status"
          defaultValue={filters.status ?? ""}
          className="h-9 rounded-md border border-input px-2 text-sm"
        />
        <select
          name="severity"
          defaultValue={filters.severity ?? ""}
          className="h-9 rounded-md border border-input px-2 text-sm"
        >
          <option value="">criticidade</option>
          <option value="info">info</option>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="critical">critical</option>
        </select>
        <input
          name="from"
          type="datetime-local"
          className="h-9 rounded-md border border-input px-2 text-sm"
        />
        <input
          name="to"
          type="datetime-local"
          className="h-9 rounded-md border border-input px-2 text-sm"
        />
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-md border border-input px-3 text-sm hover:bg-muted"
          disabled={pending}
        >
          Filtrar
        </button>
        {pending ? (
          <span className={cn(gofTypography.caption)}>Atualizando…</span>
        ) : null}
      </form>

      <SystemStatus kpis={snapshot.kpis} />
      <HealthDashboard health={snapshot.health} />
      <div className="grid gap-4 lg:grid-cols-2">
        <MetricsDashboard metrics={snapshot.metrics} />
        <div className="space-y-4">
          <AlertsPanel alerts={snapshot.alerts} />
          <TracePanel traces={snapshot.traces} />
        </div>
      </div>
    </div>
  );
}
