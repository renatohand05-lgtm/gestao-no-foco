"use client";

import { useState, useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { SaveButton } from "@/components/ui/save-button";
import { createVeiculoAction } from "@/lib/ordens/actions";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  clienteId: string;
  onCreated: (veiculoId: string) => void;
};

export function OsVeiculoQuickDialog({
  open,
  onOpenChange,
  tenantSlug,
  clienteId,
  onCreated,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    const values = {
      cliente_id: clienteId,
      placa: String(formData.get("placa") ?? "") || null,
      marca: String(formData.get("marca") ?? "") || null,
      modelo: String(formData.get("modelo") ?? "") || null,
      versao: String(formData.get("versao") ?? "") || null,
      ano: formData.get("ano") ? Number(formData.get("ano")) : null,
      cor: String(formData.get("cor") ?? "") || null,
      combustivel: String(formData.get("combustivel") ?? "") || null,
      cambio: String(formData.get("cambio") ?? "") || null,
      quilometragem: formData.get("quilometragem")
        ? Number(formData.get("quilometragem"))
        : null,
      chassi: String(formData.get("chassi") ?? "") || null,
      observacoes: String(formData.get("observacoes") ?? "") || null,
      ativo: true,
    };

    startTransition(async () => {
      const result = await createVeiculoAction(tenantSlug, values);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSuccess("Veículo cadastrado.");
      if (result.id) {
        onCreated(result.id);
      }
      onOpenChange(false);
      setSuccess(null);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>Cadastrar veículo</DialogTitle>
          <DialogDescription>
            O veículo será vinculado ao cliente desta OS. Placa é opcional, mas
            única no tenant quando informada.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="space-y-3">
          {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}
          {success ? (
            <FeedbackMessage variant="success">{success}</FeedbackMessage>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Placa</span>
              <Input name="placa" placeholder="ABC1D23" disabled={pending} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Ano</span>
              <Input
                name="ano"
                type="number"
                min={1950}
                max={2100}
                disabled={pending}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Marca</span>
              <Input name="marca" disabled={pending} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Modelo</span>
              <Input name="modelo" disabled={pending} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Versão</span>
              <Input name="versao" disabled={pending} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Cor</span>
              <Input name="cor" disabled={pending} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Combustível</span>
              <Input name="combustivel" disabled={pending} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Câmbio</span>
              <Input name="cambio" disabled={pending} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Km</span>
              <Input
                name="quilometragem"
                type="number"
                min={0}
                step="0.1"
                disabled={pending}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Chassi</span>
              <Input name="chassi" disabled={pending} />
            </label>
          </div>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Observações</span>
            <Input name="observacoes" disabled={pending} />
          </label>

          <DialogFooter>
            <button
              type="button"
              disabled={pending}
              className={cn(buttonVariants({ variant: "outline" }))}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </button>
            <SaveButton loading={pending}>Salvar veículo</SaveButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
