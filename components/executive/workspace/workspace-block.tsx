"use client";

import { Star } from "lucide-react";

import { useWorkspace } from "@/components/executive/workspace/workspace-context";
import { Button } from "@/components/ui/button";
import { DsIcon } from "@/components/ui/ds-icon";
import { exAnimations, exGlass } from "@/lib/design-system";
import { isBlockHiddenInFocus } from "@/lib/workspace";
import { cn } from "@/lib/utils";
import type { WorkspaceBlockId } from "@/lib/workspace";

type Props = {
  id: WorkspaceBlockId;
  title?: string;
  children: React.ReactNode;
  className?: string;
};

/**
 * Bloco do workspace — foco, favorito e densidade em memória.
 */
export function WorkspaceBlock({ id, title, children, className }: Props) {
  const { focusMode, isFavorite, toggleFavorite, getDensity, cycleDensity } =
    useWorkspace();

  if (isBlockHiddenInFocus(id, focusMode)) return null;

  const density = getDensity(id);
  const favorite = isFavorite(id);

  return (
    <section
      data-workspace-block={id}
      data-density={density}
      className={cn(
        "relative min-w-0",
        density === "compact" && "max-w-3xl",
        density === "expandido" && "scale-[1.01]",
        density === "recolhido" && "opacity-60",
        exAnimations.fade,
        className,
      )}
    >
      <div className="mb-2 flex flex-wrap items-center justify-end gap-1">
        {title ? (
          <p className="mr-auto text-xs font-medium text-muted-foreground">
            {title}
          </p>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "min-h-11 rounded-lg px-2",
            exAnimations.touchTarget,
            exAnimations.focusRing,
          )}
          aria-pressed={favorite}
          aria-label={favorite ? "Remover favorito" : "Marcar favorito"}
          onClick={() => toggleFavorite(id)}
        >
          <DsIcon
            icon={Star}
            size="sm"
            className={cn(
              favorite
                ? "fill-amber-400 text-amber-500"
                : "text-muted-foreground",
            )}
          />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "min-h-11 rounded-lg px-2 text-xs text-muted-foreground",
            exAnimations.touchTarget,
            exAnimations.focusRing,
            exGlass.badge,
          )}
          onClick={() => cycleDensity(id)}
          aria-label={`Densidade do bloco: ${density}`}
        >
          {density}
        </Button>
      </div>
      {density === "recolhido" ? (
        <p className="rounded-xl border border-dashed border-border/50 px-3 py-2 text-sm text-muted-foreground">
          Bloco recolhido — altere a densidade para expandir.
        </p>
      ) : (
        children
      )}
    </section>
  );
}
