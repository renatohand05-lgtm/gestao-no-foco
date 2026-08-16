"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  rescheduleAgendaEventAction,
  setAgendaEventStatusAction,
} from "@/lib/agenda/actions";
import { openAppointmentWhatsAppAction } from "@/lib/retention/actions";
import { CLIENT_APPOINTMENT_STATUS_LABELS } from "@/lib/retention/natures";
import { cn } from "@/lib/utils";

export type ClienteAgendadoRow = {
  id: string;
  inicio: string;
  fim: string;
  status: string;
  clienteId: string | null;
  clienteNome: string;
  servico: string;
  profissional: string;
  telefone: string | null;
  email: string | null;
};

type Props = {
  tenantSlug: string;
  rows: ClienteAgendadoRow[];
};

export function ClientesAgendadosPanel({ tenantSlug, rows }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await fn();
      if (!res.success) {
        alert(res.error ?? "Falha");
        return;
      }
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum cliente agendado neste período.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto" data-phase35="clientes-agendados">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="py-2 pr-3">Horário</th>
            <th className="py-2 pr-3">Cliente</th>
            <th className="py-2 pr-3">Serviço</th>
            <th className="py-2 pr-3">Profissional</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2 pr-3">Contato</th>
            <th className="py-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b align-top">
              <td className="py-2 pr-3 tabular-nums">
                {row.inicio.slice(11, 16)}
              </td>
              <td className="py-2 pr-3">{row.clienteNome}</td>
              <td className="py-2 pr-3">{row.servico}</td>
              <td className="py-2 pr-3">{row.profissional}</td>
              <td className="py-2 pr-3">
                {CLIENT_APPOINTMENT_STATUS_LABELS[
                  row.status as keyof typeof CLIENT_APPOINTMENT_STATUS_LABELS
                ] ?? row.status}
              </td>
              <td className="py-2 pr-3 text-xs">
                {row.telefone ?? "—"}
                <br />
                {row.email ?? ""}
              </td>
              <td className="py-2">
                <div className="flex max-w-[280px] flex-wrap gap-1">
                  {[
                    ["confirmado", "Confirmar"],
                    ["cliente_chegou", "Chegou"],
                    ["em_atendimento", "Iniciar"],
                    ["concluido", "Concluir"],
                    ["cancelado", "Cancelar"],
                    ["nao_compareceu", "Não compareceu"],
                  ].map(([st, label]) => (
                    <button
                      key={st}
                      type="button"
                      disabled={pending}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                      )}
                      onClick={() =>
                        run(() =>
                          setAgendaEventStatusAction(tenantSlug, row.id, st),
                        )
                      }
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={pending || !row.clienteId || !row.telefone}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                    )}
                    onClick={() =>
                      startTransition(async () => {
                        if (!row.clienteId) return;
                        const res = await openAppointmentWhatsAppAction(
                          tenantSlug,
                          {
                            eventId: row.id,
                            clienteId: row.clienteId,
                            phone: row.telefone,
                            templateCode: "LEMBRETE",
                            messageCtx: {
                              cliente_nome: row.clienteNome,
                              servico: row.servico,
                              profissional: row.profissional,
                              data: row.inicio.slice(0, 10),
                              hora: row.inicio.slice(11, 16),
                            },
                          },
                        );
                        if (res.success && "waLink" in res && res.waLink) {
                          window.open(res.waLink, "_blank", "noopener");
                        } else if (!res.success) {
                          alert(res.error);
                        } else {
                          alert(res.note);
                        }
                      })
                    }
                  >
                    WhatsApp
                  </button>
                  {row.email ? (
                    <a
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                      )}
                      href={`mailto:${row.email}`}
                    >
                      E-mail
                    </a>
                  ) : null}
                  <button
                    type="button"
                    disabled={pending}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                    )}
                    onClick={() => {
                      const next = window.prompt(
                        "Novo início (YYYY-MM-DDTHH:MM)",
                        row.inicio.slice(0, 16),
                      );
                      if (!next) return;
                      const start = new Date(next).toISOString();
                      const dur =
                        Date.parse(row.fim) - Date.parse(row.inicio);
                      const end = new Date(Date.parse(start) + dur).toISOString();
                      run(() =>
                        rescheduleAgendaEventAction(
                          tenantSlug,
                          row.id,
                          start,
                          end,
                        ),
                      );
                    }}
                  >
                    Reagendar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
