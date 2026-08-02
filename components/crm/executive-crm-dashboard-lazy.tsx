"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

/** Lazy-load do CRM executivo — Sprint 29.1. */
export const ExecutiveCrmDashboardLazy = dynamic(
  () =>
    import("@/components/crm/executive-crm-dashboard").then(
      (m) => m.ExecutiveCrmDashboard,
    ),
  {
    loading: () => (
      <Skeleton
        className="h-96 w-full"
        aria-busy="true"
        data-crm-dashboard-lazy=""
      />
    ),
  },
);
