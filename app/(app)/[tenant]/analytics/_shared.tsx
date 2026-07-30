import { Suspense } from "react";

import { ExecutiveAnalyticsDashboard } from "@/components/analytics/executive-analytics-dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { getExecutiveAnalyticsDashboard } from "@/lib/analytics/analytics-actions";
import { isAnalyticsEnabled } from "@/lib/analytics";
import type { AnalyticsPeriodPreset } from "@/lib/analytics";
import { assertPeriodPreset } from "@/lib/analytics/core/filter-engine";

export async function AnalyticsExecutivoPageInner({
  tenantSlug,
  title,
  description,
  periodPreset,
}: {
  tenantSlug: string;
  title?: string;
  description?: string;
  periodPreset?: string;
}) {
  if (!isAnalyticsEnabled()) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Analytics desabilitado (ANALYTICS_ENABLED).
      </div>
    );
  }

  const preset = assertPeriodPreset(periodPreset) as AnalyticsPeriodPreset;
  const res = await getExecutiveAnalyticsDashboard(tenantSlug, {
    periodPreset: preset,
  });

  if (!res.success) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <p className="text-sm text-destructive" role="alert">
          {res.error}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Suspense fallback={<Skeleton className="h-96 w-full" aria-busy="true" />}>
        <ExecutiveAnalyticsDashboard
          tenantSlug={tenantSlug}
          initialBundle={res.bundle}
          title={title}
          description={description}
        />
      </Suspense>
    </div>
  );
}
