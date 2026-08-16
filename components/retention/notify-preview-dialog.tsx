"use client";

import { useState, useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { maskAddress, operatorPhonePreview } from "@/lib/retention/mask";
import { cn } from "@/lib/utils";

type Channel = "whatsapp" | "email";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message: string;
  phone?: string | null;
  email?: string | null;
  allowChannelSelect?: boolean;
  confirmLabel?: string;
  onConfirm: (channel?: Channel) => Promise<{ success: boolean; error?: string; note?: string }>;
};

export function NotifyPreviewDialog({
  open,
  onOpenChange,
  title = "Avisar cliente",
  message,
  phone,
  email,
  allowChannelSelect = true,
  confirmLabel = "Confirmar aviso",
  onConfirm,
}: Props) {
  const hasPhone = Boolean((phone ?? "").replace(/\D/g, ""));
  const hasEmail = Boolean(email?.includes("@"));
  const [channel, setChannel] = useState<Channel>(hasPhone ? "whatsapp" : "email");
  const [whatsappOn, setWhatsappOn] = useState(hasPhone);
  const [emailOn, setEmailOn] = useState(hasEmail && !hasPhone);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="gap-3 p-4" data-phase35="notify-preview">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>Revise a mensagem antes de confirmar.</SheetDescription>
        </SheetHeader>
        {allowChannelSelect && hasPhone && hasEmail ? (
          <div className="space-y-2 text-sm">
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={whatsappOn}
                onChange={(e) => {
                  setWhatsappOn(e.target.checked);
                  if (e.target.checked) setChannel("whatsapp");
                }}
              />
              WhatsApp ✓ {operatorPhonePreview(phone)}
            </label>
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={emailOn}
                onChange={(e) => {
                  setEmailOn(e.target.checked);
                  if (e.target.checked) setChannel("email");
                }}
              />
              E-mail ✓ {maskAddress(email)}
            </label>
          </div>
        ) : (
          <div className="space-y-1 text-sm">
            {hasPhone ? (
              <p>
                WhatsApp
                <br />
                {operatorPhonePreview(phone)}
              </p>
            ) : null}
            {hasEmail && !hasPhone ? <p>E-mail {maskAddress(email)}</p> : null}
            {!hasPhone && !hasEmail ? (
              <p className="text-muted-foreground">
                Cliente sem canal de comunicação disponível.
              </p>
            ) : null}
          </div>
        )}
        <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
          <p className="mb-1 text-xs font-medium">Mensagem</p>
          {message}
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={pending}
            className={cn(buttonVariants(), "min-h-11")}
            onClick={() => {
              setError(null);
              start(async () => {
                const chosen =
                  allowChannelSelect && hasPhone && hasEmail
                    ? whatsappOn
                      ? "whatsapp"
                      : emailOn
                        ? "email"
                        : undefined
                    : hasPhone
                      ? "whatsapp"
                      : hasEmail
                        ? "email"
                        : channel;
                const res = await onConfirm(chosen);
                if (!res.success) {
                  setError(res.error ?? "Falha ao avisar.");
                  return;
                }
                onOpenChange(false);
              });
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
