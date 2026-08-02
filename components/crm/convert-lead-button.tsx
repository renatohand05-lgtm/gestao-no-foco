"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import { convertLeadToClienteAction } from "@/lib/crm/actions";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  clienteId: string;
  clienteNome: string;
};

/** Sprint 28.8 — conversão lead→contato sem duplicar cadastro. */
export function ConvertLeadButton({
  tenantSlug,
  clienteId,
  clienteNome,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        aria-label={`Converter lead ${clienteNome} para contato`}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await convertLeadToClienteAction(tenantSlug, clienteId);
            if (!res.success) {
              setError(res.error ?? "Falha na conversão");
              return;
            }
            router.refresh();
          });
        }}
      >
        {pending ? "Convertendo…" : "Converter"}
      </button>
      {error ? (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
