"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

/** Lazy-load do Analytics executivo — Sprint 29.1. */
export const ExecutiveAnalyticsDashboardLazy = dynamic(
  () =>
    import("@/components/analytics/executive-analytics-dashboard").then(
      (m) => m.ExecutiveAnalyticsDashboard,
    ),
  {
    loading: () => (
      <Skeleton
        className="h-96 w-full"
        aria-busy="true"
        data-analytics-dashboard-lazy=""
      />
    ),
  },
);
