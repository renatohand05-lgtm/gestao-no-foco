"use client";

import { gofMotion, gofRadius } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  rows?: number;
  className?: string;
};

export function NotificationLoading({ rows = 4, className }: Props) {
  const count = Math.max(1, Math.min(12, rows));
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Carregando notificações"
      data-notification-state="loading"
      className={cn("space-y-3", gofMotion.fade, className)}
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={`notif-skel-${i}`}
          className={cn(
            "h-16 animate-pulse bg-muted/70 ring-1 ring-border/40",
            gofRadius.lg,
          )}
        />
      ))}
    </div>
  );
}
