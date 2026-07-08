"use client";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  onClear?: () => void;
  placeholder?: string;
  loading?: boolean;
  className?: string;
  showSubmit?: boolean;
};

export function SearchInput({
  value,
  onChange,
  onSubmit,
  onClear,
  placeholder = "Buscar...",
  loading = false,
  className,
  showSubmit = true,
}: SearchInputProps) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit?.();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex w-full gap-2 sm:max-w-md", className)}
    >
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="pl-8"
        />
      </div>
      {showSubmit ? (
        <Button type="submit" variant="secondary" disabled={loading}>
          Buscar
        </Button>
      ) : null}
      {value && onClear ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClear}
          aria-label="Limpar busca"
        >
          <X className="size-4" />
        </Button>
      ) : null}
    </form>
  );
}
