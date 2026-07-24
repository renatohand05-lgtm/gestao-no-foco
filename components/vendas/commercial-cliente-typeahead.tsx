"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";

import {
  CI_CLIENTE_SEARCH_DEBOUNCE_MS,
  CI_CLIENTE_SEARCH_MIN_CHARS,
  shouldRunCiClienteSearch,
} from "@/lib/vendas/commercial-intelligence-compose";
import { searchClientesCommercialAction } from "@/lib/vendas/commercial-intelligence-actions";

export type CommercialClienteHit = {
  id: string;
  nome: string;
  documento?: string | null;
  telefone?: string | null;
};

type Props = {
  tenantSlug: string;
  name?: string;
  selectedId?: string;
  selectedLabel?: string | null;
};

export function CommercialClienteTypeahead({
  tenantSlug,
  name = "cliente",
  selectedId = "",
  selectedLabel = null,
}: Props) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CommercialClienteHit[]>([]);
  const [overrideId, setOverrideId] = useState<string | null>(null);
  const [overrideLabel, setOverrideLabel] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [activeIndex, setActiveIndex] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const clienteId = overrideId !== null ? overrideId : selectedId;
  const clienteLabel =
    overrideLabel !== null ? overrideLabel : (selectedLabel ?? "");

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function runSearch(term: string) {
    if (!shouldRunCiClienteSearch(term, CI_CLIENTE_SEARCH_MIN_CHARS)) {
      setHits([]);
      return;
    }
    startTransition(async () => {
      const result = await searchClientesCommercialAction(tenantSlug, term);
      if (result.success) {
        setHits(result.hits);
        setActiveIndex(0);
        setOpen(true);
      } else {
        setHits([]);
      }
    });
  }

  function onQueryChange(value: string) {
    setQuery(value);
    if (clienteId) {
      setOverrideId("");
      setOverrideLabel("");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      runSearch(value);
    }, CI_CLIENTE_SEARCH_DEBOUNCE_MS);
  }

  function selectHit(hit: CommercialClienteHit) {
    setOverrideId(hit.id);
    setOverrideLabel(hit.nome);
    setQuery("");
    setHits([]);
    setOpen(false);
  }

  function clearCliente() {
    setOverrideId("");
    setOverrideLabel("");
    setQuery("");
    setHits([]);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative min-w-[14rem] space-y-1 text-sm">
      <span className="text-muted-foreground">Cliente</span>
      <input type="hidden" name={name} value={clienteId} />
      {clienteId ? (
        <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
          <span className="min-w-0 flex-1 truncate font-medium">
            {clienteLabel || clienteId.slice(0, 8)}
          </span>
          <button
            type="button"
            onClick={clearCliente}
            className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
          >
            Limpar
          </button>
        </div>
      ) : (
        <input
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => {
            if (hits.length) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              return;
            }
            if (e.key === "ArrowDown" && hits.length) {
              e.preventDefault();
              setActiveIndex((i) => Math.min(i + 1, hits.length - 1));
              setOpen(true);
              return;
            }
            if (e.key === "ArrowUp" && hits.length) {
              e.preventDefault();
              setActiveIndex((i) => Math.max(i - 1, 0));
              return;
            }
            if (e.key === "Enter" && open && hits[activeIndex]) {
              e.preventDefault();
              selectHit(hits[activeIndex]);
            }
          }}
          placeholder={`Buscar nome, documento ou telefone (≥${CI_CLIENTE_SEARCH_MIN_CHARS})`}
          className="block w-full rounded-md border bg-background px-3 py-2"
          autoComplete="off"
        />
      )}
      {pending ? (
        <p className="text-xs text-muted-foreground">Buscando…</p>
      ) : null}
      {open && hits.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-card shadow-md"
        >
          {hits.map((hit, idx) => (
            <li
              key={hit.id}
              role="option"
              aria-selected={idx === activeIndex}
            >
              <button
                type="button"
                className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted ${
                  idx === activeIndex ? "bg-muted" : ""
                }`}
                onClick={() => selectHit(hit)}
              >
                <span className="font-medium">{hit.nome}</span>
                <span className="text-xs text-muted-foreground">
                  {[hit.documento, hit.telefone].filter(Boolean).join(" · ") ||
                    "Sem documento/telefone"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
