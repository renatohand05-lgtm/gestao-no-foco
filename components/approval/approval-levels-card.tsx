"use client";

import { ExecutiveCard } from "@/components/executive";
import type { ApprovalDefinition, ApprovalRequest } from "@/lib/approval";
import { buildLevelRuntimeViews } from "@/lib/approval/runtime";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  request: ApprovalRequest;
  definition?: ApprovalDefinition | null;
  className?: string;
};

export function ApprovalLevelsCard({
  request,
  definition,
  className,
}: Props) {
  const levels = buildLevelRuntimeViews(request, definition ?? null);

  return (
    <section
      data-approval-levels-card
      className={cn("space-y-2", className)}
    >
      <h3 className={cn(gofTypography.title, "text-sm")}>
        Níveis ({levels.length})
      </h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {levels.map((level) => (
          <ExecutiveCard key={level.levelId} padding={16} className="min-w-0 space-y-1">
            <p className={gofTypography.caption}>Nível</p>
            <h4 className="truncate text-sm font-semibold">{level.name}</h4>
            <p className={gofTypography.caption}>
              {level.status}
              {level.decision ? ` · ${level.decision}` : ""}
            </p>
            {level.approver ? (
              <p className={gofTypography.caption}>Aprovador: {level.approver}</p>
            ) : null}
            {level.durationMinutes != null ? (
              <p className={gofTypography.caption}>
                Duração: {level.durationMinutes} min
              </p>
            ) : null}
            {level.comments ? (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {level.comments}
              </p>
            ) : null}
          </ExecutiveCard>
        ))}
      </div>
    </section>
  );
}
