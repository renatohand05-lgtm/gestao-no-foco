"use client";

import { memo, useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Search } from "lucide-react";

import { CrmScoreBadges } from "@/components/crm/crm-score-badges";
import { CrmTagBadges } from "@/components/crm/crm-tag-badges";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
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

function formatDays(n: number) {
  if (n <= 0) return "hoje";
  if (n === 1) return "1 dia";
  return `${n} dias`;
}

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
  const [query, setQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [minScore, setMinScore] = useState(0);
  const [collapsed, setCollapsed] = useState<Partial<Record<CrmFunilStage, boolean>>>(
    {},
  );

  const owners = useMemo(() => {
    const map = new Map<string, string>();
    for (const stage of CRM_FUNIL_STAGES) {
      for (const c of columns[stage] ?? []) {
        if (c.consultor_id) {
          map.set(c.consultor_id, c.consultor_nome ?? c.consultor_id.slice(0, 8));
        }
      }
    }
    return [...map.entries()];
  }, [columns]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = {} as Record<CrmFunilStage, CrmFunilCard[]>;
    for (const stage of CRM_FUNIL_STAGES) {
      out[stage] = (columns[stage] ?? []).filter((c) => {
        if (ownerFilter !== "all" && c.consultor_id !== ownerFilter) return false;
        if (
          priorityFilter !== "all" &&
          (c.prioridade_crm ?? "").toLowerCase() !== priorityFilter
        ) {
          return false;
        }
        if ((c.commercial_score ?? c.score) < minScore) return false;
        if (!q) return true;
        return (
          c.nome.toLowerCase().includes(q) ||
          (c.proxima_acao ?? "").toLowerCase().includes(q) ||
          (c.consultor_nome ?? "").toLowerCase().includes(q)
        );
      });
    }
    return out;
  }, [columns, query, ownerFilter, priorityFilter, minScore]);

  const stats = useMemo(() => {
    return CRM_FUNIL_STAGES.map((estagio) => {
      const cards = filtered[estagio] ?? [];
      return {
        estagio,
        total: cards.length,
        valor_total: cards.reduce((a, c) => a + c.valor_pipeline, 0),
      };
    });
  }, [filtered]);

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

  const totalCards = stats.reduce((a, s) => a + s.total, 0);

  return (
    <div className="space-y-4" data-crm-premium="pipeline">
      {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}

      <div
        className="flex flex-col gap-3 rounded-lg border bg-card/50 p-3 sm:flex-row sm:flex-wrap sm:items-end"
        role="search"
        aria-label="Filtros do pipeline"
      >
        <label className="relative min-w-[12rem] flex-1 text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">Busca</span>
          <Search
            className="pointer-events-none absolute bottom-2.5 left-2.5 size-4 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cliente, ação, responsável…"
            className="pl-8"
            aria-label="Buscar no pipeline"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">Responsável</span>
          <select
            className="h-9 w-full min-w-[10rem] rounded-md border bg-background px-2 text-sm"
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            aria-label="Filtrar por responsável"
          >
            <option value="all">Todos</option>
            {owners.map(([id, nome]) => (
              <option key={id} value={id}>
                {nome}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">Prioridade</span>
          <select
            className="h-9 w-full min-w-[8rem] rounded-md border bg-background px-2 text-sm"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Filtrar por prioridade"
          >
            <option value="all">Todas</option>
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
            <option value="normal">Normal</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">
            Score mín. ({minScore})
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="w-36"
            aria-label="Score comercial mínimo"
          />
        </label>
        <p className="text-xs text-muted-foreground sm:ml-auto">
          {totalCards} cards · {formatCurrency(stats.reduce((a, s) => a + s.valor_total, 0))}
        </p>
      </div>

      <div
        className="grid gap-4 xl:grid-cols-6 lg:grid-cols-3 md:grid-cols-2"
        role="list"
        aria-label="Colunas do funil comercial"
      >
        {CRM_FUNIL_STAGES.map((stage) => {
          const stat = stats.find((s) => s.estagio === stage);
          const isOver = overStage === stage;
          const isCollapsed = Boolean(collapsed[stage]);
          const cards = filtered[stage] ?? [];
          return (
            <div
              key={stage}
              role="listitem"
              aria-label={`${CRM_FUNIL_LABELS[stage]}: ${stat?.total ?? 0} cards`}
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
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() =>
                      setCollapsed((prev) => ({ ...prev, [stage]: !prev[stage] }))
                    }
                    aria-expanded={!isCollapsed}
                    aria-controls={`funil-col-${stage}`}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="size-3.5" aria-hidden />
                    ) : (
                      <ChevronDown className="size-3.5" aria-hidden />
                    )}
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        CRM_FUNIL_COLORS[stage],
                      )}
                    >
                      {CRM_FUNIL_LABELS[stage]}
                    </span>
                  </button>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {stat?.total ?? 0}
                  </span>
                </div>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {formatCurrency(stat?.valor_total ?? 0)}
                </p>
              </div>
              {!isCollapsed ? (
                <div id={`funil-col-${stage}`} className="space-y-2">
                  {cards.length === 0 ? (
                    <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                      Nenhum card
                    </p>
                  ) : (
                    cards.map((card) => (
                      <article
                        key={card.id}
                        draggable={!pending}
                        tabIndex={0}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/cliente-id", card.id);
                          e.dataTransfer.setData("text/from-stage", stage);
                          setDraggingId(card.id);
                        }}
                        onDragEnd={() => setDraggingId(null)}
                        className={cn(
                          "cursor-grab rounded-md border bg-background p-3 shadow-xs transition-all duration-200 hover:border-primary/40 active:cursor-grabbing",
                          draggingId === card.id && "scale-[0.98] opacity-60",
                        )}
                        aria-grabbed={draggingId === card.id}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/${tenantSlug}/clientes/${card.id}`}
                            className="text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {card.nome}
                          </Link>
                          {card.prioridade_crm ? (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                              {card.prioridade_crm}
                            </span>
                          ) : null}
                        </div>
                        <CrmScoreBadges
                          score={card.commercial_score ?? card.score}
                          classificacao={card.classificacao}
                          className="mt-2"
                        />
                        <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                          <div>
                            <dt className="sr-only">Valor</dt>
                            <dd className="tabular-nums font-medium text-foreground">
                              {formatCurrency(card.valor_pipeline)}
                            </dd>
                          </div>
                          <div>
                            <dt className="inline">Prob. </dt>
                            <dd className="inline tabular-nums">
                              {card.probabilidade != null
                                ? `${card.probabilidade}%`
                                : "—"}
                            </dd>
                          </div>
                          <div className="col-span-2">
                            <dt className="inline">Resp. </dt>
                            <dd className="inline">
                              {card.consultor_nome ?? "Sem responsável"}
                            </dd>
                          </div>
                          <div className="col-span-2">
                            <dt className="inline">Últ. contato </dt>
                            <dd className="inline">
                              {card.ultimo_contato_at
                                ? formatDays(card.tempo_parado_dias)
                                : "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="inline">Idade </dt>
                            <dd className="inline">{formatDays(card.idade_dias)}</dd>
                          </div>
                          <div>
                            <dt className="inline">Parado </dt>
                            <dd className="inline">
                              {formatDays(card.tempo_parado_dias)}
                            </dd>
                          </div>
                          {card.proxima_acao ? (
                            <div className="col-span-2">
                              <dt className="inline">Próx. </dt>
                              <dd className="inline line-clamp-2">
                                {card.proxima_acao}
                                {card.data_proxima_acao
                                  ? ` · ${card.data_proxima_acao}`
                                  : ""}
                              </dd>
                            </div>
                          ) : null}
                        </dl>
                        {card.tags.length ? (
                          <CrmTagBadges tags={card.tags} className="mt-2" />
                        ) : null}
                      </article>
                    ))
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Coluna recolhida</p>
              )}
            </div>
          );
        })}
      </div>
      {initialStats ? null : null}
    </div>
  );
});
