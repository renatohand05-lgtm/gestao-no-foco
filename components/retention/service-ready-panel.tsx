"use client";

import { useMemo, useState, useTransition } from "react";

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
import { operatorPhonePreview } from "@/lib/retention/mask";
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
  clientePhone?: string | null;
  clienteEmail?: string | null;
  whatsappProviderConfigured?: boolean;
  emailProviderConfigured?: boolean;
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
  clientePhone = null,
  clienteEmail = null,
  whatsappProviderConfigured = false,
  emailProviderConfigured = false,
}: Props) {
  const hasWhatsapp = Boolean(clientePhone && String(clientePhone).replace(/\D/g, ""));
  const hasEmail = Boolean(clienteEmail && String(clienteEmail).includes("@"));
  const hasAnyChannel = hasWhatsapp || hasEmail;
  const [open, setOpen] = useState(false);
  const [notify, setNotify] = useState(
    notifyReadyAuto && canNotify && hasAnyChannel,
  );
  const [whatsapp, setWhatsapp] = useState(hasWhatsapp);
  const [email, setEmail] = useState(hasEmail);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const whatsappHint = useMemo(() => {
    if (!hasWhatsapp) return "Cliente sem WhatsApp cadastrado";
    const mask = operatorPhonePreview(clientePhone);
    if (whatsappProviderConfigured) return `WhatsApp ${mask}`;
    return `WhatsApp ${mask} — disponível — envio não configurado.`;
  }, [clientePhone, hasWhatsapp, whatsappProviderConfigured]);

  const emailHint = useMemo(() => {
    if (!hasEmail) return "Cliente sem e-mail cadastrado";
    const masked = String(clienteEmail).replace(/^(.{1}).*(@)/, "$1•••$2");
    if (emailProviderConfigured) return `E-mail ${masked}`;
    return `E-mail ${masked} — disponível — envio não configurado.`;
  }, [clienteEmail, emailProviderConfigured, hasEmail]);

  if (!enabled || awaitingPickup || !canFinalize) return null;

  const message = buildServiceReadyPreview({
    segment,
    clienteNome,
    empresaNome,
    ...preview,
  });

  function runFinalize(withNotify: boolean) {
    setError(null);
    start(async () => {
      const channels: Array<"whatsapp" | "email"> = [];
      if (withNotify && whatsapp && hasWhatsapp) channels.push("whatsapp");
      if (withNotify && email && hasEmail) channels.push("email");
      const res = await finalizeServiceReadyAction(tenantSlug, {
        osId,
        notify: withNotify,
        channels: withNotify ? channels : undefined,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setNote(res.note ?? "Concluído.");
      setOpen(false);
    });
  }

  return (
    <div className="rounded-lg border p-3" data-phase35="service-ready">
      <p className="text-sm font-medium">{sheetTitle}</p>
      {!hasAnyChannel ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Cliente sem WhatsApp ou e-mail cadastrado.
        </p>
      ) : null}
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-11")}
          disabled={pending}
          onClick={() => runFinalize(false)}
        >
          {finalizeOnlyLabel}
        </button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            className={cn(buttonVariants({ size: "sm" }), "min-h-11")}
          >
            {finalizeAndNotifyLabel}
          </SheetTrigger>
          <SheetContent side="bottom" className="gap-3 p-4">
            <SheetHeader>
              <SheetTitle>Avisar cliente</SheetTitle>
              <SheetDescription>
                Finalize o serviço e, se quiser, avise que o veículo está pronto
                para retirada. A entrega física é uma etapa posterior.
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
                disabled={!canNotify || !hasAnyChannel}
                onChange={() => setNotify(true)}
              />
              {finalizeAndNotifyLabel}
            </label>
            {notify ? (
              <>
                <p className="text-xs text-muted-foreground">Canais do cliente</p>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={whatsapp && hasWhatsapp}
                    disabled={!hasWhatsapp}
                    onChange={() => setWhatsapp((v) => !v)}
                  />
                  {whatsappHint}
                </label>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={email && hasEmail}
                    disabled={!hasEmail}
                    onChange={() => setEmail((v) => !v)}
                  />
                  {emailHint}
                </label>
                <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
                  <p className="mb-1 text-xs font-medium">Mensagem</p>
                  {message}
                </div>
              </>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
                onClick={() => setOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={pending}
                className={cn(buttonVariants(), "min-h-11")}
                onClick={() => runFinalize(notify && hasAnyChannel)}
              >
                {notify ? "Confirmar aviso" : "Finalizar"}
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
      {note ? <p className="mt-2 text-sm text-muted-foreground">{note}</p> : null}
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
