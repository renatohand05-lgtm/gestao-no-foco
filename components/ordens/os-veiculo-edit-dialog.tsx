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
import { updateVeiculoAction } from "@/lib/ordens/actions";
import type { VeiculoOption } from "@/lib/ordens/veiculo-shared";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  veiculo: VeiculoOption & {
    versao?: string | null;
    combustivel?: string | null;
    cambio?: string | null;
    quilometragem?: number | null;
    chassi?: string | null;
    observacoes?: string | null;
  };
  onUpdated: () => void;
};

export function OsVeiculoEditDialog({
  open,
  onOpenChange,
  tenantSlug,
  veiculo,
  onUpdated,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    const values = {
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
    };

    startTransition(async () => {
      const result = await updateVeiculoAction(tenantSlug, veiculo.id, values);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onUpdated();
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>Editar veículo</DialogTitle>
          <DialogDescription>
            Alterações no cadastro mestre do veículo refletem em futuras OS.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="space-y-3">
          {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Placa</span>
              <Input
                name="placa"
                defaultValue={veiculo.placa ?? ""}
                disabled={pending}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Ano</span>
              <Input
                name="ano"
                type="number"
                min={1950}
                max={2100}
                defaultValue={veiculo.ano ?? ""}
                disabled={pending}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Marca</span>
              <Input name="marca" defaultValue={veiculo.marca ?? ""} disabled={pending} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Modelo</span>
              <Input name="modelo" defaultValue={veiculo.modelo ?? ""} disabled={pending} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Versão</span>
              <Input
                name="versao"
                defaultValue={veiculo.versao ?? ""}
                disabled={pending}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Cor</span>
              <Input name="cor" defaultValue={veiculo.cor ?? ""} disabled={pending} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Combustível</span>
              <Input
                name="combustivel"
                defaultValue={veiculo.combustivel ?? ""}
                disabled={pending}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Câmbio</span>
              <Input name="cambio" defaultValue={veiculo.cambio ?? ""} disabled={pending} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Km</span>
              <Input
                name="quilometragem"
                type="number"
                min={0}
                step="0.1"
                defaultValue={veiculo.quilometragem ?? ""}
                disabled={pending}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Chassi</span>
              <Input name="chassi" defaultValue={veiculo.chassi ?? ""} disabled={pending} />
            </label>
          </div>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Observações</span>
            <Input
              name="observacoes"
              defaultValue={veiculo.observacoes ?? ""}
              disabled={pending}
            />
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
            <SaveButton loading={pending}>Salvar alterações</SaveButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
