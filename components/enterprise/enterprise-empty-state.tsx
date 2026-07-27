"use client";

import { gofMotion, gofRadius, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  description?: string;
  className?: string;
};

export function EnterpriseEmptyState({
  title = "Sem dados Enterprise",
  description = "Nenhum evento ou métrica disponível.",
  className,
}: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-4 py-10 text-center",
        gofMotion.fade,
        className,
      )}
    >
      <div
        className={cn("size-10 bg-muted ring-1 ring-border/50", gofRadius.lg)}
        aria-hidden
      />
      <p className={cn(gofTypography.title, "text-base")}>{title}</p>
      <p className={cn(gofTypography.subtitle, "text-sm")}>{description}</p>
    </div>
  );
}
