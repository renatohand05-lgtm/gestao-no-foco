/** Tipos compartilhados de paginação (Sprint 9.8). */

export type SortOrder = "asc" | "desc";

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  /** pageSize do contrato Financeiro / Sprint 9.8.4. */
  perPage: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
};

/** Monta metadados de paginação quando `data` já é a fatia da página (query no banco). */
export function toPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  perPage: number,
): PaginatedResult<T> {
  const safePerPage = Math.max(perPage, 1);
  const totalPages = Math.max(Math.ceil(total / safePerPage), 1);
  const safePage = Math.min(Math.max(page, 1), totalPages);

  return {
    data,
    total,
    page: safePage,
    perPage: safePerPage,
    totalPages,
    hasNext: safePage < totalPages,
    hasPrevious: safePage > 1,
  };
}

/**
 * Paginação server-side em memória após merge/filtro/ordenação.
 * Usado quando a listagem é união de fontes (ex.: Fluxo de Caixa).
 */
export function paginateArray<T>(
  items: T[],
  page: number,
  perPage: number,
): PaginatedResult<T> {
  const safePerPage = Math.max(perPage, 1);
  const total = items.length;
  const totalPages = Math.max(Math.ceil(total / safePerPage), 1);
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * safePerPage;

  return toPaginatedResult(
    items.slice(start, start + safePerPage),
    total,
    safePage,
    safePerPage,
  );
}
