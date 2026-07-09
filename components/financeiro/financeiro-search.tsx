"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { SearchInput } from "@/components/ui/search-input";

type FinanceiroSearchProps = {
  tenantSlug: string;
  basePath: string;
  defaultValue?: string;
  placeholder?: string;
};

export function FinanceiroSearch({
  tenantSlug,
  basePath,
  defaultValue = "",
  placeholder = "Buscar...",
}: FinanceiroSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(defaultValue);
  const [isPending, startTransition] = useTransition();

  function applySearch(value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value.trim()) {
      params.set("q", value.trim());
    } else {
      params.delete("q");
    }

    params.delete("page");

    startTransition(() => {
      const queryString = params.toString();
      router.push(
        queryString
          ? `/${tenantSlug}/financeiro/${basePath}?${queryString}`
          : `/${tenantSlug}/financeiro/${basePath}`,
      );
    });
  }

  return (
    <SearchInput
      value={query}
      onChange={setQuery}
      onSubmit={() => applySearch(query)}
      onClear={() => {
        setQuery("");
        applySearch("");
      }}
      placeholder={placeholder}
      loading={isPending}
    />
  );
}
