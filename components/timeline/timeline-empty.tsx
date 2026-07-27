"use client";

import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  description?: string;
  className?: string;
};

export function TimelineEmpty({
  title = "Sem eventos",
  description = "Nenhuma atividade encontrada para os filtros atuais.",
  className,
}: Props) {
  return (
    <div
      data-timeline-empty
      role="status"
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-4 py-12 text-center",
        className,
      )}
    >
      <p className={cn(gofTypography.title, "text-base")}>{title}</p>
      <p className={cn(gofTypography.caption)}>{description}</p>
    </div>
  );
}
