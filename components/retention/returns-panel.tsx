"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import { ReturnQuickCreate } from "@/components/retention/return-quick-create";
import {
  openReturnWhatsAppAction,
  setReturnStatusAction,
} from "@/lib/retention/actions";
import { RETURN_STATUS_LABELS } from "@/lib/retention/returns";
import type { CustomerReturnRow } from "@/lib/retention/types";
import { agendaHref } from "@/lib/ux/fast-input";
import { cn } from "@/lib/utils";

type ClienteOpt = { id: string; nome: string; telefone?: string | null; email?: string | null };

type Props = {
  tenantSlug: string;
  rows: Array<
    CustomerReturnRow & {
      clienteNome: string;
      telefone: string | null;
      email: string | null;
    }
  >;
  clientes: ClienteOpt[];
  showVehicle: boolean;
  hideProcedure?: boolean;
  initialClienteId?: string;
};

export function ReturnsPanel({
  tenantSlug,
  rows,
  clientes,
  showVehicle,
  hideProcedure = false,
  initialClienteId,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6" data-phase35="retornos-panel">
      <div className="rounded-xl border p-4">
        <ReturnQuickCreate
          tenantSlug={tenantSlug}
          clienteId={initialClienteId ?? clientes[0]?.id ?? ""}
          clientes={clientes}
          showVehicle={showVehicle}
          hideProcedure={hideProcedure}
          onCreated={() => router.refresh()}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="py-2 pr-3">Cliente</th>
              <th className="py-2 pr-3">Contato</th>
              <th className="py-2 pr-3">Último serviço</th>
              <th className="py-2 pr-3">Última visita</th>
              <th className="py-2 pr-3">Próximo retorno</th>
              {showVehicle ? <th className="py-2 pr-3">Km</th> : null}
              <th className="py-2 pr-3">Motivo</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2">Ação</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  className="py-4 text-muted-foreground"
                  colSpan={showVehicle ? 9 : 8}
                >
                  Nenhum retorno previsto. A migration 35.2 precisa estar aplicada
                  para persistir.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="py-2 pr-3">{row.clienteNome}</td>
                  <td className="py-2 pr-3 text-xs">
                    {row.telefone ?? "—"}
                    <br />
                    {row.email ?? ""}
                  </td>
                  <td className="py-2 pr-3">
                    {row.last_service_label ?? "—"}
                  </td>
                  <td className="py-2 pr-3">{row.last_visit_at ?? "—"}</td>
                  <td className="py-2 pr-3 tabular-nums">{row.due_at}</td>
                  {showVehicle ? (
                    <td className="py-2 pr-3 text-xs">
                      {row.last_km ?? "—"} → {row.next_km ?? "—"}
                    </td>
                  ) : null}
                  <td className="py-2 pr-3">{row.motivo ?? "—"}</td>
                  <td className="py-2 pr-3">
                    {RETURN_STATUS_LABELS[
                      row.status as keyof typeof RETURN_STATUS_LABELS
                    ] ?? row.status}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        disabled={pending}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                        )}
                        onClick={() =>
                          startTransition(async () => {
                            const res = await openReturnWhatsAppAction(
                              tenantSlug,
                              row.id,
                            );
                            if (res.success && "waLink" in res && res.waLink) {
                              window.open(res.waLink, "_blank", "noopener");
                            } else if (!res.success) alert(res.error);
                            else alert(res.note);
                            router.refresh();
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
                        onClick={() =>
                          startTransition(async () => {
                            await setReturnStatusAction(tenantSlug, {
                              id: row.id,
                              status: "cliente_respondeu_sim",
                            });
                            router.refresh();
                          })
                        }
                      >
                        Cliente respondeu SIM
                      </button>
                      <a
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                        )}
                        href={agendaHref(tenantSlug, {
                          natureza: "cliente",
                          clienteId: row.cliente_id,
                          servicoId: row.produto_id,
                          profissionalId: row.profissional_id,
                          returnId: row.id,
                        })}
                      >
                        Agendar
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
