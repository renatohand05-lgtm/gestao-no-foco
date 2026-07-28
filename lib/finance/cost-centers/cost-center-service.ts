/**
 * Sprint 22.1 — Cost Center repository + service.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../types/database.ts";
import type { EnterpriseContext } from "../../enterprise/types.ts";
import type { FinanceEnterpriseBridge } from "../shared/enterprise-bridge.ts";
import { FINANCE_ERROR_CODES, FinanceError } from "../shared/errors.ts";
import { assertArchivePermission, assertFinancePermission } from "../shared/rbac.ts";
import type { CostCenter, CreateCostCenterInput } from "../shared/types.ts";

export type CostCenterRepository = {
  list(tenantId: string): Promise<CostCenter[]>;
  create(tenantId: string, input: CreateCostCenterInput): Promise<CostCenter>;
  update(
    tenantId: string,
    id: string,
    input: Partial<CreateCostCenterInput> & { active?: boolean },
  ): Promise<CostCenter>;
  archive(tenantId: string, id: string): Promise<CostCenter>;
};

function mapRow(row: {
  id: string;
  tenant_id: string;
  nome: string;
  codigo: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
}): CostCenter {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.nome,
    code: row.codigo,
    active: row.ativo,
    notes: row.observacoes,
    createdAt: row.created_at,
  };
}

export function createMemoryCostCenterRepository(
  store: CostCenter[] = [],
): CostCenterRepository {
  return {
    async list(tenantId) {
      return store.filter((c) => c.tenantId === tenantId && c.active);
    },
    async create(tenantId, input) {
      const row: CostCenter = {
        id: `cc_${Date.now().toString(36)}`,
        tenantId,
        name: input.name,
        code: input.code ?? null,
        active: true,
        notes: input.notes ?? null,
        createdAt: new Date().toISOString(),
      };
      store.push(row);
      return row;
    },
    async update(tenantId, id, input) {
      const row = store.find((c) => c.tenantId === tenantId && c.id === id);
      if (!row) throw new Error("Centro de custo não encontrado.");
      Object.assign(row, {
        name: input.name ?? row.name,
        code: input.code !== undefined ? input.code : row.code,
        notes: input.notes !== undefined ? input.notes : row.notes,
        active: input.active ?? row.active,
      });
      return row;
    },
    async archive(tenantId, id) {
      return this.update(tenantId, id, { active: false });
    },
  };
}

export function createSupabaseCostCenterRepository(
  client: SupabaseClient<Database>,
): CostCenterRepository {
  return {
    async list(tenantId) {
      const { data, error } = await client
        .from("centros_custo")
        .select("*")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("nome");
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapRow);
    },
    async create(tenantId, input) {
      const codigo =
        input.code?.trim() ||
        `CC-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      const { data, error } = await client
        .from("centros_custo")
        .insert({
          tenant_id: tenantId,
          nome: input.name,
          codigo,
          observacoes: input.notes ?? null,
          ativo: true,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return mapRow(data);
    },
    async update(tenantId, id, input) {
      const patch: {
        nome?: string;
        codigo?: string;
        observacoes?: string | null;
        ativo?: boolean;
        deleted_at?: string | null;
      } = {};
      if (input.name !== undefined) patch.nome = input.name;
      if (input.code !== undefined && input.code !== null) patch.codigo = input.code;
      if (input.notes !== undefined) patch.observacoes = input.notes;
      if (input.active !== undefined) {
        patch.ativo = input.active;
        if (!input.active) patch.deleted_at = new Date().toISOString();
      }
      const { data, error } = await client
        .from("centros_custo")
        .update(patch)
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return mapRow(data);
    },
    async archive(tenantId, id) {
      return this.update(tenantId, id, { active: false });
    },
  };
}

export function createCostCenterService(deps: {
  repo: CostCenterRepository;
  bridge: FinanceEnterpriseBridge;
}) {
  return {
    async list(context: EnterpriseContext) {
      assertFinancePermission(context.permissions, "financeiro.visualizar");
      return deps.repo.list(context.tenantId);
    },
    async create(context: EnterpriseContext, input: CreateCostCenterInput) {
      assertFinancePermission(context.permissions, "financeiro.criar");
      if (!input.name?.trim()) {
        throw new FinanceError("Nome obrigatório.", FINANCE_ERROR_CODES.VALIDATION);
      }
      const row = await deps.repo.create(context.tenantId, input);
      await deps.bridge.recordMutation(context, {
        event: "COST_CENTER_CREATED",
        targetType: "cost_center",
        targetId: row.id,
        description: `Centro de custo criado: ${row.name}`,
      });
      return row;
    },
    async update(
      context: EnterpriseContext,
      id: string,
      input: Partial<CreateCostCenterInput>,
    ) {
      assertFinancePermission(context.permissions, "financeiro.editar");
      const row = await deps.repo.update(context.tenantId, id, input);
      await deps.bridge.recordMutation(context, {
        event: "COST_CENTER_UPDATED",
        targetType: "cost_center",
        targetId: row.id,
        description: `Centro de custo atualizado: ${row.name}`,
      });
      return row;
    },
    async archive(context: EnterpriseContext, id: string) {
      assertArchivePermission(context.permissions);
      const row = await deps.repo.archive(context.tenantId, id);
      await deps.bridge.recordMutation(context, {
        event: "COST_CENTER_ARCHIVED",
        targetType: "cost_center",
        targetId: row.id,
        description: `Centro de custo arquivado: ${row.name}`,
      });
      return row;
    },
  };
}

export type CostCenterService = ReturnType<typeof createCostCenterService>;
