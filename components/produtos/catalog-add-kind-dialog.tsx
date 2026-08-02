"use client";

import { Package, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CatalogAddKind = "produto" | "servico";

type Props = {
  open: boolean;
  onChoose: (kind: CatalogAddKind) => void;
  onCancel?: () => void;
  className?: string;
};

/** Sprint 27.8 — escolha inicial ao adicionar item em Venda/OS. */
export function CatalogAddKindDialog({
  open,
  onChoose,
  onCancel,
  className,
}: Props) {
  if (!open) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-card p-4 shadow-sm",
        className,
      )}
      role="dialog"
      aria-label="O que deseja adicionar?"
    >
      <h3 className="text-base font-medium">O que deseja adicionar?</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Escolha o tipo para buscar no catálogo correto.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          className="h-auto flex-col gap-2 py-4"
          onClick={() => onChoose("produto")}
        >
          <Package className="size-5 text-[var(--brand-gold)]" />
          <span>Adicionar produto</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-auto flex-col gap-2 py-4"
          onClick={() => onChoose("servico")}
        >
          <Wrench className="size-5 text-[var(--brand-gold)]" />
          <span>Adicionar serviço</span>
        </Button>
      </div>
      {onCancel ? (
        <button
          type="button"
          className="mt-3 text-xs text-muted-foreground underline"
          onClick={onCancel}
        >
          Cancelar
        </button>
      ) : null}
    </div>
  );
}
