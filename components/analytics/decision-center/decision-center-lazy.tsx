"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import type { DecisionCenterPack } from "@/lib/analytics/decision-center/types";

const DecisionCenterView = dynamic(
  () =>
    import("@/components/analytics/decision-center/decision-center-view").then(
      (m) => m.DecisionCenterView,
    ),
  {
    loading: () => (
      <div
        className="space-y-3"
        aria-busy="true"
        data-analytics-decision-center="loading"
      >
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </div>
    ),
    ssr: true,
  },
);

export function DecisionCenterLazy({ pack }: { pack: DecisionCenterPack }) {
  return <DecisionCenterView pack={pack} />;
}
