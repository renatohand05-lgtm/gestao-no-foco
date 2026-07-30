"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createSupplyPurchaseOrderAction,
  transitionSupplyPurchaseOrderAction,
} from "@/lib/supply/supply-enterprise-actions";
import {
  PURCHASE_STATUS_LABELS,
  type PurchaseWorkflowStatus,
} from "@/lib/supply";

type Row = {
  id: string;
  status: string;
  numero: number | null;
  valor_total: number | null;
  created_at: string;
};

const NEXT: Partial<Record<PurchaseWorkflowStatus, PurchaseWorkflowStatus>> = {
  rascunho: "solicitacao",
  solicitacao: "aprovacao",
  aprovacao: "pedido",
  pedido: "recebimento",
  recebimento: "conferencia",
  conferencia: "integrado",
};

type Props = {
  tenantSlug: string;
  ready: boolean;
  initialRows: Row[];
};

export function PurchaseOrdersClient({
  tenantSlug,
  ready,
  initialRows,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [produtoId, setProdutoId] = useState("");
  const [qty, setQty] = useState("1");
  const [preco, setPreco] = useState("");

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function createDraft() {
    setError(null);
    try {
      const quantidade = Number(qty);
      const precoUnitario = preco === "" ? null : Number(preco);
      await createSupplyPurchaseOrderAction(tenantSlug, {
        lines: [
          {
            produtoId: produtoId.trim(),
            quantidade,
            precoUnitario:
              precoUnitario != null && Number.isFinite(precoUnitario)
                ? precoUnitario
                : null,
            fornecedorId: null,
          },
        ],
      });
      setProdutoId("");
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao criar pedido");
    }
  }

  async function advance(id: string, status: string) {
    setError(null);
    const next = NEXT[status as PurchaseWorkflowStatus];
    if (!next) {
      setError("Sem transição disponível a partir deste status.");
      return;
    }
    try {
      await transitionSupplyPurchaseOrderAction(tenantSlug, id, next);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na transição");
    }
  }

  if (!ready) return null;

  return (
    <div className="space-y-4">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="rounded-md border p-4 space-y-3">
        <h2 className="text-sm font-medium">Novo pedido (rascunho)</h2>
        <p className="text-xs text-muted-foreground">
          Informe o UUID do produto (catálogo). Integração financeira/estoque
          ocorre apenas no status Integrado, sem falso sucesso.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Input
            aria-label="ID do produto"
            placeholder="produto_id (UUID)"
            value={produtoId}
            onChange={(e) => setProdutoId(e.target.value)}
          />
          <Input
            aria-label="Quantidade"
            type="number"
            min="0.001"
            step="0.001"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
          <Input
            aria-label="Preço unitário"
            type="number"
            min="0"
            step="0.01"
            placeholder="Preço unitário (opcional)"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
          />
        </div>
        <Button
          type="button"
          disabled={pending || !produtoId.trim()}
          onClick={() => void createDraft()}
        >
          Criar rascunho
        </Button>
      </div>

      <div className="space-y-2">
        {initialRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum pedido neste tenant.</p>
        ) : (
          initialRows.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm"
            >
              <div>
                <div className="font-medium">
                  #{r.numero ?? r.id.slice(0, 8)}
                </div>
                <div className="text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("pt-BR")}
                </div>
              </div>
              <Badge variant="outline">
                {PURCHASE_STATUS_LABELS[
                  r.status as keyof typeof PURCHASE_STATUS_LABELS
                ] ?? r.status}
              </Badge>
              <div className="tabular-nums">
                {r.valor_total != null
                  ? Number(r.valor_total).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })
                  : "—"}
              </div>
              {NEXT[r.status as PurchaseWorkflowStatus] ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => void advance(r.id, r.status)}
                >
                  Avançar →{" "}
                  {PURCHASE_STATUS_LABELS[NEXT[r.status as PurchaseWorkflowStatus]!]}
                </Button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
