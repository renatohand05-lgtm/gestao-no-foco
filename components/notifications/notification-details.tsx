"use client";

import { NotificationCategoryBadge } from "@/components/notifications/notification-category-badge";
import { NotificationPriorityBadge } from "@/components/notifications/notification-priority-badge";
import { NotificationStatusBadge } from "@/components/notifications/notification-status-badge";
import type { NotificationResult } from "@/lib/notifications";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  item: NotificationResult;
  className?: string;
};

export function NotificationDetails({ item, className }: Props) {
  const title = item.renderedTitle ?? item.request.title ?? item.request.event;
  const message =
    item.renderedMessage ?? item.request.message ?? item.request.event;

  return (
    <article
      data-notification-details
      className={cn("space-y-4", className)}
      aria-labelledby={`notif-detail-${item.request.id}`}
    >
      <header className="space-y-2">
        <h2
          id={`notif-detail-${item.request.id}`}
          className={cn(gofTypography.title, "text-lg sm:text-xl")}
        >
          {title}
        </h2>
        <div className="flex flex-wrap gap-1.5">
          <NotificationPriorityBadge priority={item.request.priority} />
          <NotificationStatusBadge status={item.status} />
          <NotificationCategoryBadge category={item.request.category} />
        </div>
      </header>

      <p className={cn(gofTypography.subtitle, "text-sm whitespace-pre-wrap")}>
        {message}
      </p>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className={gofTypography.caption}>Evento</dt>
          <dd className="font-medium text-foreground">{item.request.event}</dd>
        </div>
        <div>
          <dt className={gofTypography.caption}>Tenant</dt>
          <dd className="font-medium text-foreground">{item.request.tenantId}</dd>
        </div>
        <div>
          <dt className={gofTypography.caption}>Correlation</dt>
          <dd className="truncate font-medium text-foreground">
            {item.request.correlationId ?? "—"}
          </dd>
        </div>
        <div>
          <dt className={gofTypography.caption}>Canais</dt>
          <dd className="font-medium text-foreground">
            {item.routedChannels.join(", ") || "—"}
          </dd>
        </div>
      </dl>
    </article>
  );
}
