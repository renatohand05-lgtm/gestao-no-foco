"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  deleteFinanceBudgetAction,
  duplicateFinanceBudgetAction,
  exportFinanceBudgetAction,
  setFinanceBudgetStatusAction,
} from "@/lib/finance/budget/actions";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  budgetId: string;
  status: string;
};

export function FinanceBudgetActions({ tenantSlug, budgetId, status }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [exportText, setExportText] = useState<string | null>(null);

  function run(fn: () => Promise<{ success: boolean; error?: string; id?: string }>, go?: string) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.success) {
        setError(res.error ?? "Falha");
        return;
      }
      if (go) router.push(go);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2" data-phase28="budget-actions">
      {status === "rascunho" ? (
        <button
          type="button"
          disabled={pending}
          className={cn(buttonVariants({ size: "sm" }))}
          onClick={() =>
            run(() =>
              setFinanceBudgetStatusAction(tenantSlug, budgetId, "em_revisao"),
            )
          }
        >
          Enviar para revisão
        </button>
      ) : null}
      {status === "em_revisao" ? (
        <>
          <button
            type="button"
            disabled={pending}
            className={cn(buttonVariants({ size: "sm" }))}
            onClick={() =>
              run(() =>
                setFinanceBudgetStatusAction(tenantSlug, budgetId, "aprovado"),
              )
            }
          >
            Aprovar
          </button>
          <button
            type="button"
            disabled={pending}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            onClick={() =>
              run(() =>
                setFinanceBudgetStatusAction(tenantSlug, budgetId, "reprovado"),
              )
            }
          >
            Reprovar
          </button>
        </>
      ) : null}
      {status === "aprovado" ? (
        <button
          type="button"
          disabled={pending}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          onClick={() =>
            run(() =>
              setFinanceBudgetStatusAction(tenantSlug, budgetId, "encerrado"),
            )
          }
        >
          Arquivar
        </button>
      ) : null}
      {status !== "cancelado" && status !== "encerrado" ? (
        <button
          type="button"
          disabled={pending}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          onClick={() =>
            run(() =>
              setFinanceBudgetStatusAction(tenantSlug, budgetId, "cancelado"),
            )
          }
        >
          Cancelar
        </button>
      ) : null}
      <button
        type="button"
        disabled={pending}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        onClick={() =>
          run(
            () => duplicateFinanceBudgetAction(tenantSlug, budgetId),
            undefined,
          )
        }
      >
        Duplicar
      </button>
      <button
        type="button"
        disabled={pending}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await exportFinanceBudgetAction(tenantSlug, budgetId);
            if (!res.success) {
              setError(res.error ?? "Falha export");
              return;
            }
            setExportText(JSON.stringify(res.payload, null, 2));
          });
        }}
      >
        Exportar
      </button>
      <button
        type="button"
        disabled={pending}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        onClick={() => window.print()}
      >
        Imprimir
      </button>
      {status !== "aprovado" ? (
        <button
          type="button"
          disabled={pending}
          className={cn(buttonVariants({ variant: "destructive", size: "sm" }))}
          onClick={() => {
            if (!confirm("Excluir este orçamento?")) return;
            run(
              () => deleteFinanceBudgetAction(tenantSlug, budgetId),
              `/${tenantSlug}/financeiro/orcamento`,
            );
          }}
        >
          Excluir
        </button>
      ) : null}
      {error ? (
        <p className="basis-full text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {exportText ? (
        <pre className="basis-full max-h-64 overflow-auto rounded border bg-muted/40 p-2 text-xs">
          {exportText}
        </pre>
      ) : null}
    </div>
  );
}
