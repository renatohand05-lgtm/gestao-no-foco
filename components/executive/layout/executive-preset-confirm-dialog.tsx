"use client";

import { useLayout } from "@/components/executive/layout/layout-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Confirmação ao trocar preset com alterações pendentes.
 */
export function ExecutivePresetConfirmDialog() {
  const {
    pendingPresetConfirm,
    confirmPendingPreset,
    cancelPendingPreset,
  } = useLayout();

  return (
    <Dialog
      open={pendingPresetConfirm !== null}
      onOpenChange={(open) => {
        if (!open) cancelPendingPreset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alterações não salvas</DialogTitle>
          <DialogDescription>
            Trocar de workspace descartará as alterações locais não salvas.
            Deseja continuar?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={cancelPendingPreset}>
            Cancelar
          </Button>
          <Button type="button" onClick={confirmPendingPreset}>
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
