"use client";

import { Bell } from "lucide-react";

import { DsIcon } from "@/components/ui/ds-icon";
import { cn } from "@/lib/utils";

type Props = {
  count?: number;
  className?: string;
};

export function NotificationBadge({ count = 0, className }: Props) {
  const n = Math.max(0, count);
  return (
    <span
      className={cn("relative inline-flex", className)}
      aria-label={n > 0 ? `${n} notificações` : "Notificações"}
    >
      <DsIcon icon={Bell} size="md" />
      {n > 0 ? (
        <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
          {n > 99 ? "99+" : n}
        </span>
      ) : null}
    </span>
  );
}
