"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

import { fetchDashboardAlertCountAction } from "@/lib/dashboard/alert-count-action";
import { cn } from "@/lib/utils";

type Props = { tenantSlug: string };

export function DashboardAlertBell({ tenantSlug }: Props) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetchDashboardAlertCountAction(tenantSlug).then((result) => {
      if (active && result.success) setCount(result.count);
    });
    return () => {
      active = false;
    };
  }, [tenantSlug]);

  const hasAlerts = Boolean(count && count > 0);

  return (
    <Link
      href={`/${tenantSlug}/dashboard`}
      className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-[var(--brand-gold)]"
      aria-label={
        hasAlerts
          ? `${count} alerta(s) crítico(s) — abrir dashboard`
          : "Sem alertas críticos"
      }
    >
      <Bell className="size-4" aria-hidden />
      {hasAlerts ? (
        <span
          className={cn(
            "absolute top-1 right-1 flex size-4 items-center justify-center rounded-full",
            "bg-danger text-[9px] font-semibold text-white",
          )}
        >
          {count! > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}
