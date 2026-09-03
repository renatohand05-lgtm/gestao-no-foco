"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { changeOsStatusAction } from "@/lib/ordens/actions";
import type { DeliveryOrder, DeliveryStatus } from "@/lib/restaurante/delivery";

type Props = {
  tenantSlug: string;
  initialOrders: DeliveryOrder[];
  loadError: string | null;
};

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function DeliveryBoard({ tenantSlug, initialOrders, loadError }: Props) {
  const [orders, setOrders] = useState(initialOrders);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(loadError);

  function onAdvance(order: DeliveryOrder, nextStatus: DeliveryStatus | "entregue") {
    setError(null);
    if (nextStatus === "entregue") {
      setOrders((prev) => prev.filter((o) => o.osId !== order.osId));
    } else {
      setOrders((prev) =>
        prev.map((o) =>
          o.osId === order.osId ? { ...o, status: nextStatus } : o,
        ),
      );
    }
    startTransition(async () => {
      const res = await changeOsStatusAction(tenantSlug, order.osId, {
        status: nextStatus,
        motivo:
          nextStatus === "pronto_para_entrega"
            ? "Pronto para saída (Delivery)"
            : nextStatus === "entregue"
              ? "Entregue ao cliente (Delivery)"
              : undefined,
      });
      if (!res.success) {
        setError(res.error);
        setOrders(initialOrders);
      }
    });
  }

  const emPreparo = orders.filter((o) => o.status === "em_execucao");
  const prontos = orders.filter((o) => o.status === "pronto_para_entrega");

  function OrderCard({ order }: { order: DeliveryOrder }) {
    return (
      <div className="rounded-md border border-border/60 bg-background p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Comanda #{order.osNumero}
          </p>
          <span className="text-xs font-medium text-foreground">
            {formatCurrency(order.valorTotal)}
          </span>
        </div>
        <p className="mt-1 text-sm font-medium text-foreground">
          {order.clienteNome}
        </p>
        {order.clienteTelefone ? (
          <p className="text-xs text-muted-foreground">{order.clienteTelefone}</p>
        ) : null}
        <p className="mt-1 text-xs text-foreground">{order.endereco}</p>
        <div className="mt-2">
          {order.status === "em_execucao" ? (
            <Button
              size="sm"
              disabled={pending}
              onClick={() => onAdvance(order, "pronto_para_entrega")}
            >
              Pronto para sair
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={pending}
              onClick={() => onAdvance(order, "entregue")}
            >
              Marcar como entregue
            </Button>
          )}
        </div>
      </div>
    );
  }

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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-card/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Em preparo</p>
            <Badge variant="outline">{emPreparo.length}</Badge>
          </div>
          <div className="space-y-2">
            {emPreparo.map((order) => (
              <OrderCard key={order.osId} order={order} />
            ))}
            {emPreparo.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Nada aqui
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              Pronto para entrega
            </p>
            <Badge variant="outline">{prontos.length}</Badge>
          </div>
          <div className="space-y-2">
            {prontos.map((order) => (
              <OrderCard key={order.osId} order={order} />
            ))}
            {prontos.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Nada aqui
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum pedido de delivery em aberto no momento.
        </p>
      ) : null}
    </div>
  );
}
