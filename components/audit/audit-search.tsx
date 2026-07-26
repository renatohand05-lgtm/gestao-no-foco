"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  value?: string;
  placeholder?: string;
  className?: string;
  onSearch?: (text: string) => void;
};

/**
 * Campo de busca de auditoria — controlado ou não-controlado leve.
 * A busca real fica em lib/audit/search (sem I/O).
 */
export function AuditSearch({
  value,
  placeholder = "Buscar eventos, usuário, correlationId…",
  className,
  onSearch,
}: Props) {
  const [internal, setInternal] = useState(value ?? "");
  const text = value ?? internal;

  return (
    <form
      data-audit-search
      className={cn("flex flex-col gap-2 sm:flex-row sm:items-center", className)}
      onSubmit={(e) => {
        e.preventDefault();
        onSearch?.(text.trim());
      }}
    >
      <label className="sr-only" htmlFor="audit-search-input">
        Buscar auditoria
      </label>
      <input
        id="audit-search-input"
        type="search"
        value={text}
        placeholder={placeholder}
        className={cn(
          "min-h-10 w-full flex-1 rounded-xl border border-border bg-[var(--brand-white)] px-3 text-sm text-foreground",
          "outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/35",
          gofTypography.subtitle,
        )}
        onChange={(e) => {
          setInternal(e.target.value);
          if (value !== undefined) onSearch?.(e.target.value);
        }}
      />
      <Button type="submit" variant="outline" className="shrink-0">
        Buscar
      </Button>
    </form>
  );
}
