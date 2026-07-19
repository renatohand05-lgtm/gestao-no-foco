"use client";

import { useState } from "react";

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

export function ExecutiveImportLayout({ open, onOpenChange }: Props) {
  const { importJson } = useLayout();
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setRaw("");
          setError(null);
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar layout</DialogTitle>
          <DialogDescription>
            Cole o JSON exportado. O layout será validado e persistido para o
            seu usuário neste tenant.
          </DialogDescription>
        </DialogHeader>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={12}
          placeholder='{"version":1,"name":"...","blocks":[...]}'
          className={cn(
            "w-full rounded-xl border border-border/60 bg-background p-3 font-mono text-xs",
            exAnimations.focusRing,
          )}
          aria-label="JSON para importar"
          aria-invalid={Boolean(error) || undefined}
        />
        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : (
          <p className={exTypography.caption}>
            Apenas blocos conhecidos do dashboard são aplicados.
          </p>
        )}
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="rounded-xl"
            onClick={() => {
              void importJson(raw).then((ok) => {
                if (!ok) {
                  setError("JSON inválido ou incompatível com o schema v1.");
                  return;
                }
                onOpenChange(false);
              });
            }}
          >
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
