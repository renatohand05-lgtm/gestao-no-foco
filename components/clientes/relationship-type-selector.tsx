"use client";

import { buttonVariants } from "@/components/ui/button";
import type { ClientRelationship } from "@/lib/clientes/relationship";
import { cn } from "@/lib/utils";

const OPTIONS: Array<{ id: ClientRelationship; label: string }> = [
  { id: "atendimento", label: "Atendimento" },
  { id: "negocio", label: "Negócio" },
];

type Props = {
  value: ClientRelationship;
  onChange: (next: ClientRelationship) => void;
  disabled?: boolean;
};

export function RelationshipTypeSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="flex flex-wrap gap-2" data-relationship-type="">
      <p className="w-full text-xs text-muted-foreground">Tipo de relacionamento</p>
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          disabled={disabled}
          className={cn(
            buttonVariants({
              variant: value === opt.id ? "default" : "outline",
              size: "sm",
            }),
          )}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
