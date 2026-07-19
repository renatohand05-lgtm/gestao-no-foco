"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { SectionCard } from "@/components/ui/section-card";
import { formatCurrency, formatDateOnly } from "@/lib/financeiro/format";
import { DRE_LINHA_LABELS, type DreLinhaEconomica } from "@/lib/dre";
import type { DreDrillItem } from "@/types/dre";

type Props = {
  tenantSlug: string;
  linha: string;
  detalhe?: string;
  items: DreDrillItem[];
};

function editHref(tenantSlug: string, item: DreDrillItem) {
  if (item.origem === "venda") {
    return `/${tenantSlug}/vendas/${item.corrigirId}`;
  }
  if (item.origem === "conta_receber") {
    return `/${tenantSlug}/financeiro/contas-receber/${item.corrigirId}/editar?classificacaoOnly=true`;
  }
  return `/${tenantSlug}/financeiro/contas-pagar/${item.corrigirId}/editar?classificacaoOnly=true`;
}

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs";

export function DreDrillPanel({ tenantSlug, linha, detalhe, items }: Props) {
  const label =
    DRE_LINHA_LABELS[linha as DreLinhaEconomica] ?? linha;
  const title = detalhe
    ? `Origens — ${label}${detalhe === "__none__" ? " / sem detalhe" : ""}`
    : `Origens — ${label}`;
  const [centro, setCentro] = useState("");
  const [categoria, setCategoria] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [status, setStatus] = useState("");
  const [origem, setOrigem] = useState("");
  const [competencia, setCompetencia] = useState("");

  const options = useMemo(() => {
    const centros = new Set<string>();
    const categorias = new Set<string>();
    const fornecedores = new Set<string>();
    const statuses = new Set<string>();
    const origens = new Set<string>();
    const comps = new Set<string>();
    for (const item of items) {
      if (item.centroCustoNome) centros.add(item.centroCustoNome);
      if (item.categoriaNome) categorias.add(item.categoriaNome);
      if (item.fornecedorNome) fornecedores.add(item.fornecedorNome);
      if (item.status) statuses.add(item.status);
      if (item.origem) origens.add(item.origem);
      if (item.competencia) comps.add(item.competencia.slice(0, 7));
    }
    return {
      centros: [...centros].sort(),
      categorias: [...categorias].sort(),
      fornecedores: [...fornecedores].sort(),
      statuses: [...statuses].sort(),
      origens: [...origens].sort(),
      comps: [...comps].sort(),
    };
  }, [items]);

  const filtered = items.filter((item) => {
    if (centro && item.centroCustoNome !== centro) return false;
    if (categoria && item.categoriaNome !== categoria) return false;
    if (fornecedor && item.fornecedorNome !== fornecedor) return false;
    if (status && item.status !== status) return false;
    if (origem && item.origem !== origem) return false;
    if (competencia && !item.competencia.startsWith(competencia)) return false;
    return true;
  });

  return (
    <SectionCard
      title={title}
      description="Competência econômica (não data de pagamento). Pagamento alimenta o Fluxo."
    >
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum lançamento classificado nesta linha no período.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <select
              className={selectClassName}
              value={centro}
              onChange={(e) => setCentro(e.target.value)}
            >
              <option value="">Centro</option>
              {options.centros.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <select
              className={selectClassName}
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              <option value="">Categoria</option>
              {options.categorias.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <select
              className={selectClassName}
              value={fornecedor}
              onChange={(e) => setFornecedor(e.target.value)}
            >
              <option value="">Fornecedor</option>
              {options.fornecedores.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <select
              className={selectClassName}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Status</option>
              {options.statuses.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <select
              className={selectClassName}
              value={origem}
              onChange={(e) => setOrigem(e.target.value)}
            >
              <option value="">Origem</option>
              {options.origens.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <select
              className={selectClassName}
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
            >
              <option value="">Competência</option>
              {options.comps.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <ul className="space-y-3">
            {filtered.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-border/60 px-3 py-2.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium">{item.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      Competência {formatDateOnly(item.competencia)}
                      {item.dataVencimento
                        ? ` · Venc. ${formatDateOnly(item.dataVencimento)}`
                        : ""}
                      {item.dataPagamento
                        ? ` · Pag. ${formatDateOnly(item.dataPagamento)}`
                        : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[
                        item.fornecedorNome,
                        item.categoriaNome,
                        item.planoContaNome,
                        item.centroCustoNome,
                        item.status,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {item.rateioPercentual != null ? (
                      <p className="text-xs text-muted-foreground">
                        Rateio {item.rateioPercentual}%
                        {item.rateioDescricao ? ` — ${item.rateioDescricao}` : ""}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      Origem: {item.origem.replaceAll("_", " ")}
                      {item.documento ? ` · Doc. ${item.documento}` : ""}
                      {` · Linha DRE: ${label}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">
                      {formatCurrency(item.valor)}
                    </p>
                    <Link
                      href={editHref(tenantSlug, item)}
                      className="text-xs font-medium text-blue-700 underline underline-offset-2"
                    >
                      Abrir lançamento
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}
