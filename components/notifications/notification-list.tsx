"use client";

import { NotificationCard } from "@/components/notifications/notification-card";
import { NotificationEmptyState } from "@/components/notifications/notification-empty-state";
import type { NotificationResult } from "@/lib/notifications";
import { cn } from "@/lib/utils";

type Props = {
  items: NotificationResult[];
  className?: string;
  onSelect?: (item: NotificationResult) => void;
  emptyTitle?: string;
  emptyDescription?: string;
};

export function NotificationList({
  items,
  className,
  onSelect,
  emptyTitle,
  emptyDescription,
}: Props) {
  if (!items.length) {
    return (
      <NotificationEmptyState
        title={emptyTitle}
        description={emptyDescription}
        className={className}
      />
    );
  }

  return (
    <ul
      role="list"
      aria-label="Lista de notificações"
      data-notification-list
      className={cn("space-y-3", className)}
    >
      {items.map((item) => (
        <li key={item.request.id}>
          <NotificationCard item={item} onSelect={onSelect} />
        </li>
      ))}
    </ul>
  );
}
