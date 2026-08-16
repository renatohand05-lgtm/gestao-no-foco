"use client";

import { lazy, Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import type { OsWorkspaceProps } from "@/components/ordens/os-workspace";

/**
 * Lazy-load do workspace (~44KB client) — Sprint 29.1 / 35.1.
 * Fallback usa copy do adapter; oficina permanece com OS.
 */
const OsWorkspace = lazy(() =>
  import("@/components/ordens/os-workspace").then((m) => ({
    default: m.OsWorkspace,
  })),
);

export function OsWorkspaceLazy(props: OsWorkspaceProps) {
  const aria =
    props.uiCopy?.workspaceLoadingAria ?? "Carregando workspace da OS";
  return (
    <Suspense
      fallback={
        <div
          className="space-y-4"
          role="status"
          aria-label={aria}
          data-os-workspace-lazy=""
        >
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      }
    >
      <OsWorkspace {...props} />
    </Suspense>
  );
}
