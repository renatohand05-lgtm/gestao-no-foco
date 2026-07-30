"use client";

import { Focus, Search } from "lucide-react";

import { DemoHide } from "@/components/demo/demo-hide";
import { useWorkspace } from "@/components/executive/workspace/workspace-context";
import { ExecutiveQuickActions } from "@/components/executive/workspace/executive-quick-actions";
import { ExecutiveBadge } from "@/components/executive";
import { Button } from "@/components/ui/button";
import { DsIcon } from "@/components/ui/ds-icon";
import {
  gofFocusRing,
  gofMotion,
  gofRadius,
  gofTypography,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  tenantName: string;
  dataDe: string;
  dataAte: string;
  updatedAtLabel: string;
};

/**
 * Top bar do Dashboard — tenant + ações (Gate 19.4.1).
 * Greeting oficial fica só no ExecutiveDashboardHeader.
 */
export function ExecutiveTopBar({
  tenantName,
  dataDe,
  dataAte,
  updatedAtLabel,
}: Props) {
  const { focusMode, toggleFocusMode, setCommandOpen } = useWorkspace();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 -mx-4 overflow-x-hidden px-4 py-1.5 sm:-mx-5 sm:px-5 lg:-mx-8 lg:px-8 xl:-mx-10 xl:px-10",
        "border-b border-border/40 bg-background/90 backdrop-blur-md",
        "supports-[backdrop-filter]:bg-background/75",
        gofMotion.fade,
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <p
            className={cn(
              gofTypography.title,
              "truncate text-base sm:text-lg",
            )}
          >
            {tenantName}
          </p>
          <DemoHide flag="technicalBadges">
            <ExecutiveBadge
              tone="success"
              className="hidden font-medium normal-case tracking-normal sm:inline-flex"
            >
              Online
            </ExecutiveBadge>
            {focusMode ? (
              <ExecutiveBadge
                tone="warning"
                className="normal-case tracking-normal"
              >
                Foco
              </ExecutiveBadge>
            ) : null}
          </DemoHide>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <DemoHide flag="appHeaderExtras">
            <ExecutiveQuickActions />

            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "hidden border-border/60 bg-card sm:inline-flex",
                gofRadius.lg,
                gofFocusRing,
              )}
              onClick={() => setCommandOpen(true)}
              aria-label="Abrir busca rápida"
            >
              <DsIcon icon={Search} size="sm" className="mr-1.5" />
              Buscar
              <kbd
                className={cn(
                  "ml-2 hidden rounded border border-border/60 px-1 md:inline",
                  gofTypography.caption,
                )}
              >
                ⌘K
              </kbd>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "size-11 sm:hidden",
                gofRadius.lg,
                gofFocusRing,
              )}
              onClick={() => setCommandOpen(true)}
              aria-label="Abrir busca rápida"
            >
              <DsIcon icon={Search} size="sm" />
            </Button>

            <Button
              type="button"
              variant={focusMode ? "default" : "outline"}
              size="sm"
              className={cn(
                "min-h-11",
                gofRadius.lg,
                !focusMode && "border-border/60 bg-card",
                gofFocusRing,
              )}
              onClick={toggleFocusMode}
              aria-pressed={focusMode}
              aria-label={
                focusMode ? "Desativar modo foco" : "Ativar modo foco"
              }
              title={`Período ${dataDe} → ${dataAte} · Atualizado ${updatedAtLabel}`}
            >
              <DsIcon icon={Focus} size="sm" className="sm:mr-1.5" />
              <span className="hidden sm:inline">Foco</span>
            </Button>
          </DemoHide>
        </div>
      </div>
    </header>
  );
}
