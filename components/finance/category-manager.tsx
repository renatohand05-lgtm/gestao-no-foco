"use client";

import { useState, useTransition } from "react";

import { createCategory } from "@/lib/finance/actions";
import type { Category, CategoryKind } from "@/lib/finance";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

const KINDS: CategoryKind[] = [
  "receita",
  "despesa",
  "transferencia",
  "investimento",
  "impostos",
  "operacional",
];

type Props = {
  tenantSlug: string;
  categories: Category[];
  className?: string;
};

export function CategoryManager({ tenantSlug, categories, className }: Props) {
  const [items, setItems] = useState(categories);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <section
      data-category-manager
      className={cn("space-y-4 rounded-xl border border-border/60 p-4", className)}
    >
      <p className={gofTypography.title}>Categorias</p>
      <form
        className="grid gap-2 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            setError(null);
            const result = await createCategory(tenantSlug, {
              name: String(fd.get("name")),
              kind: String(fd.get("kind")) as CategoryKind,
              parentId: String(fd.get("parentId") || "") || null,
            });
            if (!result.success) {
              setError(result.error);
              return;
            }
            setItems((prev) => [result.category, ...prev]);
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
        <select name="kind" className="h-9 rounded-md border border-input px-2 text-sm">
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <select name="parentId" className="h-9 rounded-md border border-input px-2 text-sm">
          <option value="">Sem pai (categoria)</option>
          {items
            .filter((c) => !c.parentId)
            .map((c) => (
              <option key={c.id} value={c.id}>
                Sub de {c.name}
              </option>
            ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="h-9 rounded-md border border-input px-3 text-sm hover:bg-muted sm:col-span-3"
        >
          {pending ? "Salvando…" : "Criar categoria / subcategoria"}
        </button>
      </form>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <ul className="space-y-1 text-sm">
        {items.map((c) => (
          <li key={c.id} className="flex justify-between border-b border-border/30 py-1">
            <span>
              {c.parentId ? "↳ " : ""}
              {c.name}
            </span>
            <span className="text-muted-foreground">{c.kind}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
