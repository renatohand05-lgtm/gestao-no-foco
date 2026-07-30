/**
 * Fase 25 — Filtros allow-list server-side (rejeita tenant do client).
 */

import type { SupplyFilter, SupplyFilterInput } from "./types.ts";
import { emptySupplyFilter } from "./snapshot-builder.ts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function optionalUuid(
  value: string | null | undefined,
  field: string,
): string | null {
  if (value == null || value === "") return null;
  if (!UUID_RE.test(value)) {
    throw new Error(`Filtro ${field} rejeitado — UUID inválido.`);
  }
  return value;
}

function optionalDate(value: string | null | undefined, field: string): string | null {
  if (value == null || value === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) {
    throw new Error(`Filtro ${field} rejeitado — data inválida.`);
  }
  return value.slice(0, 10);
}

/**
 * Sanitiza filtros. `authorizedIds` quando fornecido restringe empresa/filial/depósito.
 */
export function sanitizeSupplyFilter(
  input: SupplyFilterInput | null | undefined,
  authorizedIds?: {
    empresaIds?: readonly string[];
    filialIds?: readonly string[];
    depositoIds?: readonly string[];
    almoxarifadoIds?: readonly string[];
    fornecedorIds?: readonly string[];
  },
): SupplyFilter {
  if (input && ("tenantId" in input || "tenant_id" in input)) {
    if (input.tenantId != null || input.tenant_id != null) {
      throw new Error(
        "tenantId do client é rejeitado — isolamento server-side.",
      );
    }
  }

  const base = emptySupplyFilter();
  if (!input) return base;

  const empresaId = optionalUuid(input.empresaId, "empresaId");
  const filialId = optionalUuid(input.filialId, "filialId");
  const depositoId = optionalUuid(input.depositoId, "depositoId");
  const almoxarifadoId = optionalUuid(input.almoxarifadoId, "almoxarifadoId");
  const fornecedorId = optionalUuid(input.fornecedorId, "fornecedorId");
  const responsavelId = optionalUuid(input.responsavelId, "responsavelId");

  const allow = (id: string | null, list?: readonly string[], label?: string) => {
    if (id == null) return null;
    if (list && list.length > 0 && !list.includes(id)) {
      throw new Error(`Filtro ${label} bloqueado — ID fora da allow-list.`);
    }
    return id;
  };

  return {
    periodoDe: optionalDate(input.periodoDe, "periodoDe"),
    periodoAte: optionalDate(input.periodoAte, "periodoAte"),
    empresaId: allow(empresaId, authorizedIds?.empresaIds, "empresaId"),
    filialId: allow(filialId, authorizedIds?.filialIds, "filialId"),
    depositoId: allow(depositoId, authorizedIds?.depositoIds, "depositoId"),
    almoxarifadoId: allow(
      almoxarifadoId,
      authorizedIds?.almoxarifadoIds,
      "almoxarifadoId",
    ),
    fornecedorId: allow(
      fornecedorId,
      authorizedIds?.fornecedorIds,
      "fornecedorId",
    ),
    categoria:
      input.categoria && input.categoria.trim()
        ? input.categoria.trim().slice(0, 120)
        : null,
    status:
      input.status && input.status.trim()
        ? input.status.trim().slice(0, 60)
        : null,
    responsavelId,
  };
}

export function assertSupplyTenantMatch(
  rowTenantId: string,
  contextTenantId: string,
): void {
  if (rowTenantId !== contextTenantId) {
    throw new Error("Violação de tenant isolation.");
  }
}
