"use client";

import { useEffect, useMemo, useState } from "react";

import {
  CatalogAddKindDialog,
  type CatalogAddKind,
} from "@/components/produtos/catalog-add-kind-dialog";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { searchCatalogoOsAction } from "@/lib/ordens/actions";

export type CatalogoItem = {
  id: string;
  nome: string;
  tipo: string;
  codigo_interno: string | null;
  sku: string | null;
  codigo_barras: string | null;
  categoria: string | null;
  preco_venda: number;
  custo: number | null;
  estoque_atual: number;
  margem_percent: number | null;
};

type Props = {
  tenantSlug: string;
  tipo?: "produto" | "servico" | "all";
  value: string;
  onSelect: (item: CatalogoItem) => void;
  disabled?: boolean;
  label?: string;
};

export function OsItemCatalogPicker({
  tenantSlug,
  tipo = "all",
  value,
  onSelect,
  disabled,
  label = "Buscar produto ou serviço cadastrado",
}: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CatalogoItem[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [kind, setKind] = useState<CatalogAddKind | null>(
    tipo === "all" ? null : tipo === "servico" ? "servico" : "produto",
  );

  const effectiveTipo =
    kind ?? (tipo === "all" ? "all" : tipo === "servico" ? "servico" : "produto");

  useEffect(() => {
    if (!open || !kind) return;
    const t = setTimeout(async () => {
      setLoading(true);
      const res = await searchCatalogoOsAction(
        tenantSlug,
        q,
        effectiveTipo === "all" ? "all" : effectiveTipo,
      );
      setLoading(false);
      if (res.success) setResults(res.items);
    }, 250);
    return () => clearTimeout(t);
  }, [q, open, tenantSlug, kind, effectiveTipo]);

  const grouped = useMemo(() => {
    const servicos = results.filter((r) => r.tipo === "servico");
    const produtos = results.filter((r) => r.tipo !== "servico");
    return { servicos, produtos };
  }, [results]);

  if (tipo === "all" && !kind) {
    return (
      <CatalogAddKindDialog
        open
        onChoose={(next) => {
          setKind(next);
          setOpen(true);
        }}
      />
    );
  }

  return (
    <div className="relative space-y-1 text-sm">
      <span className="text-muted-foreground">
        {kind === "servico"
          ? "Buscar serviço cadastrado"
          : kind === "produto"
            ? "Buscar produto cadastrado"
            : label}
      </span>
      {value && selectedLabel ? (
        <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2">
          <span className="font-medium">{selectedLabel}</span>
          <button
            type="button"
            disabled={disabled}
            className="text-xs underline"
            onClick={() => {
              setSelectedLabel("");
              onSelect({
                id: "",
                nome: "",
                tipo: "",
                codigo_interno: null,
                sku: null,
                codigo_barras: null,
                categoria: null,
                preco_venda: 0,
                custo: null,
                estoque_atual: 0,
                margem_percent: null,
              });
              setOpen(true);
            }}
          >
            Trocar
          </button>
        </div>
      ) : (
        <Input
          value={q}
          disabled={disabled}
          placeholder="Nome, SKU, código ou código de barras…"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          className="h-11"
          autoComplete="off"
        />
      )}
      {open && !value ? (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border/60 bg-popover text-popover-foreground shadow-md dark:bg-[var(--popover)]">
          {loading ? (
            <li className="px-3 py-2 text-muted-foreground">Buscando…</li>
          ) : null}
          {!loading && results.length === 0 ? (
            <li className="px-3 py-2 text-muted-foreground">
              Nenhum cadastro encontrado. Use item personalizado se necessário.
            </li>
          ) : null}
          {!loading && grouped.servicos.length > 0 ? (
            <li className="px-3 py-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              Serviços
            </li>
          ) : null}
          {grouped.servicos.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-accent"
                onClick={() => {
                  setSelectedLabel(item.nome);
                  setQ("");
                  setOpen(false);
                  onSelect(item);
                }}
              >
                <p className="font-medium">{item.nome}</p>
                <p className="text-xs text-muted-foreground">
                  SERVIÇO
                  {item.codigo_interno ? ` · ${item.codigo_interno}` : ""}
                  {" · "}
                  {formatCurrency(item.preco_venda)}
                  {item.custo != null
                    ? ` · custo MO ${formatCurrency(item.custo)}`
                    : ""}
                </p>
              </button>
            </li>
          ))}
          {!loading && grouped.produtos.length > 0 ? (
            <li className="px-3 py-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              Produtos
            </li>
          ) : null}
          {grouped.produtos.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-accent"
                onClick={() => {
                  setSelectedLabel(item.nome);
                  setQ("");
                  setOpen(false);
                  onSelect(item);
                }}
              >
                <p className="font-medium">{item.nome}</p>
                <p className="text-xs text-muted-foreground">
                  PRODUTO
                  {item.sku ? ` · SKU ${item.sku}` : ""}
                  {" · "}
                  {formatCurrency(item.preco_venda)}
                  {` · est. ${item.estoque_atual}`}
                </p>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
