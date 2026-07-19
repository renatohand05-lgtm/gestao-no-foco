"use client";

import {
  Briefcase,
  Building2,
  Coffee,
  Landmark,
  type LucideIcon,
  Shield,
  Store,
  Utensils,
  Wrench,
} from "lucide-react";

import { LAYOUT_PRESETS } from "@/lib/dashboard-layout";
import { useLayout } from "@/components/executive/layout/layout-context";
import { DsIcon } from "@/components/ui/ds-icon";
import {
  exAnimations,
  exMotion,
  exShadow,
  exSize,
  exTypography,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";

const PRESET_ICONS: Record<string, LucideIcon> = {
  ceo: Building2,
  financeiro: Landmark,
  comercial: Store,
  operacional: Wrench,
  rh: Shield,
  oficina: Briefcase,
  restaurante: Utensils,
  consultoria: Coffee,
};

/**
 * Presets V2 — Workspaces estilo Notion template (Sprint 13.5).
 */
export function ExecutivePresetSelector() {
  const { state, applyPresetId, presetLastUsed } = useLayout();

  return (
    <section
      className={cn("space-y-3", exAnimations.fade)}
      aria-label="Workspaces"
    >
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className={exTypography.label}>Workspaces</p>
          <p className={cn(exTypography.caption, "mt-0.5")}>
            Templates prontos — selecione um e refine.
          </p>
        </div>
      </div>

      <div
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        role="listbox"
        aria-label="Templates de workspace"
      >
        {LAYOUT_PRESETS.map((preset) => {
          const active = state.activePresetId === preset.id;
          const Icon = PRESET_ICONS[preset.id] ?? Building2;
          const lastUsed = presetLastUsed[preset.id];

          return (
            <button
              key={preset.id}
              type="button"
              role="option"
              onClick={() => applyPresetId(preset.id)}
              aria-selected={active}
              className={cn(
                "group relative flex flex-col gap-3 rounded-2xl border bg-white p-3.5 text-left dark:bg-card",
                exSize.presetCard,
                exShadow.card,
                exMotion.transition,
                exMotion.hoverLift,
                exMotion.hoverScale,
                exAnimations.focusRing,
                exMotion.ripple,
                active
                  ? "border-blue-600/35 ring-2 ring-blue-600/15"
                  : "border-slate-200/50 hover:border-slate-300/80 dark:border-white/10",
              )}
            >
              {active ? (
                <span
                  className={cn(
                    "absolute right-3 top-3 rounded-full bg-blue-600 px-2 py-0.5 text-white",
                    exTypography.caption,
                    "font-medium text-white",
                  )}
                >
                  Ativo
                </span>
              ) : null}

              <span
                className={cn(
                  "inline-flex size-11 items-center justify-center rounded-xl",
                  active
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 group-hover:bg-slate-200/80 dark:bg-white/5",
                  exMotion.transition,
                )}
              >
                <DsIcon
                  icon={Icon}
                  size="sm"
                  className={active ? "text-white" : undefined}
                />
              </span>

              <span className="min-w-0 space-y-1">
                <span className={cn(exTypography.cardTitle, "block")}>
                  {preset.label}
                </span>
                <span
                  className={cn(exTypography.caption, "line-clamp-2 block")}
                >
                  {preset.description}
                </span>
              </span>

              <span
                className={cn(
                  "mt-auto flex items-center justify-between gap-2",
                  exTypography.caption,
                  "text-slate-400",
                )}
              >
                <span>{active ? "Em uso" : "Disponível"}</span>
                <span className="truncate tabular-nums">
                  {lastUsed ? `Usado ${lastUsed}` : "—"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
