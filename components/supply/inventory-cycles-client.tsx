"use client";

/**
 * Sprint 25.4.3 — Contagem item a item (não altera estoque antes da aprovação).
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  createSupplyInventoryCycleAction,
  upsertSupplyInventoryCountAction,
} from "@/lib/supply/supply-enterprise-actions";

type Row = {
  id: string;
  kind: string;
  status: string;
  created_at: string;
};

type Props = {
  tenantSlug: string;
  ready: boolean;
  initialRows: Row[];
};

export function InventoryCyclesClient({
  tenantSlug,
  ready,
  initialRows,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(
    initialRows[0]?.id ?? null,
  );
  const [produtoId, setProdutoId] = useState("");
  const [saldoSistema, setSaldoSistema] = useState("0");
  const [contagem, setContagem] = useState("");
  const [custo, setCusto] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [contagemCega, setContagemCega] = useState(false);
  const [barcode, setBarcode] = useState("");

  if (!ready) return null;

  async function create(kind: "geral" | "rotativo") {
    setError(null);
    try {
      const res = await createSupplyInventoryCycleAction(tenantSlug, kind);
      setActiveId(res.id);
      setInfo(
        `Ciclo ${kind} criado. Contagens não alteram estoque até aprovação.`,
      );
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao criar inventário");
    }
  }

  async function saveCount() {
    if (!activeId) {
      setError("Selecione ou crie um inventário.");
      return;
    }
    setError(null);
    setInfo(null);
    try {
      const res = await upsertSupplyInventoryCountAction(tenantSlug, {
        inventarioId: activeId,
        produtoId: produtoId.trim() || barcode.trim(),
        saldoSistema: Number(saldoSistema.replace(",", ".")),
        contagem: Number(contagem.replace(",", ".")),
        custoUnitario: custo ? Number(custo.replace(",", ".")) : null,
        justificativa: justificativa || null,
      });
      setInfo(
        `Contagem salva (divergência ${res.divergencia}). Estoque NÃO alterado (${String(res.stockMutated)}).`,
      );
      setContagem("");
      setJustificativa("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na contagem");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={pending}
          onClick={() => void create("geral")}
        >
          Novo inventário geral
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => void create("rotativo")}
        >
          Novo inventário rotativo
        </Button>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={contagemCega}
            onChange={(e) => setContagemCega(e.target.checked)}
          />
          Contagem cega (ocultar esperado até contar)
        </label>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="text-sm font-semibold">Contagem item a item</h3>
        <p className="text-xs text-muted-foreground">
          Nenhuma contagem altera estoque antes da aprovação/ajuste.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <Label>Inventário ativo</Label>
            <select
              className="flex h-10 w-full rounded-md border px-3 text-sm"
              value={activeId ?? ""}
              onChange={(e) => setActiveId(e.target.value || null)}
              aria-label="Inventário ativo"
            >
              <option value="">—</option>
              {initialRows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.kind} · {r.status} · {r.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Produto ID / código de barras</Label>
            <input
              className="flex h-10 w-full rounded-md border px-3 text-sm"
              value={produtoId}
              onChange={(e) => setProdutoId(e.target.value)}
              placeholder="UUID do produto"
              aria-label="Produto ID"
            />
          </div>
          <div className="space-y-1">
            <Label>Leitura código de barras</Label>
            <input
              className="flex h-10 w-full rounded-md border px-3 text-sm"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (barcode.trim()) setProdutoId(barcode.trim());
                }
              }}
              aria-label="Código de barras"
            />
          </div>
          {!contagemCega ? (
            <div className="space-y-1">
              <Label>Esperado (sistema)</Label>
              <input
                className="flex h-10 w-full rounded-md border px-3 text-sm"
                value={saldoSistema}
                onChange={(e) => setSaldoSistema(e.target.value)}
                inputMode="decimal"
                aria-label="Saldo esperado"
              />
            </div>
          ) : (
            <div className="space-y-1 text-sm text-muted-foreground">
              Contagem cega: esperado oculto até salvar contagem.
              <input type="hidden" value={saldoSistema} readOnly />
            </div>
          )}
          <div className="space-y-1">
            <Label>Contado</Label>
            <input
              className="flex h-10 w-full rounded-md border px-3 text-sm"
              value={contagem}
              onChange={(e) => setContagem(e.target.value)}
              inputMode="decimal"
              aria-label="Quantidade contada"
            />
          </div>
          <div className="space-y-1">
            <Label>Custo unitário (divergência)</Label>
            <input
              className="flex h-10 w-full rounded-md border px-3 text-sm"
              value={custo}
              onChange={(e) => setCusto(e.target.value)}
              inputMode="decimal"
              aria-label="Custo unitário"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Justificativa</Label>
            <input
              className="flex h-10 w-full rounded-md border px-3 text-sm"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              aria-label="Justificativa"
            />
          </div>
        </div>
        <Button type="button" disabled={pending} onClick={() => void saveCount()}>
          Salvar contagem (rascunho)
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {info ? (
        <p className="text-sm" role="status">
          {info}
        </p>
      ) : null}

      <div className="space-y-2">
        {initialRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum ciclo.</p>
        ) : (
          initialRows.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between border-b py-2 text-sm"
            >
              <button
                type="button"
                className="text-left"
                onClick={() => setActiveId(c.id)}
              >
                <div className="font-medium">{c.kind}</div>
                <div className="text-muted-foreground">
                  {new Date(c.created_at).toLocaleString("pt-BR")}
                </div>
              </button>
              <Badge variant="outline">{c.status}</Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
