"use client";

import { useSearchParams } from "next/navigation";

import { Pagination } from "@/components/ui/pagination";

type FinanceiroPaginationProps = {
  tenantSlug: string;
  basePath: string;
  page: number;
  totalPages: number;
};

export function FinanceiroPagination({
  tenantSlug,
  basePath,
  page,
  totalPages,
}: FinanceiroPaginationProps) {
  const searchParams = useSearchParams();

  function buildPageHref(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(targetPage));
    return `/${tenantSlug}/financeiro/${basePath}?${params.toString()}`;
  }

  return (
    <Pagination
      page={page}
      totalPages={totalPages}
      buildPageHref={buildPageHref}
    />
  );
}
