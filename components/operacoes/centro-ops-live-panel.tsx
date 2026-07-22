"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

import { OperacaoBoard } from "@/components/operacoes/operacao-board";
import { buttonVariants } from "@/components/ui/button";
import type { OperacaoBoardCard } from "@/lib/operacoes/centro-operacoes-service";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  board: Record<string, OperacaoBoardCard[]>;
  canAlterarStatus: boolean;
  syncedAt: string;
  pollSeconds?: number;
};

function formatSync(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function CentroOpsLivePanel({
  tenantSlug,
  board,
  canAlterarStatus,
  syncedAt,
  pollSeconds = 60,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [manualAt, setManualAt] = useState<string | null>(null);
  const label = formatSync(manualAt ?? syncedAt);

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
      setManualAt(new Date().toISOString());
    });
  }, [router]);

  useEffect(() => {
    if (pollSeconds <= 0) return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      refresh();
    }, pollSeconds * 1000);
    return () => window.clearInterval(id);
  }, [pollSeconds, refresh]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Atualizado às {label}
          {pending ? " · atualizando…" : ""}
        </p>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          onClick={refresh}
          disabled={pending}
        >
          Atualizar
        </button>
      </div>
      <div className="relative -mx-1">
        <div className="overflow-x-auto overscroll-x-contain touch-pan-x pb-3">
          <div className="mb-1 px-1 sm:hidden">
            <p className="text-[10px] text-muted-foreground">
              Deslize horizontalmente para ver todas as etapas
            </p>
          </div>
          <OperacaoBoard
            tenantSlug={tenantSlug}
            board={board}
            canAlterarStatus={canAlterarStatus}
          />
        </div>
      </div>
    </div>
  );
}
