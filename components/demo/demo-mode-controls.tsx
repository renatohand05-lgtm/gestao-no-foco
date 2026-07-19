"use client";

import { MonitorPlay, X } from "lucide-react";

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

type Props = {
  className?: string;
  compact?: boolean;
};

/**
 * Seletor de apresentação — reutiliza a mesma UI do produto.
 */
export function DemoModeControls({ className, compact }: Props) {
  const { mode, setMode, active, exitDemo, demoDataTenant } = useDemoMode();

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        !compact &&
          "rounded-2xl border border-slate-200/70 bg-white/90 p-3 dark:border-white/10 dark:bg-card",
        className,
      )}
      aria-label="Modo de demonstração"
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className={cn(
            exTypography.label,
            "inline-flex items-center gap-1.5",
          )}
        >
          <DsIcon icon={MonitorPlay} size="xs" />
          Apresentação
        </p>
        {active ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn("min-h-11", exAnimations.focusRing)}
            onClick={exitDemo}
            aria-label="Sair do Demo Mode"
          >
            <DsIcon icon={X} size="sm" />
            Sair
          </Button>
        ) : null}
      </div>

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
                "min-h-11 justify-center px-2 text-xs",
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
  );
}
