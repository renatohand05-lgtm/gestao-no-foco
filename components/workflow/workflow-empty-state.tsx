"use client";

import { Inbox } from "lucide-react";

import { DsIcon } from "@/components/ui/ds-icon";
import { gofMotion, gofRadius, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  description?: string;
  className?: string;
};

export function WorkflowEmptyState({
  title = "Nenhum workflow",
  description = "Não há instâncias ou histórico para exibir.",
  className,
}: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-workflow-state="empty"
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-4 py-10 text-center",
        gofMotion.fade,
        className,
      )}
    >
      <div
        className={cn(
          "flex size-12 items-center justify-center bg-muted text-muted-foreground ring-1 ring-border/60",
          gofRadius.lg,
        )}
        aria-hidden
      >
        <DsIcon icon={Inbox} size="md" />
      </div>
      <div className="max-w-sm space-y-1">
        <p className={cn(gofTypography.title, "text-base")}>{title}</p>
        <p className={cn(gofTypography.subtitle, "text-sm")}>{description}</p>
      </div>
    </div>
  );
}
