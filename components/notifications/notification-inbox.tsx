"use client";

import { NotificationList } from "@/components/notifications/notification-list";
import type { NotificationResult } from "@/lib/notifications";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  items: NotificationResult[];
  title?: string;
  className?: string;
  onSelect?: (item: NotificationResult) => void;
};

export function NotificationInbox({
  items,
  title = "Caixa de entrada",
  className,
  onSelect,
}: Props) {
  return (
    <section
      aria-label={title}
      data-notification-inbox
      className={cn("space-y-3", className)}
    >
      <header className="flex items-baseline justify-between gap-2">
        <h2 className={cn(gofTypography.title, "text-base sm:text-lg")}>
          {title}
        </h2>
        <span className={gofTypography.caption} aria-live="polite">
          {items.length} item{items.length === 1 ? "" : "s"}
        </span>
      </header>
      <NotificationList items={items} onSelect={onSelect} />
    </section>
  );
}
