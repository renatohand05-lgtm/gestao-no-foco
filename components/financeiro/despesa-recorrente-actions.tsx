"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  deleteDespesaRecorrenteAction,
  duplicateDespesaRecorrenteAction,
  encerrarDespesaRecorrenteAction,
  generateDespesaRecorrenteAction,
  pauseDespesaRecorrenteAction,
} from "@/lib/financeiro/actions";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  id: string;
  pausada: boolean;
  ativo: boolean;
};

export function DespesaRecorrenteActions({
  tenantSlug,
  id,
  pausada,
  ativo,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ success: boolean; error?: string; id?: string }>, redirect?: string) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error ?? "Falha na operação.");
        return;
      }
      if (redirect) {
        router.push(redirect);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {ativo ? (
          <button
            type="button"
            disabled={pending}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            onClick={() =>
              run(() => pauseDespesaRecorrenteAction(tenantSlug, id, !pausada))
            }
          >
            {pausada ? "Retomar" : "Pausar"}
          </button>
        ) : null}

        <button
          type="button"
          disabled={pending || !ativo || pausada}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          onClick={() =>
            run(() => generateDespesaRecorrenteAction(tenantSlug, id))
          }
        >
          Gerar próxima CP
        </button>

        <button
          type="button"
          disabled={pending}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          onClick={() =>
            run(() => duplicateDespesaRecorrenteAction(tenantSlug, id), undefined)
          }
        >
          Duplicar série
        </button>

        {ativo ? (
          <button
            type="button"
            disabled={pending}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            onClick={() =>
              run(() => encerrarDespesaRecorrenteAction(tenantSlug, id))
            }
          >
            Encerrar
          </button>
        ) : null}

        <button
          type="button"
          disabled={pending}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-destructive")}
          onClick={() => {
            if (!confirm("Excluir (soft delete) esta série? Histórico de CPs permanece.")) {
              return;
            }
            run(
              () => deleteDespesaRecorrenteAction(tenantSlug, id),
              `/${tenantSlug}/financeiro/despesas-recorrentes`,
            );
          }}
        >
          Excluir
        </button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
