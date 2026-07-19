"use client";

import { Bell, Focus, Search } from "lucide-react";

import { DemoHide } from "@/components/demo/demo-hide";
import { useWorkspace } from "@/components/executive/workspace/workspace-context";
import { ExecutiveQuickActions } from "@/components/executive/workspace/executive-quick-actions";
import { ExecutiveBadge } from "@/components/executive";
import { Button } from "@/components/ui/button";
import { DsIcon } from "@/components/ui/ds-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { exAnimations, exColors, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  tenantName: string;
  dataDe: string;
  dataAte: string;
  greeting?: string;
  updatedAtLabel: string;
};

/**
 * Top bar compacta — não compete com o Hero (Sprint 12.4).
 */
export function ExecutiveTopBar({
  tenantName,
  dataDe,
  dataAte,
  greeting,
  updatedAtLabel,
}: Props) {
  const { focusMode, toggleFocusMode, setCommandOpen } = useWorkspace();

  return (
    <TooltipProvider delay={200}>
      <header
        className={cn(
          "sticky top-0 z-40 -mx-4 px-4 py-1.5 sm:-mx-5 sm:px-5 lg:-mx-8 lg:px-8 xl:-mx-10 xl:px-10",
          "border-b border-slate-200/35 dark:border-white/10",
          exColors.neutral.canvasSticky,
          exAnimations.fade,
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-3">
            <p className={cn(exTypography.cardTitle, "truncate")}>
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
                  "hidden rounded-xl border-slate-200 bg-white sm:inline-flex dark:border-white/10",
                  exAnimations.focusRing,
                )}
                onClick={() => setCommandOpen(true)}
                aria-label="Buscar"
              >
                <DsIcon icon={Search} size="sm" className="mr-1.5" />
                Buscar
                <kbd
                  className={cn(
                    "ml-2 hidden rounded border border-slate-200 px-1 md:inline",
                    exTypography.micro,
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
                  "size-11 rounded-xl sm:hidden",
                  exAnimations.focusRing,
                  exAnimations.hoverPress,
                )}
                onClick={() => setCommandOpen(true)}
                aria-label="Buscar"
              >
                <DsIcon icon={Search} size="sm" />
              </Button>

              <Button
                type="button"
                variant={focusMode ? "default" : "outline"}
                size="sm"
                className={cn(
                  "min-h-11 rounded-xl",
                  !focusMode && "border-slate-200 bg-white dark:border-white/10",
                  exAnimations.focusRing,
                  exAnimations.hoverPress,
                )}
                onClick={toggleFocusMode}
                aria-pressed={focusMode}
              >
                <DsIcon icon={Focus} size="sm" className="sm:mr-1.5" />
                <span className="hidden sm:inline">Foco</span>
              </Button>

              <Tooltip>
                <TooltipTrigger
                  className={cn(
                    "inline-flex size-11 items-center justify-center rounded-xl text-foreground",
                    "hover:bg-slate-100 dark:hover:bg-white/10",
                    exAnimations.focusRing,
                    exAnimations.hoverPress,
                  )}
                  aria-label="Notificações"
                >
                  <DsIcon icon={Bell} size="sm" />
                </TooltipTrigger>
                <TooltipContent>
                  Sem alertas novos · Atualizado {updatedAtLabel}
                </TooltipContent>
              </Tooltip>
            </DemoHide>

            <Tooltip>
              <TooltipTrigger
                className={cn(
                  "flex size-11 items-center justify-center rounded-full bg-slate-200/80 text-xs font-semibold text-slate-700",
                  "dark:bg-white/10 dark:text-white",
                  exAnimations.focusRing,
                  exAnimations.hoverPress,
                )}
                aria-label={`Conta · ${greeting ?? tenantName}`}
              >
                {tenantName.slice(0, 2).toUpperCase()}
              </TooltipTrigger>
              <TooltipContent>
                {greeting ?? tenantName}
                <br />
                Período {dataDe} → {dataAte}
                <br />
                Atualizado {updatedAtLabel}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}
