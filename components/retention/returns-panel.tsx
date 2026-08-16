"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  createManualReturnAction,
  openReturnWhatsAppAction,
  setReturnStatusAction,
} from "@/lib/retention/actions";
import {
  RETURN_PRESET_DAYS,
  RETURN_PRESET_LABELS,
  RETURN_STATUS_LABELS,
} from "@/lib/retention/returns";
import type { CustomerReturnRow } from "@/lib/retention/types";
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
  segment: string | null;
};

export function ReturnsPanel({
  tenantSlug,
  rows,
  clientes,
  showVehicle,
  segment,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [clienteId, setClienteId] = useState(clientes[0]?.id ?? "");
  const [preset, setPreset] = useState(30);
  const [motivo, setMotivo] = useState("Retorno recomendado");
  const [lastKm, setLastKm] = useState("");
  const [mileage, setMileage] = useState(segment === "oficina" ? "10000" : "");
  const [placa, setPlaca] = useState("");

  return (
    <div className="space-y-6" data-phase35="retornos-panel">
      <form
        className="grid gap-2 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const res = await createManualReturnAction(tenantSlug, {
              clienteId,
              presetDays: preset,
              motivo,
              lastKm: lastKm ? Number(lastKm) : null,
              mileageKm: mileage ? Number(mileage) : null,
              placa: placa || null,
              hideProcedure:
                segment === "clinica_estetica" ||
                segment === "consultorio_odontologico",
            });
            if (!res.success) {
              alert(res.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        <label className="text-xs">
          Cliente
          <select
            className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
          >
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          Quando
          <select
            className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            value={preset}
            onChange={(e) => setPreset(Number(e.target.value))}
          >
            {RETURN_PRESET_DAYS.map((d) => (
              <option key={d} value={d}>
                {RETURN_PRESET_LABELS[d]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          Motivo
          <input
            className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </label>
        {showVehicle ? (
          <>
            <label className="text-xs">
              Placa
              <input
                className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={placa}
                onChange={(e) => setPlaca(e.target.value)}
              />
            </label>
            <label className="text-xs">
              Km atual
              <input
                className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={lastKm}
                onChange={(e) => setLastKm(e.target.value)}
              />
            </label>
            <label className="text-xs">
              Intervalo km
              <input
                className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
              />
            </label>
          </>
        ) : null}
        <div className="flex items-end">
          <button
            type="submit"
            disabled={pending || !clienteId}
            className={cn(buttonVariants())}
          >
            Criar retorno previsto
          </button>
        </div>
      </form>

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
                        href={`/${tenantSlug}/agenda`}
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
