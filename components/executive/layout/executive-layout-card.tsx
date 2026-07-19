"use client";

import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
} from "lucide-react";

import { useLayout } from "@/components/executive/layout/layout-context";
import { useWorkspace } from "@/components/executive/workspace/workspace-context";
import { DENSITY_PRIORITY_LABEL } from "@/components/executive/layout/layout-ui";
import { Button } from "@/components/ui/button";
import { DsIcon } from "@/components/ui/ds-icon";
import {
  exAnimations,
  exGlass,
  exMotion,
  exTypography,
} from "@/lib/design-system";
import { LAYOUT_BLOCK_LABELS } from "@/lib/dashboard-layout";
import { isBlockHiddenInFocus } from "@/lib/workspace";
import { cn } from "@/lib/utils";
import type { LayoutBlockId } from "@/lib/dashboard-layout";

type Props = {
  id: LayoutBlockId;
  children: React.ReactNode;
  className?: string;
};

/**
 * Card de layout — chrome só em modo Editar (oculto no Preview).
 * Sprint 13.5 · profundidade discreta.
 */
export function ExecutiveLayoutCard({ id, children, className }: Props) {
  const {
    showStudioChrome,
    getDensity,
    isVisible,
    move,
    toggleVisible,
    cycleDensity,
  } = useLayout();
  const { focusMode } = useWorkspace();

  if (isBlockHiddenInFocus(id, focusMode) && !showStudioChrome) return null;
  if (!isVisible(id) && !showStudioChrome) return null;

  const density = getDensity(id);
  const hiddenInEdit = !isVisible(id) && showStudioChrome;

  return (
    <div
      data-layout-id={id}
      data-density={density}
      data-dnd-ready="true"
      className={cn(
        "relative min-w-0",
        density === "compact" && "max-w-3xl",
        density === "expandido" && "sm:scale-[1.01]",
        density === "recolhido" && !showStudioChrome && "hidden",
        hiddenInEdit && "opacity-50",
        showStudioChrome &&
          cn(
            "rounded-2xl ring-1 ring-blue-600/15",
            "bg-white/40 p-2 backdrop-blur-[2px] dark:bg-white/[0.03]",
            exMotion.transition,
          ),
        exAnimations.slide,
        className,
      )}
    >
      {showStudioChrome ? (
        <div
          className={cn(
            "mb-2 flex flex-wrap items-center gap-1 rounded-xl px-2 py-1.5",
            exGlass.badge,
          )}
        >
          <span
            className={cn("mr-auto text-xs font-medium", exTypography.caption)}
          >
            {LAYOUT_BLOCK_LABELS[id]}
            <span className="ml-2 text-slate-400">
              · {DENSITY_PRIORITY_LABEL[density]}
            </span>
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn(
              "min-h-11 min-w-11 rounded-lg px-2",
              exAnimations.touchTarget,
              exAnimations.focusRing,
              exMotion.ripple,
            )}
            aria-label={`Mover ${LAYOUT_BLOCK_LABELS[id]} para cima`}
            onClick={() => move(id, "up")}
          >
            <DsIcon icon={ArrowUp} size="sm" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn(
              "min-h-11 min-w-11 rounded-lg px-2",
              exAnimations.touchTarget,
              exAnimations.focusRing,
              exMotion.ripple,
            )}
            aria-label={`Mover ${LAYOUT_BLOCK_LABELS[id]} para baixo`}
            onClick={() => move(id, "down")}
          >
            <DsIcon icon={ArrowDown} size="sm" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn(
              "min-h-11 min-w-11 rounded-lg px-2",
              exAnimations.touchTarget,
              exAnimations.focusRing,
              exMotion.ripple,
            )}
            aria-pressed={isVisible(id)}
            aria-label={isVisible(id) ? "Ocultar bloco" : "Mostrar bloco"}
            onClick={() => toggleVisible(id)}
          >
            <DsIcon icon={isVisible(id) ? Eye : EyeOff} size="sm" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn(
              "min-h-11 rounded-lg px-2 text-xs",
              exAnimations.touchTarget,
              exAnimations.focusRing,
              exMotion.ripple,
            )}
            onClick={() => cycleDensity(id)}
            aria-label={`Densidade: ${density}`}
          >
            {density === "expandido" ? (
              <DsIcon icon={Maximize2} size="sm" className="mr-1" />
            ) : density === "compact" || density === "recolhido" ? (
              <DsIcon icon={Minimize2} size="sm" className="mr-1" />
            ) : null}
            {density}
          </Button>
        </div>
      ) : null}

      {density === "recolhido" && showStudioChrome ? (
        <p className="rounded-xl border border-dashed border-border/50 px-3 py-2 text-sm text-muted-foreground">
          Recolhido — alterne a densidade para expandir.
        </p>
      ) : hiddenInEdit ? (
        <p className="rounded-xl border border-dashed border-border/50 px-3 py-2 text-sm text-muted-foreground">
          Oculto — use o ícone de olho para exibir.
        </p>
      ) : density === "recolhido" ? null : (
        children
      )}
    </div>
  );
}
