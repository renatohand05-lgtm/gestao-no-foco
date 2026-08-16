"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { resendFailedNotificationAction } from "@/lib/retention/actions";
import type { CommunicationKpis } from "@/lib/retention/center";
import { COMMUNICATION_ORIGINS, ORIGIN_LABELS } from "@/lib/retention/origin";
import { operatorStatusLabel } from "@/lib/retention/pipeline";
import { originLabel } from "@/lib/retention/origin";
import type { OutboxRow } from "@/lib/retention/types";
import { cn } from "@/lib/utils";

type ClienteOpt = { id: string; nome: string };

type Props = {
  tenantSlug: string;
  kpis: CommunicationKpis;
  rows: OutboxRow[];
  clientes: ClienteOpt[];
  canResend: boolean;
  canSeeDetails: boolean;
  filters: {
    from?: string;
    to?: string;
    clienteId?: string;
    channel?: string;
    status?: string;
    origin?: string;
  };
};

export function CommunicationCenter({
  tenantSlug,
  kpis,
  rows,
  clientes,
  canResend,
  canSeeDetails,
  filters,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const cards: Array<[string, number]> = [
    ["Aguardando envio", kpis.awaiting],
    ["Enviadas", kpis.sent],
    ["Entregues", kpis.delivered],
    ["Lidas", kpis.read],
    ["Falharam", kpis.failed],
    ["Canceladas", kpis.cancelled],
    ["Clientes sem WhatsApp", kpis.clientsWithoutWhatsApp],
    ["Clientes sem e-mail", kpis.clientsWithoutEmail],
  ];

  return (
    <div className="space-y-6" data-phase35="communication-center">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, n]) => (
          <Card key={label}>
            <CardHeader className="pb-1">
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-xl tabular-nums">{n}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm space-y-1">
          De
          <input
            type="date"
            name="from"
            defaultValue={filters.from?.slice(0, 10)}
            className="mt-1 w-full rounded-md border bg-background px-2 min-h-11 text-sm"
          />
        </label>
        <label className="text-sm space-y-1">
          Até
          <input
            type="date"
            name="to"
            defaultValue={filters.to?.slice(0, 10)}
            className="mt-1 w-full rounded-md border bg-background px-2 min-h-11 text-sm"
          />
        </label>
        <label className="text-sm space-y-1">
          Cliente
          <NativeSelect name="clienteId" defaultValue={filters.clienteId ?? ""} className="h-11">
            <option value="">Todos</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="text-sm space-y-1">
          Canal
          <NativeSelect name="channel" defaultValue={filters.channel ?? ""} className="h-11">
            <option value="">Todos</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">E-mail</option>
          </NativeSelect>
        </label>
        <label className="text-sm space-y-1">
          Tipo
          <NativeSelect name="origin" defaultValue={filters.origin ?? ""} className="h-11">
            <option value="">Todos</option>
            {COMMUNICATION_ORIGINS.map((o) => (
              <option key={o} value={o}>
                {ORIGIN_LABELS[o]}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="text-sm space-y-1">
          Status
          <NativeSelect name="status" defaultValue={filters.status ?? ""} className="h-11">
            <option value="">Todos</option>
            <option value="queued">Aguardando</option>
            <option value="sent">Enviado</option>
            <option value="delivered">Entregue</option>
            <option value="failed">Falhou</option>
            <option value="cancelled">Cancelada</option>
            <option value="suppressed">Suprimida</option>
          </NativeSelect>
        </label>
        <button type="submit" className={cn(buttonVariants(), "min-h-11 self-end")}>
          Filtrar
        </button>
      </form>
      <ul className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma comunicação neste período.</p>
        ) : (
          rows.map((row) => (
            <li key={row.id} className="rounded-lg border p-3 text-sm space-y-1">
              <p className="font-medium">
                {originLabel(row.origin_kind, row.template_code)} ·{" "}
                {row.channel === "email" ? "E-mail" : "WhatsApp"}
              </p>
              <p className="text-muted-foreground">
                {operatorStatusLabel(row.status)}
                {row.created_at
                  ? ` · ${new Date(row.created_at).toLocaleString("pt-BR")}`
                  : ""}
              </p>
              {row.rendered_preview ? (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {row.rendered_preview}
                </p>
              ) : null}
              {canSeeDetails ? (
                <details className="text-xs text-muted-foreground">
                  <summary className="min-h-11 cursor-pointer">Ver detalhes</summary>
                  <p>Evento: {row.entity_type}</p>
                  {row.failure_kind ? <p>Tipo de falha: {row.failure_kind}</p> : null}
                  {row.error_message ? <p>{row.error_message}</p> : null}
                  {row.next_retry_at ? (
                    <p>
                      Próxima tentativa:{" "}
                      {new Date(row.next_retry_at).toLocaleString("pt-BR")}
                    </p>
                  ) : null}
                </details>
              ) : null}
              {canResend && row.status === "failed" && row.failure_kind !== "permanent" ? (
                <button
                  type="button"
                  disabled={pending}
                  className={cn(buttonVariants({ size: "sm", variant: "outline" }), "min-h-11")}
                  onClick={() =>
                    start(async () => {
                      await resendFailedNotificationAction(tenantSlug, row.id);
                      router.refresh();
                    })
                  }
                >
                  Reenviar
                </button>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
