"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import { applySuggestedDreLinhasAction } from "@/lib/financeiro/actions";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
};

export function ApplyDreSuggestionsButton({ tenantSlug }: Props) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={pending}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        onClick={() => {
          setMsg(null);
          startTransition(async () => {
            const result = await applySuggestedDreLinhasAction(tenantSlug);
            if (!result.success) {
              setMsg(result.error);
              return;
            }
            setMsg(
              `Atualizadas: ${result.updated ?? 0}. Ainda pendentes: ${result.pendingCount ?? 0}.`,
            );
            router.refresh();
          });
        }}
      >
        Aplicar sugestões DRE
      </button>
      {msg ? <p className="text-xs text-muted-foreground">{msg}</p> : null}
    </div>
  );
}
