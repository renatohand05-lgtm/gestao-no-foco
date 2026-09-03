"use client";

import { useMemo, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  applyOsAprovacaoAction,
  updateOsItemExecucaoAction,
} from "@/lib/ordens/actions";
import type { KitchenExecStatus, KitchenItem } from "@/lib/restaurante/cozinha";

type Props = {
  tenantSlug: string;
  initialItems: KitchenItem[];
  loadError: string | null;
};

const COLUMNS: { status: KitchenExecStatus; label: string }[] = [
  { status: "pendente", label: "Pendente" },
  { status: "em_execucao", label: "Em preparo" },
  { status: "concluido", label: "Pronto" },
];

export function CozinhaBoard({ tenantSlug, initialItems, loadError }: Props) {
  const [items, setItems] = useState(initialItems);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(loadError);

  const groupedByComanda = useMemo(() => {
    const map = new Map<number, { osId: string; items: KitchenItem[] }>();
    for (const item of items) {
      const group = map.get(item.osNumero) ?? { osId: item.osId, items: [] };
      group.items.push(item);
      map.set(item.osNumero, group);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [items]);

  const comandasComPendencia = groupedByComanda.filter(([, g]) =>
    g.items.some((i) => !i.aprovado),
  );

  function onApproveComanda(osId: string) {
    setError(null);
    startTransition(async () => {
      const res = await applyOsAprovacaoAction(tenantSlug, osId, {
        modo: "total",
        canal: "presencial",
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setItems((prev) =>
        prev.map((i) => (i.osId === osId ? { ...i, aprovado: true } : i)),
      );
    });
  }

  function onMove(item: KitchenItem, nextStatus: KitchenExecStatus) {
    setError(null);
    setItems((prev) =>
      prev.map((i) =>
        i.itemId === item.itemId ? { ...i, execucaoStatus: nextStatus } : i,
      ),
    );
    startTransition(async () => {
      const res = await updateOsItemExecucaoAction(
        tenantSlug,
        item.osId,
        item.itemId,
        { status: nextStatus },
      );
      if (!res.success) {
        setError(res.error);
        setItems((prev) =>
          prev.map((i) =>
            i.itemId === item.itemId
              ? { ...i, execucaoStatus: item.execucaoStatus }
              : i,
          ),
        );
      }
    });
  }

  const approvedItems = items.filter((i) => i.aprovado);

  return (
    <div className="space-y-4">
      {error ? (
        <p
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {comandasComPendencia.length > 0 ? (
        <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
          <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
            Comandas aguardando aprovação — não aparecem na fila até
            aprovar
          </p>
          <div className="flex flex-wrap gap-2">
            {comandasComPendencia.map(([numero, group]) => (
              <Button
                key={numero}
                size="sm"
                disabled={pending}
                onClick={() => onApproveComanda(group.osId)}
              >
                Aprovar comanda #{numero}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {COLUMNS.map((col) => {
          const colItems = approvedItems.filter(
            (i) => i.execucaoStatus === col.status,
          );
          return (
            <div
              key={col.status}
              className="rounded-xl border border-border/70 bg-card/40 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">
                  {col.label}
                </p>
                <Badge variant="outline">{colItems.length}</Badge>
              </div>
              <div className="space-y-2">
                {colItems.map((item) => (
                  <div
                    key={item.itemId}
                    className="rounded-md border border-border/60 bg-background p-2.5"
                  >
                    <p className="text-xs text-muted-foreground">
                      Comanda #{item.osNumero}
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {item.quantidade}× {item.descricao}
                    </p>
                    <div className="mt-2 flex gap-1.5">
                      {col.status === "pendente" ? (
                        <Button
                          size="sm"
                          disabled={pending}
                          onClick={() => onMove(item, "em_execucao")}
                        >
                          Iniciar preparo
                        </Button>
                      ) : null}
                      {col.status === "em_execucao" ? (
                        <Button
                          size="sm"
                          disabled={pending}
                          onClick={() => onMove(item, "concluido")}
                        >
                          Marcar pronto
                        </Button>
                      ) : null}
                      {col.status === "concluido" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => onMove(item, "em_execucao")}
                        >
                          Voltar
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
                {colItems.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    Nada aqui
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {items.length === 0 && comandasComPendencia.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma comanda com pedido em aberto no momento.
        </p>
      ) : null}
    </div>
  );
}
