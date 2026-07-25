"use client";

import { useId } from "react";

import { gofFocusRing, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import { ExecutiveButton } from "@/components/executive";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  className?: string;
};

export function ExecutiveCopilotInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  className,
}: Props) {
  const id = useId();

  return (
    <form
      className={cn("flex flex-col gap-2 sm:flex-row sm:items-end", className)}
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled && value.trim()) onSubmit();
      }}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <label htmlFor={id} className={gofTypography.caption}>
          Pergunte ao Copiloto Executivo
        </label>
        <textarea
          id={id}
          rows={2}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!disabled && value.trim()) onSubmit();
            }
          }}
          placeholder="Ex.: Como está minha empresa hoje?"
          className={cn(
            "w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm",
            gofFocusRing,
          )}
          aria-label="Pergunta para o Copiloto Executivo"
        />
        <p className={gofTypography.caption}>
          Enter envia · Shift+Enter quebra linha
        </p>
      </div>
      <ExecutiveButton type="submit" disabled={disabled || !value.trim()}>
        Perguntar
      </ExecutiveButton>
    </form>
  );
}
