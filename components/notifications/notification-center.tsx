"use client";

import { NotificationBadge } from "@/components/notifications/notification-badge";
import { NotificationInbox } from "@/components/notifications/notification-inbox";
import type { NotificationResult } from "@/lib/notifications";
import { gofRadius, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  items: NotificationResult[];
  unreadCount?: number;
  title?: string;
  className?: string;
  onSelect?: (item: NotificationResult) => void;
};

export function NotificationCenter({
  items,
  unreadCount,
  title = "Central de notificações",
  className,
  onSelect,
}: Props) {
  const unread =
    typeof unreadCount === "number"
      ? unreadCount
      : items.filter((i) => i.status !== "read").length;

  return (
    <section
      aria-label={title}
      data-notification-center
      className={cn(
        "space-y-4 bg-card/40 p-4 ring-1 ring-border/50 sm:p-5",
        gofRadius.xl,
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <h2 className={cn(gofTypography.title, "text-base sm:text-lg")}>
            {title}
          </h2>
          <p className={gofTypography.caption}>Somente dados já avaliados</p>
        </div>
        <NotificationBadge count={unread} />
      </header>
      <NotificationInbox items={items} onSelect={onSelect} title="Recentes" />
    </section>
  );
}
