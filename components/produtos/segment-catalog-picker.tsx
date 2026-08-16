"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
};

export function SegmentCatalogPicker({
  tenantSlug,
  items,
  existingCount,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? items.filter(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            item.category.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q),
        )
      : items;
    return groupLibraryByCategory(filtered);
  }, [items, query]);

  const visibleIds = useMemo(
    () => [...grouped.values()].flat().map((item) => item.id),
    [grouped],
  );
  const recommendedIds = useMemo(
    () => items.filter((item) => item.recommended).map((item) => item.id),
    [items],
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
      router.push(
        `/${tenantSlug}/produtos?library=1&added=${result.created}&skipped=${result.skippedDuplicate}`,
      );
      router.refresh();
    });
  }

  const selectedCount = selected.size;

  return (
    <div className="relative space-y-6">
      <LoadingOverlay loading={pending} label="Adicionando selecionados..." />

      {error ? (
        <FeedbackMessage variant="error">{error}</FeedbackMessage>
      ) : null}

      {existingCount > 0 ? (
        <FeedbackMessage variant="info">
          Serviços equivalentes aos que você já cadastrou não serão duplicados.
        </FeedbackMessage>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="block w-full max-w-md text-sm">
          <span className="mb-1 block text-muted-foreground">Buscar</span>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrar por nome ou categoria"
            aria-label="Buscar sugestões"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => selectIds(recommendedIds, true)}
          >
            Selecionar recomendados
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
            Limpar
          </Button>
        </div>
      </div>

      {[...grouped.entries()].map(([category, groupItems]) => {
        const groupIds = groupItems.map((item) => item.id);
        const allOn = groupIds.every((id) => selected.has(id));
        return (
          <section
            key={category}
            className="rounded-xl border border-border/60 bg-card p-4 shadow-[var(--elevation-card)]"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold tracking-tight">{category}</h2>
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
                      className="mt-1 size-4 accent-[var(--brand-gold)]"
                      checked={selected.has(item.id)}
                      onChange={() => toggle(item.id)}
                    />
                    <span>
                      <span className="block text-sm font-medium">
                        {item.name}
                        {item.recommended ? (
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-[var(--brand-gold)]">
                            recomendado
                          </span>
                        ) : null}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {item.description}
                        {item.defaultDurationMinutes
                          ? ` · ${item.defaultDurationMinutes} min`
                          : ""}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="outline"
          render={
            <Link href={`/${tenantSlug}/produtos/novo?tipo=servico`} />
          }
        >
          <Plus className="mr-2 size-4" />
          Criar serviço personalizado
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">
            {selectedCount} selecionado{selectedCount === 1 ? "" : "s"}
          </p>
          <Button
            type="button"
            className="min-h-11"
            disabled={pending || selectedCount === 0}
            onClick={onSubmit}
          >
            Adicionar selecionados
          </Button>
        </div>
      </div>
    </div>
  );
}
