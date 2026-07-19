"use client";

import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  active?: boolean;
  label?: string;
  className?: string;
};

/**
 * Loader de navegação/app — overlay de tela cheia.
 * Diferente de LoadingOverlay (escopo de formulário).
 */
export function GlobalLoader({
  active = false,
  label = "Carregando…",
  className,
}: Props) {
  if (!active) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[90] flex items-center justify-center bg-background/60 backdrop-blur-[2px]",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
        <Loader2 className="size-4 animate-spin" />
        {label}
      </div>
    </div>
  );
}
