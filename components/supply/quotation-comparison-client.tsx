"use client";

/**
 * Sprint 25.4.3 — Comparação lado a lado de cotações.
 * Sugestão determinística com explicação — escolha humana obrigatória.
 */

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  assertHumanWinnerDecision,
  buildQuotationComparison,
  type QuotationLineCompare,
} from "@/lib/supply/enterprise/quotation-comparison";

type Props = {
  tenantSlug: string;
  lines: QuotationLineCompare[];
};

export function QuotationComparisonClient({ tenantSlug, lines }: Props) {
  const rows = useMemo(() => buildQuotationComparison(lines), [lines]);
  const [selections, setSelections] = useState<
    Record<string, { fornecedorId: string; justificativa: string }>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function confirm() {
    setError(null);
    setInfo(null);
    try {
      const decision = {
        mode: "por_item" as const,
        selections: Object.entries(selections).map(([produtoKey, s]) => ({
          produtoKey,
          fornecedorId: s.fornecedorId,
          justificativa: s.justificativa,
        })),
      };
      assertHumanWinnerDecision(decision);
      setInfo(
        `Decisão registrada para ${decision.selections.length} item(ns) em ${tenantSlug}. Gere o pedido após confirmação no fluxo de compras.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na confirmação");
    }
  }

  if (!lines.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma cotação carregada. Importe ou cadastre propostas por fornecedor.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Comparação lado a lado. A sugestão explica critérios e confiança — não
        escolhe automaticamente.
      </p>
      {rows.map((row) => (
        <div key={row.produtoKey} className="rounded-lg border p-4 space-y-2">
          <h3 className="font-medium">{row.descricao}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="p-1">Fornecedor</th>
                  <th className="p-1">Unit.</th>
                  <th className="p-1">Total</th>
                  <th className="p-1">Frete</th>
                  <th className="p-1">Prazo</th>
                  <th className="p-1">Sugestão</th>
                </tr>
              </thead>
              <tbody>
                {row.offers.map((o) => (
                  <tr key={o.fornecedorId} className="border-t">
                    <td className="p-1">{o.fornecedorNome}</td>
                    <td className="p-1 tabular-nums">{o.precoUnitario}</td>
                    <td className="p-1 tabular-nums">{o.custoTotal}</td>
                    <td className="p-1 tabular-nums">
                      {o.freteInformado ?? "—"}
                    </td>
                    <td className="p-1">{o.prazoDias ?? "—"}</td>
                    <td className="p-1 text-xs text-muted-foreground">
                      {o.fornecedorId === row.suggestedFornecedorId
                        ? o.motivoSugestao
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label>Vencedor (manual)</Label>
              <select
                className="flex h-10 w-full rounded-md border px-3 text-sm"
                value={selections[row.produtoKey]?.fornecedorId ?? ""}
                onChange={(e) =>
                  setSelections((prev) => ({
                    ...prev,
                    [row.produtoKey]: {
                      fornecedorId: e.target.value,
                      justificativa: prev[row.produtoKey]?.justificativa ?? "",
                    },
                  }))
                }
                aria-label={`Vencedor ${row.descricao}`}
              >
                <option value="">Selecione…</option>
                {row.offers.map((o) => (
                  <option key={o.fornecedorId} value={o.fornecedorId}>
                    {o.fornecedorNome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Justificativa</Label>
              <input
                className="flex h-10 w-full rounded-md border px-3 text-sm"
                value={selections[row.produtoKey]?.justificativa ?? ""}
                onChange={(e) =>
                  setSelections((prev) => ({
                    ...prev,
                    [row.produtoKey]: {
                      fornecedorId: prev[row.produtoKey]?.fornecedorId ?? "",
                      justificativa: e.target.value,
                    },
                  }))
                }
                aria-label={`Justificativa ${row.descricao}`}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Delta vs melhor preço: {row.financialDeltaVsBest}
          </p>
        </div>
      ))}
      <Button type="button" onClick={confirm}>
        Confirmar escolha humana
      </Button>
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
    </div>
  );
}
