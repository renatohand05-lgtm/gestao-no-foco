"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  updatedAtLabel: string;
  className?: string;
};

export function DashboardRefreshButton({ updatedAtLabel, className }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 text-xs text-muted-foreground",
        className,
      )}
    >
      <span>
        Última atualização:{" "}
        <time className="font-medium text-foreground">{updatedAtLabel}</time>
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => router.refresh())}
        aria-label="Atualizar dados do dashboard"
      >
        <RefreshCw
          className={cn("size-3.5", pending && "animate-spin")}
          aria-hidden
        />
        Atualizar dados
      </Button>
    </div>
  );
}
