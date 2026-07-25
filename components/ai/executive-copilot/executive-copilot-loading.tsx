"use client";

import { ExecutiveSkeleton } from "@/components/executive";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function ExecutiveCopilotLoading({ className }: Props) {
  return (
    <div
      className={cn("space-y-3", className)}
      role="status"
      aria-live="polite"
      aria-label="Analisando evidências"
    >
      <p className={gofTypography.caption}>Analisando evidências…</p>
      <ExecutiveSkeleton heightClassName="h-4" widthClassName="w-2/3" />
      <ExecutiveSkeleton heightClassName="h-16" widthClassName="w-full" />
      <ExecutiveSkeleton heightClassName="h-10" widthClassName="w-full" />
    </div>
  );
}
