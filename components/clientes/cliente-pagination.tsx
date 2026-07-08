"use client";

import { useSearchParams } from "next/navigation";

import { Pagination } from "@/components/ui/pagination";

type ClientePaginationProps = {
  tenantSlug: string;
  page: number;
  totalPages: number;
};

export function ClientePagination({
  tenantSlug,
  page,
  totalPages,
}: ClientePaginationProps) {
  const searchParams = useSearchParams();

  function buildPageHref(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(targetPage));
    return `/${tenantSlug}/clientes?${params.toString()}`;
  }

  return (
    <Pagination page={page} totalPages={totalPages} buildPageHref={buildPageHref} />
  );
}
