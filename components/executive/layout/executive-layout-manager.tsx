"use client";

import {
  LayoutProvider,
  useLayout,
} from "@/components/executive/layout/layout-context";
import { ExecutiveLayoutEditor } from "@/components/executive/layout/executive-layout-editor";
import { ExecutiveLayoutGrid } from "@/components/executive/layout/executive-layout-grid";
import { ExecutiveLayoutToolbar } from "@/components/executive/layout/executive-layout-toolbar";
import { ExecutivePresetConfirmDialog } from "@/components/executive/layout/executive-preset-confirm-dialog";
import { DemoHide } from "@/components/demo/demo-hide";
import { DemoLayoutSync } from "@/components/demo/demo-layout-sync";
import { exAnimations, exColors, exTypography } from "@/lib/design-system";
import type { BootstrapLayoutResult } from "@/lib/dashboard-layout/persistence/types";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  tenantSlug?: string | null;
  bootstrap?: BootstrapLayoutResult | null;
};

function LayoutShell({ children }: { children: React.ReactNode }) {
  const { state, densityProfile, studioView, persistStatus, persistMessage, isDirty } =
    useLayout();

  return (
    <div
      className={cn(
        densityProfile === "executive" && "space-y-4",
        densityProfile === "comfortable" && "space-y-3",
        densityProfile === "compact" && "space-y-2",
        state.fullscreen &&
          cn(
            "fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6",
            exColors.neutral.canvas,
          ),
      )}
      data-layout-manager
      data-density={densityProfile}
      data-studio-view={studioView}
    >
      <DemoLayoutSync />

      <DemoHide flag="studioToolbar">
        <ExecutiveLayoutToolbar />
      </DemoHide>

      <DemoHide flag="persistStatus">
        {(persistStatus !== "idle" && persistStatus !== "synced") || isDirty ? (
          <div
            className={cn(
              "rounded-xl border px-3.5 py-2",
              persistStatus === "error" || persistStatus === "conflict"
                ? "border-rose-200/80 bg-rose-50/90 text-rose-900 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-100"
                : persistStatus === "saving"
                  ? "border-slate-200/70 bg-white/80 text-slate-600"
                  : "border-emerald-200/70 bg-emerald-50/80 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100",
              exAnimations.fade,
            )}
            role="status"
            aria-live="polite"
          >
            <p className={exTypography.caption}>
              {persistStatus === "saving"
                ? "Salvando…"
                : persistStatus === "dirty" || isDirty
                  ? "Alterações não salvas"
                  : persistMessage ??
                    (persistStatus === "saved"
                      ? "Salvo"
                      : persistStatus === "restored"
                        ? "Restaurado"
                        : persistStatus === "deleted"
                          ? "Excluído"
                          : persistStatus === "conflict"
                            ? "Conflito de versão"
                            : null)}
            </p>
          </div>
        ) : null}
      </DemoHide>

      <DemoHide flag="previewBanner">
        {studioView === "preview" ? (
          <div
            className={cn(
              "rounded-xl border border-sky-200/70 bg-sky-50/80 px-3.5 py-2 text-sky-900 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-100",
              exAnimations.fade,
            )}
            role="status"
          >
            <p className={exTypography.caption}>
              Preview · visão publicada exata — controles de edição ocultos.
            </p>
          </div>
        ) : null}
      </DemoHide>

      <DemoHide flag="layoutEditor">
        {state.editMode && studioView === "edit" ? (
          <ExecutiveLayoutEditor />
        ) : null}
      </DemoHide>
      <ExecutiveLayoutGrid>{children}</ExecutiveLayoutGrid>
      <ExecutivePresetConfirmDialog />
    </div>
  );
}

/**
 * Manager — hidratação persistente (Sprint 13.6).
 * Demo Mode (13.13) apenas oculta chrome técnico.
 */
export function ExecutiveLayoutManager({
  children,
  tenantSlug = null,
  bootstrap = null,
}: Props) {
  return (
    <LayoutProvider tenantSlug={tenantSlug} bootstrap={bootstrap}>
      <LayoutShell>{children}</LayoutShell>
    </LayoutProvider>
  );
}
