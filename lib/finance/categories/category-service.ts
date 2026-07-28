/**
 * Sprint 22.1 — Category repository + service.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../types/database.ts";
import type { EnterpriseContext } from "../../enterprise/types.ts";
import type { FinanceEnterpriseBridge } from "../shared/enterprise-bridge.ts";
import { FINANCE_ERROR_CODES, FinanceError } from "../shared/errors.ts";
import {
  decodeFinanceMeta,
  encodeFinanceMeta,
  mapCategoryKindToDbTipo,
  mapDbTipoToCategoryKind,
  stripFinanceMeta,
} from "../shared/meta.ts";
import { assertArchivePermission, assertFinancePermission } from "../shared/rbac.ts";
import type { Category, CategoryKind, CreateCategoryInput } from "../shared/types.ts";

export type CategoryRepository = {
  list(tenantId: string): Promise<Category[]>;
  create(tenantId: string, input: CreateCategoryInput): Promise<Category>;
  update(
    tenantId: string,
    id: string,
    input: Partial<CreateCategoryInput> & { active?: boolean },
  ): Promise<Category>;
  archive(tenantId: string, id: string): Promise<Category>;
};

function mapRow(row: {
  id: string;
  tenant_id: string;
  nome: string;
  tipo: string;
  cor: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
}): Category {
  const meta = decodeFinanceMeta(row.observacoes);
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.nome,
    kind: mapDbTipoToCategoryKind(row.tipo, meta.kind),
    parentId: meta.parentId ?? null,
    active: row.ativo,
    color: row.cor,
    notes: stripFinanceMeta(row.observacoes),
    createdAt: row.created_at,
  };
}

export function createMemoryCategoryRepository(
  store: Category[] = [],
): CategoryRepository {
  return {
    async list(tenantId) {
      return store.filter((c) => c.tenantId === tenantId && c.active);
    },
    async create(tenantId, input) {
      const row: Category = {
        id: `cat_${Date.now().toString(36)}`,
        tenantId,
        name: input.name,
        kind: input.kind,
        parentId: input.parentId ?? null,
        active: true,
        color: input.color ?? null,
        notes: input.notes ?? null,
        createdAt: new Date().toISOString(),
      };
      store.push(row);
      return row;
    },
    async update(tenantId, id, input) {
      const row = store.find((c) => c.tenantId === tenantId && c.id === id);
      if (!row) throw new Error("Categoria não encontrada.");
      Object.assign(row, {
        name: input.name ?? row.name,
        kind: input.kind ?? row.kind,
        parentId: input.parentId !== undefined ? input.parentId : row.parentId,
        color: input.color !== undefined ? input.color : row.color,
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

export function createSupabaseCategoryRepository(
  client: SupabaseClient<Database>,
): CategoryRepository {
  return {
    async list(tenantId) {
      const { data, error } = await client
        .from("categorias_financeiras")
        .select("*")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("nome");
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapRow);
    },
    async create(tenantId, input) {
      const { data, error } = await client
        .from("categorias_financeiras")
        .insert({
          tenant_id: tenantId,
          nome: input.name,
          tipo: mapCategoryKindToDbTipo(input.kind),
          cor: input.color ?? null,
          observacoes: encodeFinanceMeta(input.notes, {
            kind: input.kind,
            parentId: input.parentId,
          }),
          ativo: true,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return mapRow(data);
    },
    async update(tenantId, id, input) {
      const currentList = await this.list(tenantId);
      const current = currentList.find((c) => c.id === id);
      if (!current) throw new Error("Categoria não encontrada.");
      const kind = (input.kind ?? current.kind) as CategoryKind;
      const { data, error } = await client
        .from("categorias_financeiras")
        .update({
          nome: input.name ?? current.name,
          tipo: mapCategoryKindToDbTipo(kind),
          cor: input.color !== undefined ? input.color : current.color,
          observacoes: encodeFinanceMeta(
            input.notes !== undefined ? input.notes : current.notes,
            {
              kind,
              parentId:
                input.parentId !== undefined ? input.parentId : current.parentId,
            },
          ),
          ativo: input.active ?? current.active,
          deleted_at: input.active === false ? new Date().toISOString() : null,
        })
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

export function createCategoryService(deps: {
  repo: CategoryRepository;
  bridge: FinanceEnterpriseBridge;
}) {
  return {
    async list(context: EnterpriseContext) {
      assertFinancePermission(context.permissions, "financeiro.visualizar");
      return deps.repo.list(context.tenantId);
    },
    async create(context: EnterpriseContext, input: CreateCategoryInput) {
      assertFinancePermission(context.permissions, "financeiro.criar");
      if (!input.name?.trim()) {
        throw new FinanceError("Nome obrigatório.", FINANCE_ERROR_CODES.VALIDATION);
      }
      const row = await deps.repo.create(context.tenantId, input);
      await deps.bridge.recordMutation(context, {
        event: "FINANCE_CATEGORY_CREATED",
        targetType: "finance_category",
        targetId: row.id,
        description: `Categoria criada: ${row.name}`,
        metadata: { kind: row.kind, parentId: row.parentId },
      });
      return row;
    },
    async archive(context: EnterpriseContext, id: string) {
      assertArchivePermission(context.permissions);
      const row = await deps.repo.archive(context.tenantId, id);
      await deps.bridge.recordMutation(context, {
        event: "FINANCE_CATEGORY_ARCHIVED",
        targetType: "finance_category",
        targetId: row.id,
        description: `Categoria arquivada: ${row.name}`,
      });
      return row;
    },
  };
}

export type CategoryService = ReturnType<typeof createCategoryService>;
