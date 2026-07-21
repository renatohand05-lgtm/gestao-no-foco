"use client";

import { memo, useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { CrmScoreBadges } from "@/components/crm/crm-score-badges";
import { CrmTagBadges } from "@/components/crm/crm-tag-badges";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { moveFunilStageAction } from "@/lib/crm/actions";
import {
  CRM_FUNIL_COLORS,
  CRM_FUNIL_LABELS,
  CRM_FUNIL_STAGES,
  type CrmFunilStage,
} from "@/lib/crm/constants";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CrmFunilCard } from "@/types/crm";

type ColumnStats = { estagio: CrmFunilStage; total: number; valor_total: number };

type CrmFunilBoardProps = {
  tenantSlug: string;
  columns: Record<CrmFunilStage, CrmFunilCard[]>;
  columnStats?: ColumnStats[];
};

export const CrmFunilBoard = memo(function CrmFunilBoard({
  tenantSlug,
  columns: initialColumns,
  columnStats: initialStats,
}: CrmFunilBoardProps) {
  const router = useRouter();
  const [columns, setColumns] = useState(initialColumns);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<CrmFunilStage | null>(null);

  const stats = useMemo(() => {
    if (initialStats?.length) return initialStats;
    return CRM_FUNIL_STAGES.map((estagio) => {
      const cards = columns[estagio] ?? [];
      return {
        estagio,
        total: cards.length,
        valor_total: cards.reduce((a, c) => a + c.valor_pipeline, 0),
      };
    });
  }, [columns, initialStats]);

  const moveCard = useCallback(
    (clienteId: string, from: CrmFunilStage, to: CrmFunilStage) => {
      if (from === to) return;
      setColumns((prev) => {
        const next = { ...prev };
        const card = next[from].find((c) => c.id === clienteId);
        if (!card) return prev;
        next[from] = next[from].filter((c) => c.id !== clienteId);
        next[to] = [{ ...card, estagio_funil: to }, ...next[to]];
        return next;
      });
      setError(null);
      startTransition(async () => {
        const result = await moveFunilStageAction(tenantSlug, clienteId, to);
        if (!result.success) {
          setError(result.error ?? "Erro ao mover card.");
          setColumns(initialColumns);
          return;
        }
        router.refresh();
      });
    },
    [tenantSlug, initialColumns, router],
  );

  return (
    <div className="space-y-4">
      {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}
      <div className="grid gap-4 xl:grid-cols-6 lg:grid-cols-3 md:grid-cols-2">
        {CRM_FUNIL_STAGES.map((stage) => {
          const stat = stats.find((s) => s.estagio === stage);
          const isOver = overStage === stage;
          return (
            <div
              key={stage}
              className={cn(
                "rounded-lg border bg-card p-3 transition-colors duration-200",
                isOver && "border-primary ring-2 ring-primary/20",
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setOverStage(stage);
              }}
              onDragLeave={() => setOverStage(null)}
              onDrop={(e) => {
                e.preventDefault();
                setOverStage(null);
                const id = e.dataTransfer.getData("text/cliente-id");
                const from = e.dataTransfer.getData("text/from-stage") as CrmFunilStage;
                if (id && from) moveCard(id, from, stage);
                setDraggingId(null);
              }}
            >
              <div className="mb-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      CRM_FUNIL_COLORS[stage],
                    )}
                  >
                    {CRM_FUNIL_LABELS[stage]}
                  </span>
                  <span className="text-xs text-muted-foreground">{stat?.total ?? 0}</span>
                </div>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatCurrency(stat?.valor_total ?? 0)}
                </p>
              </div>
              <div className="space-y-2">
                {(columns[stage] ?? []).map((card) => (
                  <article
                    key={card.id}
                    draggable={!pending}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/cliente-id", card.id);
                      e.dataTransfer.setData("text/from-stage", stage);
                      setDraggingId(card.id);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    className={cn(
                      "cursor-grab rounded-md border bg-background p-3 shadow-xs transition-all duration-200 active:cursor-grabbing",
                      draggingId === card.id && "scale-[0.98] opacity-60",
                    )}
                  >
                    <Link
                      href={`/${tenantSlug}/clientes/${card.id}`}
                      className="text-sm font-medium hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {card.nome}
                    </Link>
                    <CrmScoreBadges
                      score={card.score}
                      classificacao={card.classificacao}
                      className="mt-2"
                    />
                    {card.tags.length ? (
                      <CrmTagBadges tags={card.tags} className="mt-2" />
                    ) : null}
                    <p className="mt-2 text-xs tabular-nums text-muted-foreground">
                      {formatCurrency(card.valor_pipeline)}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
