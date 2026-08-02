"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  cancelAgendaEventAction,
  deleteAgendaEventAction,
  duplicateAgendaEventAction,
} from "@/lib/agenda/actions";
import {
  convertAgendaToOsAction,
  convertAgendaToTarefaAction,
} from "@/lib/crm/phase28/conversion-actions";
import { labelAgendaStatus, labelAgendaTipo } from "@/lib/agenda/labels";
import { cn } from "@/lib/utils";

type Event = {
  id: string;
  titulo: string;
  inicio: string;
  fim: string;
  tipo: string;
  status: string;
};

type Props = {
  tenantSlug: string;
  events: Event[];
};

export function AgendaEventListActions({ tenantSlug, events }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.success) {
        setError(res.error ?? "Falha");
        return;
      }
      router.refresh();
    });
  }

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhum evento no período.</p>
    );
  }

  return (
    <div className="space-y-2" data-phase28="agenda-list">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="divide-y rounded-xl border">
        {events.map((ev) => (
          <li
            key={ev.id}
            className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
          >
            <div>
              <div className="font-medium">{ev.titulo}</div>
              <div className="text-xs text-muted-foreground">
                {ev.inicio.slice(0, 16).replace("T", " ")} ·{" "}
                {labelAgendaTipo(ev.tipo)} · {labelAgendaStatus(ev.status)}
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                disabled={pending}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                onClick={() =>
                  run(() => duplicateAgendaEventAction(tenantSlug, ev.id))
                }
              >
                Duplicar
              </button>
              <button
                type="button"
                disabled={pending}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                onClick={() =>
                  run(() => cancelAgendaEventAction(tenantSlug, ev.id))
                }
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={pending}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                onClick={() =>
                  run(() => convertAgendaToTarefaAction(tenantSlug, ev.id))
                }
              >
                → Tarefa
              </button>
              <button
                type="button"
                disabled={pending}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                onClick={() =>
                  run(() => convertAgendaToOsAction(tenantSlug, ev.id))
                }
              >
                → OS
              </button>
              <button
                type="button"
                disabled={pending}
                className={cn(
                  buttonVariants({ variant: "destructive", size: "sm" }),
                )}
                onClick={() => {
                  if (!confirm("Excluir evento?")) return;
                  run(() => deleteAgendaEventAction(tenantSlug, ev.id));
                }}
              >
                Excluir
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
