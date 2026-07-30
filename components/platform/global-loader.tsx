"use client";

import { useEffect, useRef, useState } from "react";

import { PremiumGlobalLoader } from "@/components/brand/premium-global-loader";
import { cn } from "@/lib/utils";

type Props = {
  active?: boolean;
  label?: string;
  className?: string;
  /** Mínimo visual anti-flicker (ms). Sem máximo artificial. */
  minVisibleMs?: number;
};

/**
 * Overlay fullscreen com G oficial + fade-out curto (Sprint 25.6.2).
 */
export function GlobalLoader({
  active = false,
  label = "Carregando conteúdo",
  className,
  minVisibleMs = 250,
}: Props) {
  const shownAt = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timers: number[] = [];

    if (active) {
      shownAt.current = performance.now();
      timers.push(
        window.setTimeout(() => {
          setExiting(false);
          setMounted(true);
        }, 0),
      );
    } else {
      const elapsed =
        shownAt.current != null
          ? performance.now() - shownAt.current
          : minVisibleMs;
      const wait = Math.max(0, minVisibleMs - elapsed);
      timers.push(
        window.setTimeout(() => {
          setExiting(true);
          timers.push(
            window.setTimeout(() => {
              setMounted(false);
              setExiting(false);
            }, 200),
          );
        }, wait),
      );
    }

    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, [active, minVisibleMs]);

  if (!mounted) return null;

  return (
    <PremiumGlobalLoader
      variant="fullscreen"
      label={label}
      className={cn(className)}
      rootClassName={exiting ? "premium-loader-exit" : undefined}
    />
  );
}
