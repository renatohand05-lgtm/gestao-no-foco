/**
 * Fonte canônica da meta mensal vigente (Sprint 27.8.3).
 * Dashboard, Analytics e ECC devem usar a mesma resolução.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { toCompetenciaMonthStart } from "@/lib/metas/projection";
import {
  competenciaMonthEnd,
  metaOverlapsPeriod,
  pickMetaByScopePrecedence,
  type MetaCandidateRow,
  type MetaMensalOrigem,
  type MetaScopeFilter,
} from "@/lib/metas/meta-scope";
import { currentCompetenciaInTimezone } from "@/lib/metas/meta-timezone";
import type { Database } from "@/types/database";

export {
  calcMetaAtingimento,
  classifyMetaDashboardStatus,
  type MetaDashboardStatus,
} from "@/lib/metas/meta-dashboard-math";

export {
  competenciaMonthEnd,
  metaOverlapsPeriod,
  pickMetaByScopePrecedence,
  type MetaCandidateRow,
  type MetaMensalOrigem,
  type MetaScopeFilter,
} from "@/lib/metas/meta-scope";

export { currentCompetenciaInTimezone } from "@/lib/metas/meta-timezone";

/** Tag de cache para invalidação após CRUD de metas. */
export const METAS_VENDAS_CACHE_TAG = "metas-vendas";

export type MetaMensalStatus =
  | "cadastrada"
  | "nao_cadastrada"
  | "fora_periodo"
  | "sem_permissao"
  | "indisponivel";

export type MetaMensalResolved = {
  valor: number | null;
  status: MetaMensalStatus;
  competencia: string;
  centro_custo_id: string | null;
  company_id: string | null;
  branch_id: string | null;
  origem: MetaMensalOrigem;
  updated_at: string | null;
  id: string | null;
};

/**
 * Resolve meta mensal vigente para o Dashboard / Analytics / ECC.
 */
export async function resolveMetaMensalVigente(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  competenciaInput: string,
  centroCustoId?: string | null,
  scopeExtra?: Omit<MetaScopeFilter, "centroCustoId">,
): Promise<MetaMensalResolved> {
  let competencia: string;
  try {
    competencia = toCompetenciaMonthStart(competenciaInput);
  } catch {
    return empty(
      competenciaInput,
      {
        centroCustoId: centroCustoId ?? null,
        ...scopeExtra,
      },
      "fora_periodo",
    );
  }

  const periodStart = competencia;
  const periodEnd = competenciaMonthEnd(competencia);

  const { data, error } = await supabase
    .from("metas_vendas_mensais")
    .select(
      "id, valor_meta, centro_custo_id, competencia, updated_at, deleted_at",
    )
    .eq("tenant_id", tenantId)
    .eq("competencia", competencia)
    .is("deleted_at", null);

  if (error) {
    return empty(
      competencia,
      {
        centroCustoId: centroCustoId ?? null,
        ...scopeExtra,
      },
      "indisponivel",
    );
  }

  const candidates = ((data ?? []) as MetaCandidateRow[]).filter((row) =>
    metaOverlapsPeriod(row.competencia, periodStart, periodEnd),
  );

  const picked = pickMetaByScopePrecedence(candidates, {
    centroCustoId,
    companyId: scopeExtra?.companyId,
    branchId: scopeExtra?.branchId,
  });

  if (!picked) {
    return empty(competencia, {
      centroCustoId: centroCustoId ?? null,
      ...scopeExtra,
    });
  }

  return toResolved(picked.row, competencia, picked.origem);
}

function toResolved(
  row: MetaCandidateRow,
  competencia: string,
  origem: MetaMensalOrigem,
): MetaMensalResolved {
  const valor = Number(row.valor_meta);
  if (!Number.isFinite(valor) || valor <= 0) {
    return {
      valor: null,
      status: "indisponivel",
      competencia,
      centro_custo_id: row.centro_custo_id,
      company_id: row.company_id ?? null,
      branch_id: row.branch_id ?? null,
      origem,
      updated_at: row.updated_at ?? null,
      id: row.id ?? null,
    };
  }
  return {
    valor,
    status: "cadastrada",
    competencia,
    centro_custo_id: row.centro_custo_id,
    company_id: row.company_id ?? null,
    branch_id: row.branch_id ?? null,
    origem,
    updated_at: row.updated_at ?? null,
    id: row.id ?? null,
  };
}

function empty(
  competencia: string,
  scope: MetaScopeFilter,
  status: MetaMensalStatus = "nao_cadastrada",
): MetaMensalResolved {
  return {
    valor: null,
    status,
    competencia,
    centro_custo_id: scope.centroCustoId ?? null,
    company_id: scope.companyId ?? null,
    branch_id: scope.branchId ?? null,
    origem: "nenhuma",
    updated_at: null,
    id: null,
  };
}
