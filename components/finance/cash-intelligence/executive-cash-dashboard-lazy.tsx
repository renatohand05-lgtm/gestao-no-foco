"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

/** Lazy-load do painel de caixa enterprise — Sprint 29.1. */
export const ExecutiveCashDashboardLazy = dynamic(
  () =>
    import(
      "@/components/finance/cash-intelligence/executive-cash-dashboard"
    ).then((m) => m.ExecutiveCashDashboardClient),
  {
    loading: () => (
      <Skeleton
        className="h-96 w-full"
        aria-busy="true"
        data-cash-dashboard-lazy=""
      />
    ),
  },
);
