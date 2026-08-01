"use client";

import { useMemo, useRef, useState, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props<T> = {
  items: T[];
  estimateSize?: number;
  height?: number;
  overscan?: number;
  getKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  empty?: ReactNode;
};

/**
 * Lista virtual leve — sem dependência externa (Sprint 26.5).
 * Ativa janela só quando items.length > 40.
 */
export function GFVirtualList<T>({
  items,
  estimateSize = 44,
  height = 360,
  overscan = 6,
  getKey,
  renderItem,
  className,
  empty,
}: Props<T>) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => setScrollTop(el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const useWindow = items.length > 40;

  const { start, end, padTop, padBottom } = useMemo(() => {
    if (!useWindow) {
      return {
        start: 0,
        end: items.length,
        padTop: 0,
        padBottom: 0,
      };
    }
    const visible = Math.ceil(height / estimateSize);
    const startIdx = Math.max(0, Math.floor(scrollTop / estimateSize) - overscan);
    const endIdx = Math.min(
      items.length,
      startIdx + visible + overscan * 2,
    );
    return {
      start: startIdx,
      end: endIdx,
      padTop: startIdx * estimateSize,
      padBottom: Math.max(0, (items.length - endIdx) * estimateSize),
    };
  }, [useWindow, items.length, height, estimateSize, scrollTop, overscan]);

  if (items.length === 0) {
    return (
      <div data-gf-virtual-list="" data-empty="1" className={className}>
        {empty ?? null}
      </div>
    );
  }

  if (!useWindow) {
    return (
      <div
        data-gf-virtual-list=""
        data-virtualized="0"
        data-sprint="26.5"
        className={cn("space-y-0", className)}
      >
        {items.map((item, i) => (
          <div key={getKey(item, i)}>{renderItem(item, i)}</div>
        ))}
      </div>
    );
  }

  const slice = items.slice(start, end);

  return (
    <div
      ref={scrollerRef}
      data-gf-virtual-list=""
      data-virtualized="1"
      data-sprint="26.5"
      className={cn("overflow-auto", className)}
      style={{ height }}
      role="list"
    >
      <div style={{ paddingTop: padTop, paddingBottom: padBottom }}>
        {slice.map((item, i) => {
          const index = start + i;
          return (
            <div
              key={getKey(item, index)}
              role="listitem"
              style={{ minHeight: estimateSize }}
            >
              {renderItem(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
