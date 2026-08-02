"use client";

import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";

import { gofControl, gofFocusRing } from "@/lib/design-system/primitives";
import {
  resolveOptionLabel,
  type ResolvableOption,
} from "@/lib/gf/resolve-option-label";
import { cn } from "@/lib/utils";

export type GFComboboxOption = ResolvableOption & {
  disabled?: boolean;
  group?: string;
};

export type GFComboboxProps = {
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  options: GFComboboxOption[];
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
  invalid?: boolean;
  emptyText?: string;
  loading?: boolean;
  "aria-label"?: string;
};

/**
 * Combobox canônico Sprint 27.8 — busca + painel themed (Base UI).
 */
export function GFCombobox({
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder = "Buscar…",
  disabled,
  name,
  id,
  className,
  invalid,
  emptyText = "Nenhum resultado",
  loading = false,
  "aria-label": ariaLabel,
}: GFComboboxProps) {
  const items = React.useMemo(
    () => options.map((o) => ({ ...o, id: o.value })),
    [options],
  );

  return (
    <ComboboxPrimitive.Root
      items={items}
      value={value ?? null}
      defaultValue={defaultValue ?? null}
      onValueChange={(next) => {
        if (next == null) {
          onValueChange?.(null);
          return;
        }
        if (typeof next === "string") {
          onValueChange?.(next);
          return;
        }
        const item = next as GFComboboxOption;
        onValueChange?.(item.value ?? null);
      }}
      disabled={disabled || loading}
      itemToStringLabel={(item) => {
        if (loading) return "Carregando…";
        if (typeof item === "string") {
          return resolveOptionLabel(item, options, {
            unavailableLabel: "Registro indisponível",
          });
        }
        const opt = item as GFComboboxOption;
        return resolveOptionLabel(opt?.value, options, {
          entityName: opt?.label,
          unavailableLabel: "Registro indisponível",
        });
      }}
      isItemEqualToValue={(item, selected) => {
        const a =
          typeof item === "string" ? item : (item as GFComboboxOption)?.value;
        const b =
          typeof selected === "string"
            ? selected
            : (selected as GFComboboxOption)?.value;
        return a === b;
      }}
    >
      <div className={cn("relative w-full", className)}>
        <ComboboxPrimitive.Input
          id={id}
          name={name}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-invalid={invalid || undefined}
          className={cn(
            gofControl,
            "dark:bg-input/30 pr-9",
            invalid && "border-destructive ring-2 ring-destructive/25",
          )}
        />
        <ComboboxPrimitive.Trigger
          className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground"
          aria-label="Abrir lista"
        >
          <ChevronsUpDownIcon className="size-4 opacity-60" />
        </ComboboxPrimitive.Trigger>
      </div>

      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner
          className="isolate z-50 outline-none"
          sideOffset={4}
        >
          <ComboboxPrimitive.Popup
            className={cn(
              "z-50 max-h-[min(20rem,var(--available-height))] w-(--anchor-width) min-w-48",
              "overflow-y-auto overscroll-contain rounded-lg border border-border/60",
              "bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10",
              "dark:border-white/[0.08] dark:bg-[var(--popover)]",
            )}
          >
            <ComboboxPrimitive.Empty className="px-2 py-3 text-center text-sm text-muted-foreground">
              {emptyText}
            </ComboboxPrimitive.Empty>
            <ComboboxPrimitive.List>
              {(item: GFComboboxOption) => (
                <ComboboxPrimitive.Item
                  key={item.value}
                  value={item}
                  disabled={item.disabled}
                  className={cn(
                    "relative flex w-full cursor-default items-center gap-2 rounded-md py-2 pr-8 pl-2 text-sm outline-none select-none",
                    "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                    "data-selected:bg-[color-mix(in_oklab,var(--brand-gold)_14%,transparent)]",
                    "data-disabled:pointer-events-none data-disabled:opacity-40",
                    gofFocusRing,
                  )}
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    {item.group ? (
                      <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                        {item.group}
                      </span>
                    ) : null}
                    <span className="truncate">{item.label}</span>
                  </div>
                  <ComboboxPrimitive.ItemIndicator className="absolute right-2 text-[var(--brand-gold)]">
                    <CheckIcon className="size-3.5" />
                  </ComboboxPrimitive.ItemIndicator>
                </ComboboxPrimitive.Item>
              )}
            </ComboboxPrimitive.List>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  );
}

export const GfCombobox = GFCombobox;
