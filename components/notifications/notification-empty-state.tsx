"use client";

import { Inbox } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  description?: string;
  className?: string;
};

/** Wrapper Brand EmptyState — Sprint 29.3. */
export function NotificationEmptyState({
  title = "Nenhuma notificação",
  description = "Você está em dia. Novas notificações aparecerão aqui.",
  className,
}: Props) {
  return (
    <div data-notification-state="empty" className={cn(className)}>
      <EmptyState
        icon={Inbox}
        title={title}
        description={description}
        className="border-0 bg-transparent py-10 shadow-none"
      />
    </div>
  );
}
