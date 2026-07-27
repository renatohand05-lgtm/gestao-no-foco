"use client";

import { NotificationCategoryBadge } from "@/components/notifications/notification-category-badge";
import { NotificationPriorityBadge } from "@/components/notifications/notification-priority-badge";
import { NotificationStatusBadge } from "@/components/notifications/notification-status-badge";
import { ExecutiveCard } from "@/components/executive";
import type { NotificationResult } from "@/lib/notifications";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  item: NotificationResult;
  className?: string;
  onSelect?: (item: NotificationResult) => void;
};

export function NotificationCard({ item, className, onSelect }: Props) {
  const title = item.renderedTitle ?? item.request.title ?? item.request.event;
  const message =
    item.renderedMessage ?? item.request.message ?? item.request.event;

  const body = (
    <ExecutiveCard
      padding={16}
      interactive={Boolean(onSelect)}
      className={cn("min-w-0 space-y-2 text-left", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="truncate text-sm font-semibold text-foreground sm:text-base">
          {title}
        </h3>
        <div className="flex flex-wrap gap-1">
          <NotificationPriorityBadge priority={item.request.priority} />
          <NotificationStatusBadge status={item.status} />
        </div>
      </div>
      <p className={cn(gofTypography.subtitle, "text-sm line-clamp-2")}>
        {message}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <NotificationCategoryBadge category={item.request.category} />
        <span className={gofTypography.caption}>{item.request.event}</span>
      </div>
    </ExecutiveCard>
  );

  if (!onSelect) {
    return <div data-notification-card>{body}</div>;
  }

  return (
    <button
      type="button"
      data-notification-card
      className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/35"
      onClick={() => onSelect(item)}
    >
      {body}
    </button>
  );
}
