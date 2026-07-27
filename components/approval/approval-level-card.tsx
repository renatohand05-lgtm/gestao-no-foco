"use client";

import { ExecutiveCard } from "@/components/executive";
import type { ApprovalLevel, ApprovalLevelProgress } from "@/lib/approval";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  level: ApprovalLevel;
  progress?: ApprovalLevelProgress | null;
  className?: string;
};

export function ApprovalLevelCard({ level, progress, className }: Props) {
  return (
    <ExecutiveCard padding={16} className={cn("min-w-0 space-y-2", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={gofTypography.caption}>Nível {level.order}</p>
          <h3 className="truncate text-sm font-semibold text-foreground">
            {level.name}
          </h3>
        </div>
        <span className={cn(gofTypography.caption, "capitalize")}>
          {level.mode}
        </span>
      </div>
      {level.description ? (
        <p className={cn(gofTypography.subtitle, "text-xs line-clamp-2")}>
          {level.description}
        </p>
      ) : null}
      {progress ? (
        <p className={gofTypography.caption}>
          {progress.status} · {progress.approvals}/{progress.required}
        </p>
      ) : null}
    </ExecutiveCard>
  );
}
