"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FeedbackMessage } from "@/components/ui/feedback-message";
import { formatCurrency } from "@/lib/format";
import { changeOsStatusAction } from "@/lib/ordens/actions";
import { canTransition, OS_STATUS_LABELS, type OsStatus } from "@/lib/ordens/os-status";
import {
  BOARD_DROP_TARGET_STATUS,
  OPERACAO_BOARD_COLUMNS,
  type OperacaoBoardColumnKey,
} from "@/lib/operacoes/metricas";
import type { OperacaoBoardCard } from "@/lib/operacoes/centro-operacoes-service";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  board: Record<string, OperacaoBoardCard[]>;
  canAlterarStatus: boolean;
};

export function OperacaoBoard({
  tenantSlug,
  board: initialBoard,
  canAlterarStatus,
}: Props) {
  const router = useRouter();
  const [board, setBoard] = useState(initialBoard);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  function moveCard(osId: string, from: string, to: OperacaoBoardColumnKey) {
    if (from === to || !canAlterarStatus) return;
    const targetStatus = BOARD_DROP_TARGET_STATUS[to];
    const fromCards = board[from] ?? [];
    const card = fromCards.find((c) => c.id === osId);
    if (!card) return;
    if (!canTransition(card.status, targetStatus)) {
      setError(
        `Não é possível mover de "${OS_STATUS_LABELS[card.status as OsStatus] ?? card.status}" para esta etapa.`,
      );
      return;
    }

    setBoard((prev) => {
      const next = { ...prev };
      next[from] = (next[from] ?? []).filter((c) => c.id !== osId);
      next[to] = [
        { ...card, status: targetStatus, columnKey: to },
        ...(next[to] ?? []),
      ];
      return next;
    });
    setError(null);

    startTransition(async () => {
      const result = await changeOsStatusAction(tenantSlug, osId, {
        status: targetStatus,
        motivo: `Centro de Operações → ${to}`,
      });
      if (!result.success) {
        setError(result.error ?? "Falha ao alterar status.");
        setBoard(initialBoard);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}
      {pending ? (
        <p className="text-xs text-muted-foreground">Atualizando status…</p>
      ) : null}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {OPERACAO_BOARD_COLUMNS.map((col) => {
          const cards = board[col.key] ?? [];
          const isOver = overCol === col.key;
          return (
            <div
              key={col.key}
              className={cn(
                "min-w-[200px] w-[78vw] max-w-[260px] sm:min-w-[220px] sm:w-[240px] shrink-0 rounded-lg border bg-card p-2",
                isOver && "border-emerald-600 ring-2 ring-emerald-600/20",
              )}
              onDragOver={(e) => {
                if (!canAlterarStatus) return;
                e.preventDefault();
                setOverCol(col.key);
              }}
              onDragLeave={() => setOverCol(null)}
              onDrop={(e) => {
                e.preventDefault();
                setOverCol(null);
                const id = e.dataTransfer.getData("text/os-id");
                const from = e.dataTransfer.getData("text/os-from");
                if (id && from) moveCard(id, from, col.key);
              }}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <h3 className="text-xs font-semibold tracking-tight">
                  {col.label}
                </h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] tabular-nums">
                  {cards.length}
                </span>
              </div>
              <div className="space-y-2">
                {cards.length === 0 ? (
                  <p className="px-1 py-6 text-center text-[11px] text-muted-foreground">
                    Nenhuma OS nesta etapa
                  </p>
                ) : (
                  cards.map((card) => (
                    <BoardCard
                      key={card.id}
                      tenantSlug={tenantSlug}
                      card={card}
                      columnKey={col.key}
                      draggable={canAlterarStatus}
                      dragging={draggingId === card.id}
                      onDragStart={() => setDraggingId(card.id)}
                      onDragEnd={() => setDraggingId(null)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BoardCard({
  tenantSlug,
  card,
  columnKey,
  draggable,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  tenantSlug: string;
  card: OperacaoBoardCard;
  columnKey: string;
  draggable: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/os-id", card.id);
        e.dataTransfer.setData("text/os-from", columnKey);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "rounded-md border bg-background p-2.5 text-xs shadow-sm transition",
        card.atrasada && "border-rose-400/70 bg-rose-50/50 dark:bg-rose-950/20",
        card.semAtualizacao && !card.atrasada && "border-amber-400/60",
        dragging && "opacity-50",
        draggable && "cursor-grab active:cursor-grabbing",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/${tenantSlug}/ordens/${card.id}`}
          className="font-semibold underline-offset-2 hover:underline"
        >
          OS #{card.numero}
        </Link>
        <span className="text-[10px] uppercase text-muted-foreground">
          {card.prioridade}
        </span>
      </div>
      <p className="mt-1 truncate font-medium">{card.clienteNome ?? "—"}</p>
      <p className="truncate text-muted-foreground">
        {card.placa ?? "sem placa"}
        {card.modelo ? ` · ${card.modelo}` : ""}
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        {card.atrasada ? (
          <span className="rounded bg-rose-600/15 px-1.5 py-0.5 text-[10px] text-rose-800 dark:text-rose-300">
            Atrasada
          </span>
        ) : null}
        {card.semAtualizacao ? (
          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-800 dark:text-amber-300">
            Sem atualização
          </span>
        ) : null}
        {card.isGarantia ? (
          <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px]">
            Garantia
          </span>
        ) : null}
        {card.isRetorno ? (
          <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px]">
            Retorno
          </span>
        ) : null}
      </div>
      <div className="mt-2 space-y-0.5 text-[10px] text-muted-foreground">
        <p>Entrada: {card.dataAbertura.slice(0, 10)}</p>
        <p>
          Prazo:{" "}
          {card.previsaoEntrega
            ? card.previsaoEntrega.slice(0, 10)
            : "sem prazo"}
        </p>
        <p>Mecânico: {card.mecanicoNome ?? "—"}</p>
        <p>Consultor: {card.consultorNome ?? "—"}</p>
        <p className="font-medium text-foreground">
          {formatCurrency(card.valorEstimado)}
        </p>
        {card.horasNaEtapa != null ? (
          <p>{card.horasNaEtapa}h nesta etapa</p>
        ) : null}
      </div>
    </div>
  );
}
