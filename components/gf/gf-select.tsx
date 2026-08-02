"use client";

import * as React from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { CheckIcon, ChevronDownIcon } from "lucide-react";

import { gofControl, gofFocusRing } from "@/lib/design-system/primitives";
import {
  resolveOptionLabel,
  type ResolvableOption,
} from "@/lib/gf/resolve-option-label";
import { cn } from "@/lib/utils";

export type GFSelectOption = ResolvableOption & {
  disabled?: boolean;
};

export type GFSelectProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: GFSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  className?: string;
  triggerClassName?: string;
  /** Erro / aria-invalid */
  invalid?: boolean;
  loading?: boolean;
  emptyText?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

/**
 * Select canônico — painel themed; labels resolvidos (nunca UUID na UI).
 */
export function GFSelect({
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder = "Selecione…",
  disabled,
  required,
  name,
  id,
  className,
  triggerClassName,
  invalid,
  loading = false,
  emptyText = "Nenhuma opção",
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: GFSelectProps) {
  const items = React.useMemo(
    () =>
      options.map((o) => ({
        value: o.value,
        label: o.label,
      })),
    [options],
  );

  const displayPlaceholder = loading ? "Carregando…" : placeholder;

  const controlledValue =
    value === "" || value == null ? undefined : value;
  const controlledDefault =
    defaultValue === "" || defaultValue == null ? undefined : defaultValue;

  return (
    <SelectPrimitive.Root
      value={controlledValue}
      defaultValue={controlledDefault}
      onValueChange={(next) => {
        if (typeof next === "string") onValueChange?.(next);
      }}
      disabled={disabled || loading}
      required={required}
      name={name}
      id={id}
      items={items}
    >
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-invalid={invalid || undefined}
        aria-busy={loading || undefined}
        className={cn(
          gofControl,
          "dark:bg-input/30",
          "inline-flex items-center justify-between gap-2",
          "data-placeholder:text-muted-foreground",
          invalid && "border-destructive ring-2 ring-destructive/25",
          triggerClassName,
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={displayPlaceholder}>
          {(selected) => {
            if (loading) return "Carregando…";
            const raw =
              selected == null
                ? ""
                : typeof selected === "string"
                  ? selected
                  : String(
                      (selected as { value?: string })?.value ?? selected,
                    );
            if (!raw) return displayPlaceholder;
            return resolveOptionLabel(raw, options, {
              unavailableLabel: "Registro indisponível",
            });
          }}
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon className="size-4 shrink-0 opacity-60">
          <ChevronDownIcon className="size-4" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner
          className="isolate z-50 outline-none"
          sideOffset={4}
          alignItemWithTrigger={false}
        >
          <SelectPrimitive.Popup
            className={cn(
              "z-50 max-h-[min(20rem,var(--available-height))] w-(--anchor-width) min-w-40",
              "origin-(--transform-origin) overflow-y-auto overscroll-contain",
              "rounded-lg border border-border/60 bg-popover p-1 text-popover-foreground shadow-md",
              "ring-1 ring-foreground/10 outline-none",
              "dark:border-white/[0.08] dark:bg-[var(--popover)] dark:text-popover-foreground",
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
              "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            )}
          >
            {options.length === 0 ? (
              <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                {loading ? "Carregando…" : emptyText}
              </div>
            ) : (
              <SelectPrimitive.List>
                {options.map((option) => (
                  <SelectPrimitive.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className={cn(
                      "relative flex w-full cursor-default items-center gap-2 rounded-md py-2 pr-8 pl-2 text-sm outline-none select-none",
                      "text-popover-foreground",
                      "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                      "data-selected:bg-[color-mix(in_oklab,var(--brand-gold)_14%,transparent)]",
                      "data-selected:text-foreground",
                      "data-disabled:pointer-events-none data-disabled:opacity-40",
                      gofFocusRing,
                    )}
                  >
                    <SelectPrimitive.ItemText className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{option.label}</span>
                      {option.description ? (
                        <span className="truncate text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      ) : null}
                    </SelectPrimitive.ItemText>
                    <SelectPrimitive.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center text-[var(--brand-gold)]">
                      <CheckIcon className="size-3.5" />
                    </SelectPrimitive.ItemIndicator>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.List>
            )}
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

/** Alias de API estável */
export const GfSelect = GFSelect;
