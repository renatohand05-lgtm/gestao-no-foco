"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  checkWhatsAppConnectionAction,
  connectWhatsAppChannelAction,
  disconnectWhatsAppChannelAction,
  refreshWhatsAppQrCodeAction,
  type WhatsAppChannelStatus,
} from "@/lib/retention/whatsapp-channel-actions";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<WhatsAppChannelStatus["status"], string> = {
  none: "Não conectado",
  pending: "Preparando...",
  qr_pending: "Aguardando leitura do QR code",
  connected: "Conectado",
  disconnected: "Desconectado",
  banned: "Bloqueado pelo WhatsApp",
  error: "Erro na conexão",
};

export function WhatsAppChannelConnect({
  tenantSlug,
  initial,
}: {
  tenantSlug: string;
  initial: WhatsAppChannelStatus;
}) {
  const [status, setStatus] = useState<WhatsAppChannelStatus>(initial);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status.status !== "qr_pending") {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(() => {
      checkWhatsAppConnectionAction(tenantSlug).then((s) => {
        setStatus(s);
        if (s.status === "connected") setQrBase64(null);
      });
    }, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [status.status, tenantSlug]);

  function connect() {
    setError(null);
    start(async () => {
      const res = await connectWhatsAppChannelAction(tenantSlug);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setQrBase64(res.qrBase64);
      setStatus({ status: "qr_pending", phoneNumber: null, lastError: null });
    });
  }

  function refreshQr() {
    setError(null);
    start(async () => {
      const res = await refreshWhatsAppQrCodeAction(tenantSlug);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setQrBase64(res.qrBase64);
    });
  }

  function disconnect() {
    setError(null);
    start(async () => {
      const res = await disconnectWhatsAppChannelAction(tenantSlug);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setStatus({ status: "disconnected", phoneNumber: null, lastError: null });
      setQrBase64(null);
    });
  }

  return (
    <div className="rounded-lg border p-4 space-y-3" data-phase="whatsapp-channel">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Canal de WhatsApp da empresa</p>
          <p className="text-sm text-muted-foreground">
            {STATUS_LABEL[status.status]}
            {status.phoneNumber ? ` — ${status.phoneNumber}` : ""}
          </p>
        </div>
        {status.status === "connected" ? (
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            disabled={pending}
            onClick={disconnect}
          >
            Desconectar
          </button>
        ) : (
          <button
            type="button"
            className={cn(buttonVariants({ size: "sm" }))}
            disabled={pending}
            onClick={connect}
          >
            {status.status === "qr_pending" ? "Gerar novo QR" : "Conectar número"}
          </button>
        )}
      </div>

      {status.status === "qr_pending" && (
        <div className="flex flex-col items-center gap-2 rounded-md bg-muted/40 p-4">
          {qrBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrBase64.startsWith("data:") ? qrBase64 : `data:image/png;base64,${qrBase64}`}
              alt="QR code para conectar o WhatsApp"
              className="h-56 w-56"
            />
          ) : (
            <p className="text-sm text-muted-foreground">Gerando QR code...</p>
          )}
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            Abra o WhatsApp do número da empresa → Aparelhos conectados → Conectar um aparelho, e
            escaneie este código. A tela atualiza sozinha quando conectar.
          </p>
          <button
            type="button"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            disabled={pending}
            onClick={refreshQr}
          >
            QR expirou? Gerar outro
          </button>
        </div>
      )}

      {status.status === "error" && status.lastError && (
        <p className="text-sm text-destructive">{status.lastError}</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <p className="text-xs text-muted-foreground">
        Uso restrito a notificações transacionais (OS pronta, agendamento). Envio automático em
        ritmo controlado para reduzir risco de bloqueio pelo WhatsApp.
      </p>
    </div>
  );
}
