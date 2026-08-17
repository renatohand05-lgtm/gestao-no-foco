"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  cancelAgendaEventAction,
  deleteAgendaEventAction,
  duplicateAgendaEventAction,
  rescheduleAgendaEventAction,
  setAgendaEventStatusAction,
} from "@/lib/agenda/actions";
import {
  convertAgendaToTarefaAction,
  startAttendanceFromAgendaAction,
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
  natureza?: string | null;
  origem?: string | null;
  ordem_servico_id?: string | null;
};

type CopyLabels = {
  confirmAppointmentLabel: string;
  clientArrivedLabel: string;
  startAttendanceLabel: string;
  rescheduleAppointmentLabel: string;
  noShowLabel: string;
  workOrder: string;
};

type Props = {
  tenantSlug: string;
  events: Event[];
  copy: CopyLabels;
  canStartAttendance?: boolean;
};

const CLOSED = new Set(["cancelado", "nao_compareceu", "concluido", "realizado"]);

export function AgendaEventListActions({
  tenantSlug,
  events,
  copy,
  canStartAttendance = true,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(
    fn: () => Promise<{
      success: boolean;
      error?: string;
      redirectPath?: string;
    }>,
  ) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.success) {
        setError(res.error ?? "Falha");
        return;
      }
      if (res.redirectPath) {
        router.push(res.redirectPath);
        return;
      }
      router.refresh();
    });
  }

  function reschedule(ev: Event) {
    const next = window.prompt(
      "Novo início (AAAA-MM-DDTHH:mm)",
      ev.inicio.slice(0, 16),
    );
    if (!next) return;
    const start = new Date(next);
    if (Number.isNaN(start.getTime())) {
      setError("Data inválida.");
      return;
    }
    const duration = Date.parse(ev.fim) - Date.parse(ev.inicio);
    const fim = new Date(start.getTime() + Math.max(duration, 60_000)).toISOString();
    run(() =>
      rescheduleAgendaEventAction(tenantSlug, ev.id, start.toISOString(), fim),
    );
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
        {events.map((ev) => {
          const natureza = ev.natureza || ev.origem;
          const isCliente = natureza === "cliente";
          const closed = CLOSED.has(ev.status);
          return (
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
                {isCliente && !closed ? (
                  <>
                    <button
                      type="button"
                      disabled={pending}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "min-h-11",
                      )}
                      onClick={() =>
                        run(() =>
                          setAgendaEventStatusAction(
                            tenantSlug,
                            ev.id,
                            "confirmado",
                          ),
                        )
                      }
                    >
                      {copy.confirmAppointmentLabel}
                    </button>
                    {canStartAttendance ? (
                      <>
                        <button
                          type="button"
                          disabled={pending}
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                            "min-h-11",
                          )}
                          onClick={() =>
                            run(() =>
                              startAttendanceFromAgendaAction(
                                tenantSlug,
                                ev.id,
                                "arrived",
                              ),
                            )
                          }
                        >
                          {copy.clientArrivedLabel}
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          className={cn(
                            buttonVariants({ size: "sm" }),
                            "min-h-11",
                          )}
                          onClick={() =>
                            run(() =>
                              startAttendanceFromAgendaAction(
                                tenantSlug,
                                ev.id,
                                "start",
                              ),
                            )
                          }
                        >
                          {copy.startAttendanceLabel}
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      disabled={pending}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "min-h-11",
                      )}
                      onClick={() => reschedule(ev)}
                    >
                      {copy.rescheduleAppointmentLabel}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "min-h-11",
                      )}
                      onClick={() =>
                        run(() =>
                          setAgendaEventStatusAction(
                            tenantSlug,
                            ev.id,
                            "nao_compareceu",
                          ),
                        )
                      }
                    >
                      {copy.noShowLabel}
                    </button>
                  </>
                ) : null}
                {ev.ordem_servico_id ? (
                  <button
                    type="button"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "min-h-11",
                    )}
                    onClick={() =>
                      router.push(
                        `/${tenantSlug}/ordens/${ev.ordem_servico_id}`,
                      )
                    }
                  >
                    Abrir {copy.workOrder.toLowerCase()}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={pending}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "min-h-11",
                  )}
                  onClick={() =>
                    run(() => duplicateAgendaEventAction(tenantSlug, ev.id))
                  }
                >
                  Duplicar
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "min-h-11",
                  )}
                  onClick={() =>
                    run(() => cancelAgendaEventAction(tenantSlug, ev.id))
                  }
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "min-h-11",
                  )}
                  onClick={() =>
                    run(() => convertAgendaToTarefaAction(tenantSlug, ev.id))
                  }
                >
                  → Tarefa
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className={cn(
                    buttonVariants({ variant: "destructive", size: "sm" }),
                    "min-h-11",
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
          );
        })}
      </ul>
    </div>
  );
}
