"use client";

import {
  Children,
  isValidElement,
  useMemo,
  type ReactElement,
  type ReactNode,
} from "react";

import { useLayout } from "@/components/executive/layout/layout-context";
import { ExecutiveLayoutCard } from "@/components/executive/layout/executive-layout-card";
import { cn } from "@/lib/utils";
import type { LayoutBlockId } from "@/lib/dashboard-layout";

type SlotProps = {
  id: LayoutBlockId;
  children: ReactNode;
};

/** Marca um filho para o grid reordenar. */
export function LayoutSlot({ id, children }: SlotProps) {
  return (
    <ExecutiveLayoutCard id={id}>{children}</ExecutiveLayoutCard>
  );
}

type GridProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Grid que reordena slots conforme o layout engine.
 */
export function ExecutiveLayoutGrid({ children, className }: GridProps) {
  const {
    orderedVisibleIds,
    state,
    isVisible,
    densityProfile,
    showStudioChrome,
  } = useLayout();

  const byId = useMemo(() => {
    const map = new Map<LayoutBlockId, ReactElement>();
    Children.forEach(children, (child) => {
      if (!isValidElement(child)) return;
      const props = child.props as { id?: LayoutBlockId };
      if (props.id) {
        map.set(props.id, child as ReactElement);
      }
    });
    return map;
  }, [children]);

  const ordered = useMemo(() => {
    const ids = showStudioChrome
      ? state.blocks
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((b) => b.id)
      : orderedVisibleIds;
    return ids
      .map((id) => ({ id, node: byId.get(id) }))
      .filter((x) => x.node && (showStudioChrome || isVisible(x.id)));
  }, [
    byId,
    orderedVisibleIds,
    showStudioChrome,
    state.blocks,
    isVisible,
  ]);

  return (
    <div
      className={cn(
        "grid w-full grid-cols-1",
        densityProfile === "executive" && "gap-4 lg:gap-5",
        densityProfile === "comfortable" && "gap-3 lg:gap-3.5",
        densityProfile === "compact" && "gap-2 lg:gap-2.5",
        state.fullscreen && "min-h-[calc(100vh-6rem)]",
        className,
      )}
      data-layout-grid
      data-density={densityProfile}
      data-edit-mode={showStudioChrome ? "true" : "false"}
    >
      {ordered.map(({ id, node }) => (
        <div key={id} data-layout-order={id}>
          {node}
        </div>
      ))}
    </div>
  );
}
