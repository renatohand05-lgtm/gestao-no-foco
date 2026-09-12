"use client";

import { useState, useTransition } from "react";
import { Mail, MessageCircle, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { sendVendaReciboAction } from "@/lib/vendas/venda-recibo-actions";

type VendaEnviarReciboButtonProps = {
  tenantSlug: string;
  vendaId: string;
  clienteTelefone?: string | null;
  clienteEmail?: string | null;
};

export function VendaEnviarReciboButton({
  tenantSlug,
  vendaId,
  clienteTelefone,
  clienteEmail,
}: VendaEnviarReciboButtonProps) {
  const [open, setOpen] = useState(false);
  const [canal, setCanal] = useState<"whatsapp" | "email">(
    clienteTelefone ? "whatsapp" : "email",
  );
  const [destino, setDestino] = useState(clienteTelefone ?? clienteEmail ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setError(null);
      setSuccess(false);
      setDestino(
        (canal === "whatsapp" ? clienteTelefone : clienteEmail) ?? destino,
      );
    }
  }

  function handleCanalChange(next: "whatsapp" | "email") {
    setCanal(next);
    setDestino((next === "whatsapp" ? clienteTelefone : clienteEmail) ?? "");
  }

  function handleSend() {
    setError(null);
    startTransition(async () => {
      const result = await sendVendaReciboAction(tenantSlug, vendaId, {
        canal,
        destino,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSuccess(true);
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => handleOpenChange(true)}>
        <Send className="mr-2 size-4" />
        Enviar recibo
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar recibo da venda</DialogTitle>
            <DialogDescription>
              Gera o comprovante em PDF e envia direto pro cliente. Não
              substitui a Nota Fiscal.
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="space-y-3 py-2">
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                Recibo enviado com sucesso!
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Fechar
              </Button>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Enviar por
                </label>
                <NativeSelect
                  value={canal}
                  onChange={(e) =>
                    handleCanalChange(e.target.value as "whatsapp" | "email")
                  }
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">E-mail</option>
                </NativeSelect>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  {canal === "whatsapp" ? "Telefone" : "E-mail"}
                </label>
                <input
                  type="text"
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  placeholder={
                    canal === "whatsapp"
                      ? "(11) 99999-9999"
                      : "cliente@email.com"
                  }
                  className="h-9 w-full rounded-md border border-border/60 bg-background px-3 text-sm"
                />
              </div>
              {error ? (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          )}

          {!success ? (
            <DialogFooter>
              <Button
                type="button"
                onClick={handleSend}
                disabled={isPending || !destino.trim()}
              >
                {canal === "whatsapp" ? (
                  <MessageCircle className="mr-2 size-4" />
                ) : (
                  <Mail className="mr-2 size-4" />
                )}
                {isPending ? "Enviando…" : "Enviar"}
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
