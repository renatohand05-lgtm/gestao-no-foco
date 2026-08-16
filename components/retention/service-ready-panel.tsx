"use client";

import { useState, useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { finalizeServiceReadyAction } from "@/lib/retention/actions";
import { buildServiceReadyPreview } from "@/lib/retention/preview";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  osId: string;
  enabled: boolean;
  canFinalize: boolean;
  canNotify: boolean;
  notifyReadyAuto: boolean;
  awaitingPickup: boolean;
  segment?: string | null;
  clienteNome: string;
  empresaNome: string;
  preview: {
    itens?: Array<{ descricao?: string | null; aprovacao_status?: string | null }>;
    marca?: string | null;
    modelo?: string | null;
    placa?: string | null;
  };
  finalizeOnlyLabel: string;
  finalizeAndNotifyLabel: string;
  sheetTitle: string;
};

export function ServiceReadyPanel({
  tenantSlug,
  osId,
  enabled,
  canFinalize,
  canNotify,
  notifyReadyAuto,
  awaitingPickup,
  segment,
  clienteNome,
  empresaNome,
  preview,
  finalizeOnlyLabel,
  finalizeAndNotifyLabel,
  sheetTitle,
}: Props) {
  const [open, setOpen] = useState(false);
  const [notify, setNotify] = useState(notifyReadyAuto && canNotify);
  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!enabled || awaitingPickup || !canFinalize) return null;

  const message = buildServiceReadyPreview({
    segment,
    clienteNome,
    empresaNome,
    ...preview,
  });

  return (
    <div className="rounded-lg border p-3" data-phase35="service-ready">
      <p className="text-sm font-medium">{sheetTitle}</p>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          className={cn(buttonVariants({ size: "sm" }), "mt-2 min-h-11")}
        >
          {finalizeAndNotifyLabel}
        </SheetTrigger>
        <SheetContent side="bottom" className="gap-3 p-4">
          <SheetHeader>
            <SheetTitle>{sheetTitle}</SheetTitle>
            <SheetDescription>
              Escolha se o cliente deve ser avisado. A mensagem não é obrigatória.
            </SheetDescription>
          </SheetHeader>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="radio"
              name="sr-mode"
              checked={!notify}
              onChange={() => setNotify(false)}
            />
            {finalizeOnlyLabel}
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="radio"
              name="sr-mode"
              checked={notify}
              disabled={!canNotify}
              onChange={() => setNotify(true)}
            />
            {finalizeAndNotifyLabel}
          </label>
          {notify ? (
            <>
              <p className="text-xs text-muted-foreground">Canal</p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="sr-ch"
                  checked={channel === "whatsapp"}
                  onChange={() => setChannel("whatsapp")}
                />
                WhatsApp
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="sr-ch"
                  checked={channel === "email"}
                  onChange={() => setChannel("email")}
                />
                E-mail
              </label>
              <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
                <p className="mb-1 text-xs font-medium">Mensagem que será enviada</p>
                {message}
              </div>
            </>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
          <button
            type="button"
            disabled={pending}
            className={cn(buttonVariants(), "min-h-11")}
            onClick={() => {
              setError(null);
              start(async () => {
                const res = await finalizeServiceReadyAction(tenantSlug, {
                  osId,
                  notify,
                  channel: notify ? channel : undefined,
                });
                if (!res.success) {
                  setError(res.error);
                  return;
                }
                setNote(res.note ?? "Concluído.");
                setOpen(false);
              });
            }}
          >
            Finalizar
          </button>
        </SheetContent>
      </Sheet>
      <button
        type="button"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-2 min-h-11")}
        disabled={pending}
        onClick={() => {
          start(async () => {
            const res = await finalizeServiceReadyAction(tenantSlug, {
              osId,
              notify: false,
            });
            if (!res.success) setError(res.error);
            else setNote(res.note ?? "Finalizado sem notificar.");
          });
        }}
      >
        {finalizeOnlyLabel}
      </button>
    </div>
  );
}
