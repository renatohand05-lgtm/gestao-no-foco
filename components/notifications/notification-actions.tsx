"use client";

import type { NotificationAction } from "@/lib/notifications";
import { cn } from "@/lib/utils";

type Props = {
  actions: NotificationAction[];
  className?: string;
  onAction?: (action: NotificationAction) => void;
  disabled?: boolean;
};

export function NotificationActions({
  actions,
  className,
  onAction,
  disabled = false,
}: Props) {
  if (!actions.length) {
    return null;
  }

  return (
    <div
      role="group"
      aria-label="Ações da notificação"
      data-notification-actions
      className={cn("flex flex-wrap gap-2", className)}
    >
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          disabled={disabled}
          className={cn(
            "inline-flex min-h-9 items-center justify-center rounded-md px-3 text-sm font-medium",
            "bg-primary text-primary-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/35",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
          onClick={() => onAction?.(action)}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
