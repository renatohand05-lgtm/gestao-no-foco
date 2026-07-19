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

export function ExecutiveSaveLayout({ open, onOpenChange }: Props) {
  const { state, rename, saveLayout, persistStatus } = useLayout();
  const [name, setName] = useState(state.layoutName);
  const [asDefault, setAsDefault] = useState(true);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) {
          setName(state.layoutName);
          setAsDefault(true);
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Salvar layout</DialogTitle>
          <DialogDescription>
            Persiste o workspace no banco para este usuário e tenant. Disponível
            após logout e em outros dispositivos.
          </DialogDescription>
        </DialogHeader>
        <label className="block space-y-1.5">
          <span className={exTypography.label}>Nome</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={cn(
              "flex h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm",
              exAnimations.focusRing,
            )}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={asDefault}
            onChange={(e) => setAsDefault(e.target.checked)}
            className="size-4 rounded border-border"
          />
          Definir como layout padrão
        </label>
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
            disabled={persistStatus === "saving"}
            onClick={() => {
              const finalName = name.trim() || "Meu dashboard";
              rename(finalName);
              void saveLayout({
                name: finalName,
                asDefault,
                asNew: true,
              }).then((ok) => {
                if (ok) onOpenChange(false);
              });
            }}
          >
            {persistStatus === "saving" ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
