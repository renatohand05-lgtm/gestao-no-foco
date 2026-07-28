"use client";

import { useState, useTransition } from "react";

import { archiveCostCenter, createCostCenter } from "@/lib/finance/actions";
import type { CostCenter } from "@/lib/finance";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  costCenters: CostCenter[];
  className?: string;
};

export function CostCenterManager({
  tenantSlug,
  costCenters,
  className,
}: Props) {
  const [items, setItems] = useState(costCenters);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <section
      data-cost-center-manager
      className={cn("space-y-4 rounded-xl border border-border/60 p-4", className)}
    >
      <p className={gofTypography.title}>Centros de custo</p>
      <form
        className="grid gap-2 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            setError(null);
            const result = await createCostCenter(tenantSlug, {
              name: String(fd.get("name")),
              code: String(fd.get("code") || "") || null,
            });
            if (!result.success) {
              setError(result.error);
              return;
            }
            setItems((prev) => [result.costCenter, ...prev]);
            e.currentTarget.reset();
          });
        }}
      >
        <input
          name="name"
          required
          placeholder="Nome"
          className="h-9 rounded-md border border-input px-2 text-sm"
        />
        <input
          name="code"
          placeholder="Código"
          className="h-9 rounded-md border border-input px-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-9 rounded-md border border-input px-3 text-sm hover:bg-muted"
        >
          {pending ? "Salvando…" : "Cadastrar"}
        </button>
      </form>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <ul className="space-y-1 text-sm">
        {items.map((c) => (
          <li key={c.id} className="flex items-center justify-between border-b border-border/30 py-1">
            <span>
              {c.code ? `${c.code} · ` : ""}
              {c.name}
            </span>
            <button
              type="button"
              className="text-xs underline text-muted-foreground"
              onClick={() =>
                startTransition(async () => {
                  const result = await archiveCostCenter(tenantSlug, c.id);
                  if (result.success) {
                    setItems((prev) => prev.filter((x) => x.id !== c.id));
                  } else {
                    setError(result.error);
                  }
                })
              }
            >
              Arquivar
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
