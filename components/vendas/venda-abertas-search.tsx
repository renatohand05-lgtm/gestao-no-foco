"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { SearchInput } from "@/components/ui/search-input";

type VendaAbertasSearchProps = {
  tenantSlug: string;
  defaultValue?: string;
};

export function VendaAbertasSearch({
  tenantSlug,
  defaultValue = "",
}: VendaAbertasSearchProps) {
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

    startTransition(() => {
      const queryString = params.toString();
      router.push(
        queryString
          ? `/${tenantSlug}/vendas/abertas?${queryString}`
          : `/${tenantSlug}/vendas/abertas`,
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
      placeholder="Buscar por número ou cliente"
      loading={isPending}
    />
  );
}

