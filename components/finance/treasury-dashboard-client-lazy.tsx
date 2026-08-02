"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

/** Lazy-load do dashboard de tesouraria — Sprint 29.1. */
export const TreasuryDashboardLazy = dynamic(
  () =>
    import("@/components/finance/treasury-dashboard-client").then(
      (m) => m.TreasuryDashboardClient,
    ),
  {
    loading: () => (
      <Skeleton
        className="h-96 w-full"
        aria-busy="true"
        data-treasury-dashboard-lazy=""
      />
    ),
  },
);
