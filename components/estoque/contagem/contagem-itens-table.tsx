"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { salvarItemContagemAction } from "@/lib/estoque/estoque-contagem-actions";
import { formatQuantity } from "@/lib/format";
import type { EstoqueContagemItem } from "@/types/estoque-contagem";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  contagemId: string;
  itens: EstoqueContagemItem[];
  editavel: boolean;
};

function ItemRow({
  tenantSlug,
  contagemId,
  item,
  editavel,
}: {
  tenantSlug: string;
  contagemId: string;
  item: EstoqueContagemItem;
  editavel: boolean;
}) {
  const [valor, setValor] = useState(
    item.quantidade_contada != null ? String(item.quantidade_contada) : "",
  );
  const [salvo, setSalvo] = useState(item.quantidade_contada != null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const diferenca =
    item.quantidade_contada != null
      ? item.quantidade_contada - item.quantidade_sistema
      : null;

  function handleSalvar() {
    const numero = Number(valor.replace(",", "."));
    if (!Number.isFinite(numero) || numero < 0) {
      setError("Quantidade inválida.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await salvarItemContagemAction(
        tenantSlug,
        contagemId,
        item.produto_id,
        numero,
      );
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSalvo(true);
    });
  }

  return (
    <tr className="border-b border-border/50 last:border-0">
      <td className="py-2 pr-3">
        <p className="text-sm font-medium">{item.produto?.nome ?? "Produto removido"}</p>
        <p className="text-xs text-[var(--text-muted)]">
          {item.produto?.sku ?? "—"} · {item.produto?.unidade_medida ?? "un"}
        </p>
      </td>
      <td className="py-2 pr-3 text-right text-sm tabular-nums text-[var(--text-muted)]">
        {formatQuantity(item.quantidade_sistema)}
      </td>
      <td className="py-2 pr-3">
        {editavel ? (
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={valor}
              onChange={(e) => {
                setValor(e.target.value);
                setSalvo(false);
              }}
              className="h-8 w-24 text-right tabular-nums"
              aria-label={`Quantidade contada de ${item.produto?.nome ?? "produto"}`}
            />
            <Button
              size="icon"
              variant={salvo ? "ghost" : "outline"}
              className="size-8 shrink-0"
              onClick={handleSalvar}
              disabled={pending || valor === ""}
              aria-label="Salvar quantidade contada"
            >
              {pending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Check
                  className={cn(
                    "size-3.5",
                    salvo ? "text-success" : "text-[var(--text-muted)]",
                  )}
                  aria-hidden
                />
              )}
            </Button>
          </div>
        ) : (
          <span className="text-sm tabular-nums">
            {item.quantidade_contada != null
              ? formatQuantity(item.quantidade_contada)
              : "—"}
          </span>
        )}
        {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
      </td>
      <td className="py-2 text-right text-sm tabular-nums">
        {diferenca != null ? (
          <span
            className={cn(
              diferenca < 0 && "text-danger",
              diferenca > 0 && "text-success",
              diferenca === 0 && "text-[var(--text-muted)]",
            )}
          >
            {diferenca > 0 ? "+" : ""}
            {formatQuantity(diferenca)}
          </span>
        ) : (
          <span className="text-[var(--text-muted)]">—</span>
        )}
      </td>
    </tr>
  );
}

export function ContagemItensTable({
  tenantSlug,
  contagemId,
  itens,
  editavel,
}: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border text-left text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
            <th className="pb-2 pr-3">Produto</th>
            <th className="pb-2 pr-3 text-right">Sistema</th>
            <th className="pb-2 pr-3 text-right">Contado</th>
            <th className="pb-2 text-right">Diferença</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <ItemRow
              key={item.id}
              tenantSlug={tenantSlug}
              contagemId={contagemId}
              item={item}
              editavel={editavel}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
