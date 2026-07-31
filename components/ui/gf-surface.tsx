import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type GfSurfaceProps = HTMLAttributes<HTMLDivElement> & {
  /** Nível visual · Sprint 26.1 */
  level?: "base" | "raised" | "overlay" | "authorial";
  as?: "div" | "section" | "article" | "aside";
};

/**
 * Superfície de marca — reduz aparência genérica Shadcn no cockpit.
 */
export function GfSurface({
  level = "raised",
  as: Comp = "div",
  className,
  children,
  ...props
}: GfSurfaceProps) {
  return (
    <Comp
      data-gf-surface={level}
      className={cn(
        "gf-surface min-w-0 overflow-hidden",
        level === "base" && "gf-surface-base",
        level === "raised" && "gf-surface-raised",
        level === "overlay" && "gf-surface-overlay",
        level === "authorial" && "gf-surface-authorial",
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}
