"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  convertOrcamentoToOsAction,
  convertOrcamentoToVendaAction,
} from "@/lib/crm/phase28/conversion-actions";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  vendaId: string;
  status: string;
};

export function ConvertOrcamentoButtons({
  tenantSlug,
  vendaId,
  status,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (status !== "orcamento" && status !== "em_andamento") return null;

  function run(
    fn: () => Promise<{
      success: boolean;
      error?: string;
      redirectPath?: string;
    }>,
  ) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.success) {
        setError(res.error ?? "Falha");
        return;
      }
      if (res.redirectPath) router.push(res.redirectPath);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2" data-phase28="orcamento-convert">
      {status === "orcamento" ? (
        <button
          type="button"
          disabled={pending}
          className={cn(buttonVariants({ size: "sm" }))}
          onClick={() =>
            run(() => convertOrcamentoToVendaAction(tenantSlug, vendaId))
          }
        >
          Converter em venda
        </button>
      ) : null}
      <button
        type="button"
        disabled={pending}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        onClick={() =>
          run(() => convertOrcamentoToOsAction(tenantSlug, vendaId))
        }
      >
        Converter em OS
      </button>
      {error ? (
        <p className="basis-full text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
