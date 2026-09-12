"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteTenantPermanentlyAction } from "@/lib/platform/tenant-delete-actions";

type Props = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
};

export function DeleteTenantButton({ tenantId, tenantSlug, tenantName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteTenantPermanentlyAction(tenantId, confirmText);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push("/master/dashboard");
      router.refresh();
    });
  }

  return (
    <>
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5">
        <p className="text-sm font-semibold text-red-600 dark:text-red-400">
          Zona de risco
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Excluir <strong>{tenantName}</strong> apaga a empresa e todos os
          dados dela (vendas, clientes, financeiro, ordens de serviço) de
          forma permanente. Não tem como desfazer.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-3 border-red-500/40 text-red-600 hover:bg-red-500/10 dark:text-red-400"
          onClick={() => setOpen(true)}
        >
          <Trash2 className="mr-2 size-4" />
          Excluir esta empresa
        </Button>
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setConfirmText("");
            setError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir {tenantName}?</DialogTitle>
            <DialogDescription>
              Essa ação é permanente. Pra confirmar, digite{" "}
              <strong>{tenantSlug}</strong> no campo abaixo.
            </DialogDescription>
          </DialogHeader>

          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={tenantSlug}
            className="h-9 w-full rounded-md border border-border/60 bg-background px-3 text-sm"
            autoComplete="off"
          />

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleDelete}
              disabled={isPending || confirmText.trim() !== tenantSlug}
            >
              {isPending ? "Excluindo…" : "Excluir permanentemente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
