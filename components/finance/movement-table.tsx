"use client";

import type { CashMovement } from "@/lib/finance";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Props = {
  movements: CashMovement[];
  className?: string;
  onDelete?: (id: string) => void;
};

export function MovementTable({ movements, className, onDelete }: Props) {
  return (
    <section
      data-movement-table
      className={cn("overflow-x-auto rounded-xl border border-border/60", className)}
    >
      <div className="border-b border-border/40 px-4 py-3">
        <p className={gofTypography.title}>Movimentações</p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/40 text-left text-muted-foreground">
            <th className="px-4 py-2">Data</th>
            <th className="px-4 py-2">Tipo</th>
            <th className="px-4 py-2">Descrição</th>
            <th className="px-4 py-2">Valor</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {movements.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-muted-foreground">
                Nenhuma movimentação.
              </td>
            </tr>
          ) : (
            movements.map((m) => (
              <tr key={m.id} className="border-b border-border/20">
                <td className="px-4 py-2">{m.movementDate}</td>
                <td className="px-4 py-2 capitalize">{m.kind}</td>
                <td className="px-4 py-2">{m.description}</td>
                <td className="px-4 py-2 tabular-nums">{money(m.amount)}</td>
                <td className="px-4 py-2">
                  {onDelete ? (
                    <button
                      type="button"
                      className="text-xs underline text-muted-foreground"
                      onClick={() => onDelete(m.id)}
                    >
                      Estornar
                    </button>
                  ) : null}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
