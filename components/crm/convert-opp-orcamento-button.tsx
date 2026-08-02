"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import { convertOportunidadeToOrcamentoAction } from "@/lib/crm/phase28/conversion-actions";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  oportunidadeId: string;
  titulo: string;
};

export function ConvertOppToOrcamentoButton({
  tenantSlug,
  oportunidadeId,
  titulo,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        aria-label={`Converter oportunidade ${titulo} em orçamento`}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await convertOportunidadeToOrcamentoAction(
              tenantSlug,
              oportunidadeId,
            );
            if (!res.success) {
              setError(res.error ?? "Falha");
              return;
            }
            if (res.redirectPath) router.push(res.redirectPath);
            else router.refresh();
          });
        }}
      >
        {pending ? "…" : "→ Orçamento"}
      </button>
      {error ? (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
