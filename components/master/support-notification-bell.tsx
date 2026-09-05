"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { fetchUnreadSupportCount } from "@/lib/support/support-actions";
import { cn } from "@/lib/utils";

export function SupportNotificationBell() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function refresh() {
      const result = await fetchUnreadSupportCount();
      if (active && result.success) setCount(result.data);
    }

    void refresh();

    const supabase = createClient();
    const channel = supabase
      .channel("support-notifications-owner")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_messages" },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  const hasUnread = Boolean(count && count > 0);

  return (
    <Link
      href="/master/suporte"
      className="relative flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-muted"
      aria-label={
        hasUnread
          ? `${count} solicitações de suporte não lidas`
          : "Central de suporte"
      }
    >
      <Bell className="size-4 text-foreground" />
      {hasUnread ? (
        <span
          className={cn(
            "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white",
          )}
        >
          {count && count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}
