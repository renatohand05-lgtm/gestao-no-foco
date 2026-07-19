"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLayout } from "@/components/executive/layout/layout-context";
import { exAnimations } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ExecutiveResetDialog({ open, onOpenChange }: Props) {
  const { resetLayout } = useLayout();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resetar layout</DialogTitle>
          <DialogDescription>
            Restaura o preset CEO e salva como layout padrão persistido para o
            seu usuário neste tenant.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            className={cn("rounded-xl", exAnimations.focusRing)}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className={cn("rounded-xl", exAnimations.focusRing)}
            onClick={() => {
              resetLayout();
              onOpenChange(false);
            }}
          >
            Confirmar reset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
