import "server-only";

/**
 * Sprint 31.9 — Busca global mobile.
 * Reutiliza MasterDataSearchService + listagens Ops com q= — sem novas regras.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { MasterDataSearchService } from "@/lib/master-data/master-data-search";
import type { MasterEntityType } from "@/lib/master-data/master-data-types";
import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

export type MobileSearchHitType =
  | MasterEntityType
  | "veiculo"
  | "oportunidade"
  | "notificacao"
  | "membro";

export type MobileSearchHit = {
  id: string;
  type: MobileSearchHitType;
  title: string;
  subtitle: string | null;
  status: string | null;
  route: string;
  opensWeb: boolean;
  permission: string | null;
  updatedAt: string | null;
};

const MIN_Q = 2;
const MAX_Q = 80;
const DEFAULT_LIMIT = 30;
const HARD_LIMIT = 50;

/** Remove caracteres que quebram filtros PostgREST `.or()` / ILIKE. */
function sanitizeIlikeTerm(raw: string): string {
  return raw.replace(/[%_,.()"'\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_Q);
}

function hasPerm(permissions: readonly string[], key: string): boolean {
  return permissions.includes("*") || permissions.includes(key);
}

function resolveClient(
  userClient: SupabaseClient<Database>,
): SupabaseClient<Database> {
  if (isAdminClientAvailable()) return createAdminClient();
  return userClient;
}

function canSeeType(
  type: MobileSearchHitType,
  permissions: readonly string[],
): boolean {
  switch (type) {
    case "cliente":
      return (
        hasPerm(permissions, "clientes.visualizar") ||
        hasPerm(permissions, "crm.visualizar") ||
        hasPerm(permissions, "os.visualizar")
      );
    case "veiculo":
    case "ordem_servico":
      return (
        hasPerm(permissions, "os.visualizar") ||
        hasPerm(permissions, "centro_operacoes.visualizar")
      );
    case "produto":
    case "servico":
      return (
        hasPerm(permissions, "produtos.visualizar") ||
        hasPerm(permissions, "estoque.visualizar")
      );
    case "fornecedor":
      return (
        hasPerm(permissions, "fornecedores.visualizar") ||
        hasPerm(permissions, "compras.visualizar")
      );
    case "conta_pagar":
    case "conta_receber":
    case "categoria":
    case "plano":
    case "centro_custo":
    case "dre_linha":
    case "conta_bancaria":
    case "forma_pagamento":
    case "venda":
      return (
        hasPerm(permissions, "financeiro.visualizar") ||
        hasPerm(permissions, "ver_saldos") ||
        hasPerm(permissions, "ver_dre")
      );
    case "oportunidade":
      return (
        hasPerm(permissions, "crm.visualizar") ||
        hasPerm(permissions, "crm.pipeline.visualizar")
      );
    case "membro":
      return hasPerm(permissions, "usuarios.visualizar");
    case "notificacao":
      return (
        hasPerm(permissions, "centro_operacoes.ver_alertas") ||
        hasPerm(permissions, "centro_operacoes.visualizar")
      );
    default:
      return false;
  }
}

function mapMobileRoute(
  type: MobileSearchHitType,
  id: string,
  webHref: string,
): { route: string; opensWeb: boolean } {
  switch (type) {
    case "cliente":
      return { route: `/operacao/clientes/${id}`, opensWeb: false };
    case "veiculo":
      return { route: `/operacao/veiculos/${id}`, opensWeb: false };
    case "ordem_servico":
      return { route: `/operacao/ordens/${id}`, opensWeb: false };
    case "produto":
    case "servico":
      return { route: `/estoque/produto/${id}`, opensWeb: false };
    case "fornecedor":
      return { route: `/estoque/fornecedores`, opensWeb: false };
    case "conta_pagar":
      return { route: `/financeiro/detalhe/${id}`, opensWeb: false };
    case "conta_receber":
      return { route: `/financeiro/detalhe/${id}`, opensWeb: false };
    default:
      return { route: webHref, opensWeb: true };
  }
}

async function soft<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export async function composeMobileGlobalSearch(input: {
  userClient: SupabaseClient<Database>;
  tenantId: string;
  tenantSlug: string;
  permissions: readonly string[];
  q: string;
  types?: string[] | null;
  limit?: number;
  cursor?: string | null;
}): Promise<{
  q: string;
  generatedAt: string;
  items: MobileSearchHit[];
  groups: Record<string, number>;
  nextCursor: string | null;
}> {
  const q = sanitizeIlikeTerm(input.q);
  if (q.length < MIN_Q) {
    return {
      q,
      generatedAt: new Date().toISOString(),
      items: [],
      groups: {},
      nextCursor: null,
    };
  }

  const limit = Math.min(
    Math.max(1, input.limit ?? DEFAULT_LIMIT),
    HARD_LIMIT,
  );
  const offset = Math.max(0, Number.parseInt(input.cursor ?? "0", 10) || 0);
  const typeFilter = input.types?.length
    ? new Set(input.types.map((t) => t.toLowerCase()))
    : null;

  const client = resolveClient(input.userClient);
  const master = new MasterDataSearchService(
    client,
    input.tenantId,
    input.tenantSlug,
  );

  const [masterHits, osHits, vehicleHits] = await Promise.all([
    soft(() => master.search(q)),
    soft(async () => {
      if (!canSeeType("ordem_servico", input.permissions)) return [];
      const { data } = await client
        .from("ordens_servico")
        .select("id, numero, status, updated_at")
        .eq("tenant_id", input.tenantId)
        .is("deleted_at", null)
        .or(`numero::text.ilike.%${q}%,status.ilike.%${q}%`)
        .limit(5);
      return data ?? [];
    }),
    soft(async () => {
      if (!canSeeType("veiculo", input.permissions)) return [];
      const { data } = await client
        .from("veiculos")
        .select("id, placa, modelo, marca, updated_at")
        .eq("tenant_id", input.tenantId)
        .is("deleted_at", null)
        .or(`placa.ilike.%${q}%,modelo.ilike.%${q}%,marca.ilike.%${q}%`)
        .limit(5);
      return data ?? [];
    }),
  ]);

  const items: MobileSearchHit[] = [];

  for (const hit of masterHits ?? []) {
    const type = hit.type as MobileSearchHitType;
    if (typeFilter && !typeFilter.has(type)) continue;
    if (!canSeeType(type, input.permissions)) continue;
    const mapped = mapMobileRoute(type, hit.id, hit.href);
    items.push({
      id: hit.id,
      type,
      title: hit.label,
      subtitle: hit.subtitle ?? null,
      status: null,
      route: mapped.route,
      opensWeb: mapped.opensWeb,
      permission: null,
      updatedAt: null,
    });
  }

  for (const row of osHits ?? []) {
    if (typeFilter && !typeFilter.has("ordem_servico")) continue;
    const r = row as {
      id: string;
      numero: number | string;
      status: string;
      updated_at?: string;
    };
    items.push({
      id: r.id,
      type: "ordem_servico",
      title: `OS ${r.numero}`,
      subtitle: r.status,
      status: r.status,
      route: `/operacao/ordens/${r.id}`,
      opensWeb: false,
      permission: "os.visualizar",
      updatedAt: r.updated_at ?? null,
    });
  }

  for (const row of vehicleHits ?? []) {
    if (typeFilter && !typeFilter.has("veiculo")) continue;
    const r = row as {
      id: string;
      placa: string;
      modelo: string | null;
      marca: string | null;
      updated_at?: string;
    };
    items.push({
      id: r.id,
      type: "veiculo",
      title: r.placa,
      subtitle: [r.marca, r.modelo].filter(Boolean).join(" ") || null,
      status: null,
      route: `/operacao/veiculos/${r.id}`,
      opensWeb: false,
      permission: "os.visualizar",
      updatedAt: r.updated_at ?? null,
    });
  }

  const page = items.slice(offset, offset + limit);
  const nextCursor =
    offset + limit < items.length ? String(offset + limit) : null;
  const groups: Record<string, number> = {};
  for (const it of page) {
    groups[it.type] = (groups[it.type] ?? 0) + 1;
  }

  return {
    q,
    generatedAt: new Date().toISOString(),
    items: page,
    groups,
    nextCursor,
  };
}

export const MOBILE_SEARCH_MIN_Q = MIN_Q;
export const MOBILE_SEARCH_MAX_LIMIT = HARD_LIMIT;
