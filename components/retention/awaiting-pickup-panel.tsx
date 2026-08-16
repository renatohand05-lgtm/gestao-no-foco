"use client";

import { useState, useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import { NotifyPreviewDialog } from "@/components/retention/notify-preview-dialog";
import {
  notifyServiceReadyAgainAction,
  registerOsPickupAction,
} from "@/lib/retention/actions";
import { operatorStatusLabel } from "@/lib/retention/pipeline";
import { cn } from "@/lib/utils";

export type AwaitingPickupRow = {
  osId: string;
  cliente: string;
  veiculo: string;
  servico: string;
  prontoDesde: string | null;
  mensagem: string | null;
  mensagemStatus: string | null;
  waLink?: string | null;
};

type Props = {
  tenantSlug: string;
  title: string;
  registerLabel: string;
  canNotify: boolean;
  canFinalize: boolean;
  rows: AwaitingPickupRow[];
};

export function AwaitingPickupPanel({
  tenantSlug,
  title,
  registerLabel,
  canNotify,
  canFinalize,
  rows,
}: Props) {
  const [pending, start] = useTransition();
  const [previewOs, setPreviewOs] = useState<AwaitingPickupRow | null>(null);
  return (
    <div className="space-y-3" data-phase35="awaiting-pickup">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        <span className="text-xl font-semibold tabular-nums">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum veículo aguardando retirada.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {rows.map((row) => (
            <li key={row.osId} className="rounded-lg border p-3 space-y-2">
              <p className="font-medium">{row.cliente}</p>
              <p className="text-muted-foreground">
                {row.veiculo || "—"} · {row.servico || "Atendimento"}
              </p>
              <p className="text-xs text-muted-foreground">
                Pronto desde {row.prontoDesde ?? "—"} · Mensagem:{" "}
                {row.mensagemStatus
                  ? operatorStatusLabel(row.mensagemStatus)
                  : "não enviada"}
              </p>
              <div className="flex flex-wrap gap-2">
                {canNotify ? (
                  <button
                    type="button"
                    disabled={pending}
                    className={cn(buttonVariants({ size: "sm", variant: "outline" }), "min-h-11")}
                    onClick={() => setPreviewOs(row)}
                  >
                    Avisar cliente
                  </button>
                ) : null}
                {row.waLink ? (
                  <a
                    className={cn(buttonVariants({ size: "sm", variant: "outline" }), "min-h-11")}
                    href={row.waLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir WhatsApp
                  </a>
                ) : null}
                {canFinalize ? (
                  <button
                    type="button"
                    disabled={pending}
                    className={cn(buttonVariants({ size: "sm" }), "min-h-11")}
                    onClick={() =>
                      start(async () => {
                        await registerOsPickupAction(tenantSlug, { osId: row.osId });
                      })
                    }
                  >
                    {registerLabel}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      <NotifyPreviewDialog
        open={Boolean(previewOs)}
        onOpenChange={(open) => {
          if (!open) setPreviewOs(null);
        }}
        title="Avisar cliente"
        message={previewOs?.mensagem || "O serviço foi concluído e o veículo está disponível para retirada."}
        allowChannelSelect={false}
        onConfirm={async () => {
          if (!previewOs) return { success: false, error: "OS ausente." };
          return notifyServiceReadyAgainAction(tenantSlug, previewOs.osId);
        }}
      />
    </div>
  );
}
