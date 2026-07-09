import type { SupabaseClient } from "@supabase/supabase-js";

import {
  FINANCEIRO_DEFAULT_PER_PAGE,
  FINANCEIRO_MAX_PER_PAGE,
} from "@/lib/financeiro/constants";
import { buildFormaPagamentoPayload } from "@/lib/financeiro/mappers";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  CreateFormaPagamentoInput,
  FormaPagamento,
  FormaPagamentoListItem,
  FormaPagamentoSortField,
  FormaPagamentoTipo,
  ListFormasPagamentoParams,
  PaginatedResult,
  SortOrder,
  UpdateFormaPagamentoInput,
} from "@/types/financeiro";

const LIST_SELECT =
  "id, nome, tipo, gera_financeiro, dias_compensacao, taxa_percent, ativo, created_at";

function resolveSort(
  sort?: FormaPagamentoSortField,
  order?: SortOrder,
): { column: FormaPagamentoSortField; ascending: boolean } {
  const allowed: FormaPagamentoSortField[] = [
    "nome",
    "tipo",
    "ativo",
    "created_at",
  ];
  const column = allowed.includes(sort ?? "nome") ? (sort ?? "nome") : "nome";
  const ascending = order === "asc" || !order;

  return { column, ascending };
}

function mapUniqueViolation(error: { code?: string; message: string }) {
  if (error.code === "23505") {
    return "Já existe uma forma de pagamento com este nome.";
  }
  return error.message;
}

export class FormaPagamentoService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async list(
    params: ListFormasPagamentoParams = {},
  ): Promise<PaginatedResult<FormaPagamentoListItem>> {
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
      .from("formas_pagamento")
      .select(LIST_SELECT, { count: "exact" })
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .order(column, { ascending });

    if (search) {
      query = query.or(`nome.ilike.%${search}%`);
    }

    if (params.tipo && params.tipo !== "all") {
      query = query.eq("tipo", params.tipo as FormaPagamentoTipo);
    }

    if (params.ativo !== undefined && params.ativo !== "all") {
      query = query.eq("ativo", params.ativo);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) throw new Error(error.message);

    const total = count ?? 0;

    return {
      data: (data ?? []) as FormaPagamentoListItem[],
      total,
      page,
      perPage,
      totalPages: Math.max(Math.ceil(total / perPage), 1),
    };
  }

  async getById(id: string): Promise<FormaPagamento | null> {
    const { data, error } = await this.supabase
      .from("formas_pagamento")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);

    return (data as FormaPagamento | null) ?? null;
  }

  async create(input: CreateFormaPagamentoInput): Promise<FormaPagamento> {
    const { data, error } = await this.supabase
      .from("formas_pagamento")
      .insert({
        tenant_id: this.tenantId,
        ...buildFormaPagamentoPayload(input),
      })
      .select("*")
      .single();

    if (error) throw new Error(mapUniqueViolation(error));

    return data as FormaPagamento;
  }

  async update(
    id: string,
    input: UpdateFormaPagamentoInput,
  ): Promise<FormaPagamento> {
    const { data, error } = await this.supabase
      .from("formas_pagamento")
      .update(buildFormaPagamentoPayload(input as CreateFormaPagamentoInput))
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .single();

    if (error) throw new Error(mapUniqueViolation(error));

    return data as FormaPagamento;
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("formas_pagamento")
      .update({ deleted_at: new Date().toISOString() })
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);
  }
}

export async function createFormaPagamentoService(tenantId: string) {
  const supabase = await createClient();
  return new FormaPagamentoService(supabase, tenantId);
}
