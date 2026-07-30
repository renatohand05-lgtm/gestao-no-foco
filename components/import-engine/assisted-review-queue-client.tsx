"use client";

import { useMemo, useState, useTransition } from "react";
import { Keyboard, ListChecks } from "lucide-react";

import { ConfidenceBadge } from "@/components/import-engine/confidence-badge";
import { SuggestionExplanationPanel } from "@/components/import-engine/suggestion-explanation-panel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { gofMotion } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import {
  applyReviewDecision,
  explainClassification,
  type ReviewAction,
  type ReviewQueueItem,
} from "@/lib/import-engine/assisted-intelligence";

type Props = {
  initialItems: ReviewQueueItem[];
  onBatchConfirm?: (ids: string[]) => void;
};

type StatusFilter = "all" | ReviewQueueItem["status"];
type ConfidenceFilter = "all" | "baixa" | "media" | "alta";

function matchesConfidence(
  item: ReviewQueueItem,
  filter: ConfidenceFilter,
): boolean {
  if (filter === "all") return true;
  const band = item.decision.overallBand;
  if (filter === "baixa") return band === "low";
  if (filter === "media") return band === "medium";
  return band === "high";
}

export function AssistedReviewQueueClient({ initialItems, onBatchConfirm }: Props) {
  const [items, setItems] = useState(initialItems);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focusId, setFocusId] = useState<string | null>(initialItems[0]?.id ?? null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>("all");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      return matchesConfidence(item, confidenceFilter);
    });
  }, [items, statusFilter, confidenceFilter]);

  const focus = useMemo(
    () => filtered.find((i) => i.id === focusId) ?? filtered[0] ?? null,
    [filtered, focusId],
  );

  function runAction(item: ReviewQueueItem, action: ReviewAction, editedCategory?: string) {
    startTransition(() => {
      const result = applyReviewDecision({ item, action, editedCategory });
      if (!result.ok) return;
      setItems((prev) => prev.map((p) => (p.id === item.id ? result.item : p)));
    });
  }

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function confirmBatch() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (!window.confirm(`Confirmar ${ids.length} item(ns) selecionado(s)?`)) return;
    startTransition(() => {
      setItems((prev) =>
        prev.map((item) => {
          if (!selected.has(item.id)) return item;
          const result = applyReviewDecision({ item, action: "confirm" });
          return result.ok ? result.item : item;
        }),
      );
      onBatchConfirm?.(ids);
      setSelected(new Set());
    });
  }

  if (!items.length) {
    return (
      <EmptyState
        icon={ListChecks}
        title="Fila de revisão vazia"
        description="Não há linhas pendentes de baixa confiança neste momento."
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Revisão humana</CardTitle>
            <CardDescription>
              Nenhuma linha de baixa confiança é confirmada silenciosamente.
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={pending || selected.size === 0}
            onClick={confirmBatch}
            data-batch-confirm
          >
            Confirmar lote ({selected.size})
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            className={cn(
              "flex items-start gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground",
              gofMotion.fade,
            )}
            data-keyboard-hints
          >
            <Keyboard className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <p>
              <strong className="text-foreground">Atalhos:</strong> clique na linha
              para focar · checkbox + Confirmar lote (com confirmação) · Enter no
              botão Confirmar da linha focada.
            </p>
          </div>

          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Filtros da fila de revisão"
            data-review-filters
          >
            <FilterSelect
              label="Status"
              value={statusFilter}
              options={[
                { value: "all", label: "Todos" },
                { value: "pending", label: "Pendentes" },
                { value: "confirmed", label: "Confirmados" },
                { value: "edited", label: "Editados" },
                { value: "ignored", label: "Ignorados" },
                { value: "duplicate", label: "Duplicados" },
              ]}
              onChange={(v) => setStatusFilter(v as StatusFilter)}
            />
            <FilterSelect
              label="Confiança"
              value={confidenceFilter}
              options={[
                { value: "all", label: "Todas" },
                { value: "baixa", label: "Baixa" },
                { value: "media", label: "Média" },
                { value: "alta", label: "Alta" },
              ]}
              onChange={(v) => setConfidenceFilter(v as ConfidenceFilter)}
            />
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground" role="status">
              Nenhum item corresponde aos filtros selecionados.
            </p>
          ) : null}

          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-md border border-border/60 p-3"
              data-review-item={item.id}
            >
              <input
                type="checkbox"
                className="mt-1 size-4 accent-primary"
                checked={selected.has(item.id)}
                onChange={(e) => toggle(item.id, e.target.checked)}
                aria-label={`Selecionar linha ${item.rowNumber}`}
              />
              <button
                type="button"
                className="flex-1 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                onClick={() => setFocusId(item.id)}
                aria-pressed={focusId === item.id}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">Linha {item.rowNumber}</span>
                  <ConfidenceBadge
                    band={item.decision.overallBand}
                    percent={item.decision.overallConfidence}
                    origin={item.decision.winningOrigin}
                  />
                  <span className="text-muted-foreground">{item.status}</span>
                </div>
                <p className="mt-1 text-muted-foreground">{item.description || "—"}</p>
              </button>
              <div className="flex flex-col gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={pending || item.status !== "pending"}
                  onClick={() => runAction(item, "confirm")}
                >
                  Confirmar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    const next = window.prompt(
                      "Nova categoria",
                      item.decision.category.value ?? "",
                    );
                    if (next) runAction(item, "edit", next);
                  }}
                >
                  Editar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => runAction(item, "ignore")}
                >
                  Ignorar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => runAction(item, "mark_duplicate")}
                >
                  Duplicado
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => runAction(item, "create_rule")}
                >
                  Criar regra
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {focus ? (
        <SuggestionExplanationPanel
          title={`Explicação — linha ${focus.rowNumber}`}
          explanation={explainClassification(focus.decision).category}
        />
      ) : null}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  const id = `review-filter-${label.toLowerCase()}`;
  return (
    <label htmlFor={id} className="inline-flex items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-md border border-border/60 bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Filtrar por ${label}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
