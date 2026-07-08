"use client";

import { useSearchParams } from "next/navigation";

import { Pagination } from "@/components/ui/pagination";

type EstoquePaginationProps = {
  tenantSlug: string;
  page: number;
  totalPages: number;
};

export function EstoquePagination({
  tenantSlug,
  page,
  totalPages,
}: EstoquePaginationProps) {
  const searchParams = useSearchParams();

  function buildPageHref(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(targetPage));
    return `/${tenantSlug}/estoque?${params.toString()}`;
  }

  return (
    <Pagination page={page} totalPages={totalPages} buildPageHref={buildPageHref} />
  );
}
