"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { OPERATIONAL_AUTOCOMPLETE_PROPS } from "@/lib/ux/browser-autocomplete";
import {
  rankLibrarySuggestions,
  shouldOfferCustomName,
  type CatalogSuggestionDto,
  type RankedCatalogSuggestion,
} from "@/lib/segments/catalogs/suggest.ts";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  items: CatalogSuggestionDto[];
  existingNames?: string[];
  placeholder?: string;
  disabled?: boolean;
  onPickTemplate: (item: RankedCatalogSuggestion) => void;
  onPickCustom?: (name: string) => void;
};

export function ServiceCatalogSuggest({
  id,
  value,
  onChange,
  items,
  existingNames = [],
  placeholder = "Nome do serviço",
  disabled = false,
  onPickTemplate,
  onPickCustom,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const ranked = useMemo(
    () =>
      rankLibrarySuggestions({
        items,
        query: value,
        existingNames,
        mode: "create",
        limit: 10,
      }),
    [items, value, existingNames],
  );
  const offerCustom = shouldOfferCustomName(value, items);
  const optionsCount = ranked.length + (offerCustom ? 1 : 0);

  useEffect(() => {
    function onDocMouse(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouse);
    return () => document.removeEventListener("mousedown", onDocMouse);
  }, []);

  function pickTemplate(item: RankedCatalogSuggestion) {
    if (item.alreadyRegistered) return;
    onPickTemplate(item);
    setOpen(false);
  }

  function pickCustom() {
    const name = value.trim();
    if (!name) return;
    onPickCustom?.(name);
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(optionsCount - 1, i + 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (active < ranked.length) {
        const item = ranked[active];
        if (item) pickTemplate(item);
      } else if (offerCustom) {
        pickCustom();
      }
    }
  }

  return (
    <div ref={rootRef} className="relative" data-fast-input="catalog-suggest">
      <input
        id={id}
        className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        name="gestoo-service-name"
        {...OPERATIONAL_AUTOCOMPLETE_PROPS}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
      />
      {open && optionsCount > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 text-sm shadow-md"
        >
          {ranked.map((item, index) => (
            <li
              key={item.id}
              role="option"
              aria-selected={index === active}
              aria-disabled={item.alreadyRegistered}
              className={cn(
                "cursor-pointer rounded-md px-3 py-2 min-h-11",
                index === active && "bg-muted",
                item.alreadyRegistered && "cursor-default opacity-60",
              )}
              onMouseEnter={() => setActive(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                pickTemplate(item);
              }}
            >
              <div className="font-medium">{item.name}</div>
              <div className="text-[11px] text-muted-foreground">
                {item.category}
                {item.defaultDurationMinutes
                  ? ` · ${item.defaultDurationMinutes} min`
                  : ""}
                {item.alreadyRegistered ? " · Já cadastrado" : ""}
              </div>
            </li>
          ))}
          {offerCustom ? (
            <li
              role="option"
              aria-selected={active === ranked.length}
              className={cn(
                "cursor-pointer rounded-md px-3 py-2 min-h-11",
                active === ranked.length && "bg-muted",
              )}
              onMouseEnter={() => setActive(ranked.length)}
              onMouseDown={(event) => {
                event.preventDefault();
                pickCustom();
              }}
            >
              Criar “{value.trim()}” como serviço personalizado
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
