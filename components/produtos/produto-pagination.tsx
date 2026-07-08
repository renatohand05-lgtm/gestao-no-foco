"use client";

import { useSearchParams } from "next/navigation";

import { Pagination } from "@/components/ui/pagination";

type ProdutoPaginationProps = {
  tenantSlug: string;
  page: number;
  totalPages: number;
};

export function ProdutoPagination({
  tenantSlug,
  page,
  totalPages,
}: ProdutoPaginationProps) {
  const searchParams = useSearchParams();

  function buildPageHref(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(targetPage));
    return `/${tenantSlug}/produtos?${params.toString()}`;
  }

  return (
    <Pagination page={page} totalPages={totalPages} buildPageHref={buildPageHref} />
  );
}
