"use client";

import { useSearchParams } from "next/navigation";

import { Pagination } from "@/components/ui/pagination";

type VendaPaginationProps = {
  tenantSlug: string;
  page: number;
  totalPages: number;
};

export function VendaPagination({
  tenantSlug,
  page,
  totalPages,
}: VendaPaginationProps) {
  const searchParams = useSearchParams();

  function buildPageHref(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(targetPage));
    return `/${tenantSlug}/vendas?${params.toString()}`;
  }

  return (
    <Pagination page={page} totalPages={totalPages} buildPageHref={buildPageHref} />
  );
}
