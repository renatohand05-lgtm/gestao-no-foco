"use client";

import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { searchCatalogoOsAction } from "@/lib/ordens/actions";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setLoading(true);
      const res = await searchCatalogoOsAction(tenantSlug, q, tipo);
      setLoading(false);
      if (res.success) setResults(res.items);
    }, 250);
    return () => clearTimeout(t);
  }, [q, open, tenantSlug, tipo]);

  return (
    <div className="relative space-y-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
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
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-background shadow-md">
          {loading ? (
            <li className="px-3 py-2 text-muted-foreground">Buscando…</li>
          ) : null}
          {!loading && results.length === 0 ? (
            <li className="px-3 py-2 text-muted-foreground">
              Nenhum cadastro encontrado. Use item personalizado se necessário.
            </li>
          ) : null}
          {results.map((item) => {
            const isServico =
              item.tipo === "servico" || item.tipo === "serviço";
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={cn(
                    "w-full px-3 py-2 text-left hover:bg-muted/50",
                  )}
                  onClick={() => {
                    setSelectedLabel(item.nome);
                    setQ("");
                    setOpen(false);
                    onSelect(item);
                  }}
                >
                  <p className="font-medium">{item.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {isServico ? "Serviço" : "Produto"}
                    {item.sku ? ` · SKU ${item.sku}` : ""}
                    {item.codigo_interno ? ` · ${item.codigo_interno}` : ""}
                    {item.codigo_barras ? ` · EAN ${item.codigo_barras}` : ""}
                    {item.categoria ? ` · ${item.categoria}` : ""}
                    {" · "}
                    {formatCurrency(item.preco_venda)}
                    {!isServico
                      ? ` · est. ${item.estoque_atual}`
                      : ""}
                    {item.custo != null
                      ? ` · custo ${formatCurrency(item.custo)}`
                      : ""}
                    {item.margem_percent != null
                      ? ` · margem ${item.margem_percent}%`
                      : ""}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
