"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { adoptSegmentLibraryAction } from "@/lib/segments/library-actions.ts";
import { groupLibraryByCategory } from "@/lib/segments/catalogs/builder.ts";
import type { SegmentLibraryItem } from "@/lib/segments/catalogs/types.ts";

type Props = {
  tenantSlug: string;
  items: SegmentLibraryItem[];
  existingCount: number;
  categories: string[];
};

export function SegmentCatalogPicker({
  tenantSlug,
  items,
  existingCount,
  categories,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const recommendedIds = useMemo(
    () => items.filter((item) => item.recommended).map((item) => item.id),
    [items],
  );

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (categoryFilter === "recommended" && !item.recommended) return false;
      if (
        categoryFilter !== "all" &&
        categoryFilter !== "recommended" &&
        item.category !== categoryFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    });
  }, [items, query, categoryFilter]);

  const grouped = useMemo(
    () => groupLibraryByCategory(filteredItems),
    [filteredItems],
  );

  const visibleIds = useMemo(
    () => filteredItems.map((item) => item.id),
    [filteredItems],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectIds(ids: string[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  function onSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await adoptSegmentLibraryAction(tenantSlug, [...selected]);
      if (!result.success) {
        setError(result.error);
        return;
      }
      const params = new URLSearchParams({
        library: "1",
        added: String(result.created),
        skipped: String(result.skippedDuplicate),
      });
      if (result.created > 0) params.set("precoZerado", "1");
      router.push(`/${tenantSlug}/produtos?${params.toString()}`);
      router.refresh();
    });
  }

  const selectedCount = selected.size;
  const addLabel =
    selectedCount === 0
      ? "Adicionar serviços"
      : `Adicionar ${selectedCount} serviço${selectedCount === 1 ? "" : "s"}`;

  return (
    <div className="relative space-y-6 pb-24 sm:pb-0">
      <LoadingOverlay loading={pending} label="Adicionando selecionados..." />

      {error ? (
        <FeedbackMessage variant="error">{error}</FeedbackMessage>
      ) : null}

      {existingCount > 0 ? (
        <FeedbackMessage variant="info">
          Serviços equivalentes aos que você já cadastrou não serão duplicados.
        </FeedbackMessage>
      ) : null}

      <div className="flex flex-col gap-3">
        <label className="block w-full max-w-md text-sm">
          <span className="mb-1 block text-muted-foreground">Busca</span>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrar por nome, categoria ou descrição"
            aria-label="Buscar sugestões"
          />
        </label>
        <div className="flex flex-wrap gap-2" aria-label="Categorias">
          <FilterChip
            active={categoryFilter === "all"}
            onClick={() => setCategoryFilter("all")}
          >
            Categorias
          </FilterChip>
          <FilterChip
            active={categoryFilter === "recommended"}
            onClick={() => setCategoryFilter("recommended")}
          >
            Recomendados
          </FilterChip>
          {categories.map((category) => (
            <FilterChip
              key={category}
              active={categoryFilter === category}
              onClick={() => setCategoryFilter(category)}
            >
              {category}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => selectIds(recommendedIds, true)}
          >
            Recomendados
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => selectIds(visibleIds, true)}
          >
            Selecionar todos
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelected(new Set())}
          >
            Limpar seleção
          </Button>
        </div>
      </div>

      {grouped.size === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum serviço corresponde à busca ou categoria.
        </p>
      ) : (
        [...grouped.entries()].map(([category, groupItems]) => {
          const groupIds = groupItems.map((item) => item.id);
          const allOn = groupIds.every((id) => selected.has(id));
          return (
            <section
              key={category}
              className="rounded-xl border border-border/60 bg-card p-4 shadow-[var(--elevation-card)]"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold tracking-tight">
                  {category}
                </h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => selectIds(groupIds, !allOn)}
                >
                  {allOn ? "Desmarcar categoria" : "Selecionar categoria"}
                </Button>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {groupItems.map((item) => (
                  <li key={item.id}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/50 px-3 py-2 hover:bg-muted/40">
                      <input
                        type="checkbox"
                        className="mt-1 size-4 shrink-0 accent-[var(--brand-gold)]"
                        checked={selected.has(item.id)}
                        onChange={() => toggle(item.id)}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">
                          {item.name}
                          {item.recommended ? (
                            <span className="ml-2 text-[10px] uppercase tracking-wide text-[var(--brand-gold)]">
                              recomendado
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {item.category}
                          {item.defaultDurationMinutes
                            ? ` · ${item.defaultDurationMinutes} min`
                            : ""}
                        </span>
                        {item.description ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {item.description}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/60 bg-background/95 p-3 backdrop-blur sm:static sm:z-auto sm:flex sm:flex-col-reverse sm:gap-2 sm:border-t sm:bg-transparent sm:p-0 sm:pt-4 sm:backdrop-blur-none sm:flex-row sm:items-center sm:justify-between">
        <div className="hidden sm:block">
          <Button
            variant="outline"
            render={
              <Link href={`/${tenantSlug}/produtos/novo?tipo=servico`} />
            }
          >
            <Plus className="mr-2 size-4" />
            Criar serviço personalizado
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <p className="hidden text-sm text-muted-foreground sm:block">
            {selectedCount} selecionado{selectedCount === 1 ? "" : "s"}
          </p>
          <Button
            type="button"
            className="min-h-11 flex-1 sm:flex-none"
            disabled={pending || selectedCount === 0}
            onClick={onSubmit}
          >
            {addLabel}
          </Button>
        </div>
      </div>
      <div className="sm:hidden">
        <Button
          variant="outline"
          className="w-full"
          render={
            <Link href={`/${tenantSlug}/produtos/novo?tipo=servico`} />
          }
        >
          <Plus className="mr-2 size-4" />
          Criar serviço personalizado
        </Button>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium ${
        active
          ? "border-[var(--brand-gold)] bg-[var(--brand-gold)]/10 text-foreground"
          : "border-border text-muted-foreground hover:bg-muted/40"
      }`}
    >
      {children}
    </button>
  );
}
