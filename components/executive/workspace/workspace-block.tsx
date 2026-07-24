"use client";

import { Star } from "lucide-react";

import { useWorkspace } from "@/components/executive/workspace/workspace-context";
import { Button } from "@/components/ui/button";
import { DsIcon } from "@/components/ui/ds-icon";
import {
  gofFocusRing,
  gofMotion,
  gofRadius,
  gofTypography,
} from "@/lib/design-system";
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
 * Bloco do workspace — foco, favorito e densidade (Gate 19.4.1).
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
        "relative min-w-0 overflow-x-hidden",
        density === "compact" && "max-w-3xl",
        density === "expandido" && "scale-[1.01]",
        density === "recolhido" && "opacity-60",
        gofMotion.fade,
        className,
      )}
    >
      <div className="mb-2 flex flex-wrap items-center justify-end gap-1">
        {title ? (
          <p className={cn("mr-auto", gofTypography.caption)}>{title}</p>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("min-h-11 px-2", gofRadius.md, gofFocusRing)}
          aria-pressed={favorite}
          aria-label={favorite ? "Remover favorito" : "Marcar favorito"}
          onClick={() => toggleFavorite(id)}
        >
          <DsIcon
            icon={Star}
            size="sm"
            className={cn(
              favorite
                ? "fill-[var(--brand-gold)] text-[var(--brand-gold)]"
                : "text-muted-foreground",
            )}
          />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "min-h-11 px-2 text-xs text-muted-foreground",
            gofRadius.md,
            gofFocusRing,
          )}
          onClick={() => cycleDensity(id)}
          aria-label={`Densidade do bloco: ${density}`}
        >
          {density}
        </Button>
      </div>
      {density === "recolhido" ? (
        <p
          className={cn(
            "border border-dashed border-border/50 px-3 py-2 text-sm text-muted-foreground",
            gofRadius.lg,
          )}
        >
          Bloco recolhido — altere a densidade para expandir.
        </p>
      ) : (
        children
      )}
    </section>
  );
}
