"use client";

import { useState, useTransition } from "react";

import {
  createMovement,
  transferBetweenAccounts,
} from "@/lib/finance/actions";
import type { BankAccount, Category, CostCenter } from "@/lib/finance";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  accounts: BankAccount[];
  categories: Category[];
  costCenters: CostCenter[];
  className?: string;
  onDone?: () => void;
};

export function MovementForm({
  tenantSlug,
  accounts,
  categories,
  costCenters,
  className,
  onDone,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState("entrada");

  return (
    <form
      data-movement-form
      className={cn("space-y-3 rounded-xl border border-border/60 p-4", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const payload = {
          bankAccountId: String(fd.get("bankAccountId")),
          toAccountId: String(fd.get("toAccountId") || "") || null,
          amount: Number(fd.get("amount")),
          movementDate: String(fd.get("movementDate")),
          description: String(fd.get("description")),
          categoryId: String(fd.get("categoryId") || "") || null,
          costCenterId: String(fd.get("costCenterId") || "") || null,
          notes: String(fd.get("notes") || "") || null,
          reverseMovementId: String(fd.get("reverseMovementId") || "") || null,
        };
        startTransition(async () => {
          setError(null);
          const result =
            kind === "transferencia"
              ? await transferBetweenAccounts(tenantSlug, {
                  ...payload,
                  toAccountId: payload.toAccountId!,
                })
              : await createMovement(tenantSlug, {
                  ...payload,
                  kind: kind as
                    | "entrada"
                    | "saida"
                    | "ajuste"
                    | "estorno"
                    | "transferencia",
                });
          if (!result.success) {
            setError(result.error);
            return;
          }
          e.currentTarget.reset();
          onDone?.();
        });
      }}
    >
      <p className={gofTypography.title}>Nova movimentação</p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-sm">
          Tipo
          <select
            name="kind"
            className="mt-1 flex h-9 w-full rounded-md border border-input px-2"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
            <option value="transferencia">Transferência</option>
            <option value="ajuste">Ajuste</option>
            <option value="estorno">Estorno</option>
          </select>
        </label>
        <label className="text-sm">
          Data
          <input
            name="movementDate"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="mt-1 flex h-9 w-full rounded-md border border-input px-2"
          />
        </label>
        <label className="text-sm">
          Conta
          <select
            name="bankAccountId"
            required
            className="mt-1 flex h-9 w-full rounded-md border border-input px-2"
          >
            <option value="">Selecione</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        {kind === "transferencia" ? (
          <label className="text-sm">
            Conta destino
            <select
              name="toAccountId"
              required
              className="mt-1 flex h-9 w-full rounded-md border border-input px-2"
            >
              <option value="">Selecione</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {kind === "estorno" ? (
          <label className="text-sm sm:col-span-2">
            ID da movimentação original
            <input
              name="reverseMovementId"
              required
              className="mt-1 flex h-9 w-full rounded-md border border-input px-2"
            />
          </label>
        ) : null}
        <label className="text-sm">
          Valor
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            className="mt-1 flex h-9 w-full rounded-md border border-input px-2"
          />
        </label>
        <label className="text-sm">
          Categoria
          <select
            name="categoryId"
            className="mt-1 flex h-9 w-full rounded-md border border-input px-2"
          >
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Centro de custo
          <select
            name="costCenterId"
            className="mt-1 flex h-9 w-full rounded-md border border-input px-2"
          >
            <option value="">—</option>
            {costCenters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          Descrição
          <input
            name="description"
            required
            className="mt-1 flex h-9 w-full rounded-md border border-input px-2"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-9 items-center rounded-md border border-input px-3 text-sm hover:bg-muted"
      >
        {pending ? "Salvando…" : "Lançar"}
      </button>
    </form>
  );
}
