"use client";

import { useMemo } from "react";

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
import { exAnimations, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ExecutiveExportLayout({ open, onOpenChange }: Props) {
  const { exportJson } = useLayout();
  const json = useMemo(() => (open ? exportJson() : ""), [open, exportJson]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Exportar layout</DialogTitle>
          <DialogDescription>
            Copie o JSON abaixo para backup ou transferência. A fonte de verdade
            é o layout persistido no banco.
          </DialogDescription>
        </DialogHeader>
        <textarea
          readOnly
          value={json}
          rows={12}
          className={cn(
            "w-full rounded-xl border border-border/60 bg-muted/30 p-3 font-mono text-xs",
            exAnimations.focusRing,
          )}
          aria-label="JSON do layout"
        />
        <p className={exTypography.caption}>
          Versão do schema: 1 · apenas ordem, visibilidade e densidade.
        </p>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
          <Button
            type="button"
            className="rounded-xl"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(json);
              } catch {
                /* arquitetura — falha silenciosa */
              }
            }}
          >
            Copiar JSON
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
