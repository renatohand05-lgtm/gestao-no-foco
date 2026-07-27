"use client";

import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  message?: string;
  className?: string;
};

export function TimelineError({
  message = "Não foi possível carregar a timeline.",
  className,
}: Props) {
  return (
    <div
      data-timeline-error
      role="alert"
      className={cn(
        "rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive",
        className,
      )}
    >
      <p className={cn(gofTypography.title, "text-sm text-destructive")}>
        Erro
      </p>
      <p>{message}</p>
    </div>
  );
}
