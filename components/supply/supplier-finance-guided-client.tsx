"use client";

/**
 * Sprint 25.4.3 — Classificação financeira guiada do fornecedor.
 */

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  resolveSupplierFinanceFlow,
  type ClassificationMode,
  type SupplierFinanceClassification,
} from "@/lib/supply/enterprise/supplier-finance-flow";

type Props = {
  hasExistingConfig: boolean;
  existing: SupplierFinanceClassification | null;
  onResolved: (result: ReturnType<typeof resolveSupplierFinanceFlow>) => void;
};

const empty: SupplierFinanceClassification = {
  categoriaFinanceiraId: null,
  subcategoriaId: null,
  centroCustoId: null,
  grupoDre: null,
  contaContabil: null,
  condicaoPagamento: null,
  formaPagamento: null,
  vencimentoPadraoDias: 30,
  rateio: null,
  empresaId: null,
  filialId: null,
};

export function SupplierFinanceGuidedClient({
  hasExistingConfig,
  existing,
  onResolved,
}: Props) {
  const [mode, setMode] = useState<ClassificationMode>(
    hasExistingConfig ? "salvar_padrao" : "pendente",
  );
  const [form, setForm] = useState<SupplierFinanceClassification>(
    existing ?? empty,
  );
  const [message, setMessage] = useState<string | null>(null);

  function apply() {
    const result = resolveSupplierFinanceFlow({
      hasExistingConfig,
      existing,
      provided: form,
      mode,
    });
    setMessage(result.message);
    onResolved(result);
  }

  if (hasExistingConfig && existing) {
    return (
      <div className="rounded-lg border p-4 text-sm space-y-2">
        <p>Fornecedor já possui classificação financeira padrão.</p>
        <Button type="button" onClick={apply}>
          Usar padrão
        </Button>
        {message ? <p role="status">{message}</p> : null}
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h3 className="text-sm font-semibold">
        Classificação financeira do fornecedor
      </h3>
      <p className="text-xs text-muted-foreground">
        Sem inventar categoria. Você pode salvar o recebimento e manter a AP
        como pendente de classificação.
      </p>
      <div className="space-y-1">
        <Label>Modo</Label>
        <select
          className="flex h-10 w-full rounded-md border px-3 text-sm"
          value={mode}
          onChange={(e) => setMode(e.target.value as ClassificationMode)}
          aria-label="Modo de classificação"
        >
          <option value="pendente">Pendente de classificação</option>
          <option value="somente_esta_compra">Somente nesta compra</option>
          <option value="salvar_padrao">Salvar como padrão do fornecedor</option>
        </select>
      </div>
      {mode !== "pendente" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["categoriaFinanceiraId", "Categoria financeira (ID)"],
              ["subcategoriaId", "Subcategoria (ID)"],
              ["centroCustoId", "Centro de custo (ID)"],
              ["grupoDre", "Grupo DRE"],
              ["contaContabil", "Conta contábil / plano (ID)"],
              ["condicaoPagamento", "Condição de pagamento"],
              ["formaPagamento", "Forma de pagamento (ID)"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1">
              <Label>{label}</Label>
              <input
                className="flex h-10 w-full rounded-md border px-3 text-sm"
                value={(form[key] as string | null) ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [key]: e.target.value || null }))
                }
                aria-label={label}
              />
            </div>
          ))}
          <div className="space-y-1">
            <Label>Vencimento padrão (dias)</Label>
            <input
              className="flex h-10 w-full rounded-md border px-3 text-sm"
              type="number"
              value={form.vencimentoPadraoDias ?? 30}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  vencimentoPadraoDias: Number(e.target.value),
                }))
              }
              aria-label="Vencimento padrão"
            />
          </div>
        </div>
      ) : null}
      <Button type="button" onClick={apply}>
        Continuar
      </Button>
      {message ? (
        <p className="text-sm" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
