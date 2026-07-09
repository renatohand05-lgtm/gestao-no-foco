import type { SupabaseClient } from "@supabase/supabase-js";

import {
  FINANCEIRO_DEFAULT_PER_PAGE,
  FINANCEIRO_MAX_PER_PAGE,
} from "@/lib/financeiro/constants";
import { buildCentroCustoPayload } from "@/lib/financeiro/mappers";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  CentroCusto,
  CentroCustoListItem,
  CentroCustoSortField,
  CreateCentroCustoInput,
  ListCentrosCustoParams,
  PaginatedResult,
  SortOrder,
  UpdateCentroCustoInput,
} from "@/types/financeiro";

const LIST_SELECT =
  "id, codigo, nome, descricao, responsavel, ativo, created_at";

function resolveSort(
  sort?: CentroCustoSortField,
  order?: SortOrder,
): { column: CentroCustoSortField; ascending: boolean } {
  const allowed: CentroCustoSortField[] = [
    "codigo",
    "nome",
    "ativo",
    "created_at",
  ];
  const column = allowed.includes(sort ?? "codigo")
    ? (sort ?? "codigo")
    : "codigo";
  const ascending = order === "asc" || !order;

  return { column, ascending };
}

function mapUniqueViolation(error: { code?: string; message: string }) {
  if (error.code === "23505") {
    return "Já existe um centro de custo com este código.";
  }
  return error.message;
}

export class CentroCustoService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async list(
    params: ListCentrosCustoParams = {},
  ): Promise<PaginatedResult<CentroCustoListItem>> {
    const page = Math.max(params.page ?? 1, 1);
    const perPage = Math.min(
      Math.max(params.perPage ?? FINANCEIRO_DEFAULT_PER_PAGE, 1),
      FINANCEIRO_MAX_PER_PAGE,
    );
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    const search = params.search?.trim();
    const { column, ascending } = resolveSort(params.sort, params.order);

    let query = this.supabase
      .from("centros_custo")
      .select(LIST_SELECT, { count: "exact" })
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .order(column, { ascending });

    if (search) {
      query = query.or(
        [
          `codigo.ilike.%${search}%`,
          `nome.ilike.%${search}%`,
          `responsavel.ilike.%${search}%`,
        ].join(","),
      );
    }

    if (params.ativo !== undefined && params.ativo !== "all") {
      query = query.eq("ativo", params.ativo);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) throw new Error(error.message);

    const total = count ?? 0;

    return {
      data: (data ?? []) as CentroCustoListItem[],
      total,
      page,
      perPage,
      totalPages: Math.max(Math.ceil(total / perPage), 1),
    };
  }

  async getById(id: string): Promise<CentroCusto | null> {
    const { data, error } = await this.supabase
      .from("centros_custo")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);

    return (data as CentroCusto | null) ?? null;
  }

  async create(input: CreateCentroCustoInput): Promise<CentroCusto> {
    const { data, error } = await this.supabase
      .from("centros_custo")
      .insert({
        tenant_id: this.tenantId,
        ...buildCentroCustoPayload(input),
      })
      .select("*")
      .single();

    if (error) throw new Error(mapUniqueViolation(error));

    return data as CentroCusto;
  }

  async update(
    id: string,
    input: UpdateCentroCustoInput,
  ): Promise<CentroCusto> {
    const { data, error } = await this.supabase
      .from("centros_custo")
      .update(buildCentroCustoPayload(input as CreateCentroCustoInput))
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .single();

    if (error) throw new Error(mapUniqueViolation(error));

    return data as CentroCusto;
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("centros_custo")
      .update({ deleted_at: new Date().toISOString() })
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);
  }
}

export async function createCentroCustoService(tenantId: string) {
  const supabase = await createClient();
  return new CentroCustoService(supabase, tenantId);
}
