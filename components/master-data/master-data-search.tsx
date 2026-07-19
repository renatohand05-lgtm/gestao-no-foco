"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Search } from "lucide-react";

import { masterDataSearchAction } from "@/lib/master-data/actions";
import type {
  MasterEntityType,
  MasterSearchHit,
} from "@/lib/master-data/master-data-types";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<MasterEntityType, string> = {
  fornecedor: "Fornecedor",
  cliente: "Cliente",
  produto: "Produto",
  servico: "Serviço",
  categoria: "Categoria",
  plano: "Plano de contas",
  centro_custo: "Centro de custo",
  conta_bancaria: "Conta bancária",
  forma_pagamento: "Forma de pagamento",
  conta_pagar: "Conta a pagar",
  conta_receber: "Conta a receber",
  venda: "Venda",
  ordem_servico: "Ordem de serviço",
  dre_linha: "Linha DRE",
};

type Props = {
  tenantSlug: string;
  initialQuery?: string;
  className?: string;
};

export function MasterDataSearch({
  tenantSlug,
  initialQuery = "",
  className,
}: Props) {
  const listId = useId();
  const [query, setQuery] = useState(initialQuery);
  const [hits, setHits] = useState<MasterSearchHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  const trimmed = query.trim();
  const canSearch = trimmed.length >= 2;
  const visibleHits = canSearch ? hits : [];

  useEffect(() => {
    if (!canSearch) return;

    const id = ++requestId.current;
    const timer = setTimeout(() => {
      void (async () => {
        setLoading(true);
        const result = await masterDataSearchAction(tenantSlug, trimmed);
        if (id !== requestId.current) return;
        setLoading(false);
        if (!result.success) {
          setError(result.error);
          setHits([]);
          setActiveIndex(-1);
          return;
        }
        setError(null);
        setHits(result.hits);
        setActiveIndex(result.hits.length > 0 ? 0 : -1);
      })();
    }, 280);

    return () => {
      clearTimeout(timer);
    };
  }, [canSearch, trimmed, tenantSlug]);

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (visibleHits.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % visibleHits.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) =>
        prev <= 0 ? visibleHits.length - 1 : prev - 1,
      );
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      const hit = visibleHits[activeIndex];
      if (hit) window.location.href = hit.href;
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Buscar fornecedor, cliente, produto, categoria…"
          className="flex h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          aria-label="Busca global de cadastros"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
          }
          role="combobox"
          aria-expanded={visibleHits.length > 0}
        />
      </div>

      {loading && canSearch ? (
        <p className="text-sm text-muted-foreground">Buscando…</p>
      ) : null}
      {error && canSearch ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && canSearch && visibleHits.length === 0 && !error ? (
        <p className="text-sm text-muted-foreground">
          Nenhum resultado para “{trimmed}” neste tenant.
        </p>
      ) : null}

      {visibleHits.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="divide-y divide-border rounded-lg border border-border"
        >
          {visibleHits.map((hit, index) => (
            <li
              key={`${hit.type}-${hit.id}`}
              role="option"
              aria-selected={index === activeIndex}
            >
              <Link
                id={`${listId}-option-${index}`}
                href={hit.href}
                className={cn(
                  "flex flex-col gap-0.5 px-4 py-3 text-sm outline-none hover:bg-muted/50 focus-visible:bg-muted/50",
                  index === activeIndex && "bg-muted/60",
                )}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span className="font-medium">{hit.label}</span>
                <span className="text-xs text-muted-foreground">
                  {TYPE_LABEL[hit.type]}
                  {hit.subtitle ? ` · ${hit.subtitle}` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
