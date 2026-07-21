"use client";

import { cn } from "@/lib/utils";

type CrmTagBadgesProps = {
  tags: string[];
  className?: string;
};

export function CrmTagBadges({ tags, className }: CrmTagBadgesProps) {
  if (!tags.length) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
