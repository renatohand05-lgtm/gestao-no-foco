"use client";

import { useEffect, useState } from "react";
import { ChevronDown, MonitorPlay, X } from "lucide-react";

import { useDemoMode } from "@/components/demo/demo-mode-provider";
import { Button } from "@/components/ui/button";
import { DsIcon } from "@/components/ui/ds-icon";
import {
  DEMO_MODE_HINTS,
  DEMO_MODE_LABELS,
  type DemoPresentationMode,
} from "@/lib/demo";
import { exAnimations, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

const OPTIONS: DemoPresentationMode[] = [
  "normal",
  "executive",
  "commercial",
  "fullscreen",
];

const COLLAPSE_KEY = "gnf_demo_chrome_expanded";

type Props = {
  className?: string;
  compact?: boolean;
  /** When true, chrome starts collapsed (mobile / default shell). */
  defaultCollapsed?: boolean;
};

function readStoredExpanded(defaultCollapsed: boolean): boolean {
  if (typeof window === "undefined") return !defaultCollapsed;
  try {
    const raw = window.sessionStorage.getItem(COLLAPSE_KEY);
    if (raw === "1") return true;
    if (raw === "0") return false;
  } catch {
    /* ignore */
  }
  return !defaultCollapsed;
}

/**
 * Seletor de apresentação — colapsável (Sprint 30.1).
 * Preserva modos; não ocupa viewport agressivamente no mobile.
 */
export function DemoModeControls({
  className,
  compact,
  defaultCollapsed = true,
}: Props) {
  const { mode, setMode, active, exitDemo, demoDataTenant } = useDemoMode();
  const [userExpanded, setUserExpanded] = useState(() =>
    readStoredExpanded(defaultCollapsed),
  );

  // Quando demo mode ativo, força painel aberto sem setState em effect.
  const expanded = active || userExpanded;

  useEffect(() => {
    try {
      window.sessionStorage.setItem(COLLAPSE_KEY, userExpanded ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [userExpanded]);

  const shortLabel = DEMO_MODE_LABELS[mode].replace("Modo ", "");

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        !compact &&
          expanded &&
          "rounded-2xl border border-slate-200/70 bg-white/90 p-3 dark:border-white/10 dark:bg-card",
        className,
      )}
      aria-label="Modo de demonstração"
      data-demo-chrome={expanded ? "expanded" : "collapsed"}
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className={cn(
            "inline-flex min-h-10 flex-1 items-center gap-1.5 rounded-xl px-2 text-left text-sm font-medium",
            "hover:bg-muted/60",
            exAnimations.focusRing,
            exTypography.label,
          )}
          aria-expanded={expanded}
          aria-controls="demo-mode-options"
          onClick={() => setUserExpanded((v) => !v)}
        >
          <DsIcon icon={MonitorPlay} size="xs" />
          <span className="truncate">
            Apresentação
            <span className="ml-1.5 font-normal text-muted-foreground">
              · {shortLabel}
            </span>
          </span>
          <DsIcon
            icon={ChevronDown}
            size="xs"
            className={cn(
              "ml-auto shrink-0 transition-transform",
              expanded && "rotate-180",
            )}
          />
        </button>
        {active ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn("min-h-10 shrink-0", exAnimations.focusRing)}
            onClick={exitDemo}
            aria-label="Sair do Demo Mode"
          >
            <DsIcon icon={X} size="sm" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        ) : null}
      </div>

      {expanded ? (
        <div id="demo-mode-options" className="space-y-2">
          <div
            className="grid grid-cols-2 gap-1.5 sm:grid-cols-4"
            role="radiogroup"
            aria-label="Modo de apresentação"
          >
            {OPTIONS.map((option) => {
              const selected = mode === option;
              return (
                <Button
                  key={option}
                  type="button"
                  size="sm"
                  variant={selected ? "default" : "outline"}
                  className={cn(
                    "min-h-10 justify-center px-2 text-xs",
                    exAnimations.focusRing,
                    "rounded-xl",
                  )}
                  aria-checked={selected}
                  role="radio"
                  onClick={() => setMode(option)}
                >
                  {DEMO_MODE_LABELS[option].replace("Modo ", "")}
                </Button>
              );
            })}
          </div>

          {!compact ? (
            <p className={exTypography.caption}>{DEMO_MODE_HINTS[mode]}</p>
          ) : null}

          {demoDataTenant ? (
            <p className={cn(exTypography.caption, "text-amber-800")}>
              Tenant de demonstração — use apenas dados marcados como demo.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
