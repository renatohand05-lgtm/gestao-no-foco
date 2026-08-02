"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Lazy-load do workspace de OS (~44KB client) — Sprint 29.1.
 * Header/breadcrumbs da page permanecem no Server Component.
 */
export const OsWorkspaceLazy = dynamic(
  () =>
    import("@/components/ordens/os-workspace").then((m) => m.OsWorkspace),
  {
    loading: () => (
      <div
        className="space-y-4"
        role="status"
        aria-label="Carregando workspace da OS"
        data-os-workspace-lazy=""
      >
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    ),
  },
);
