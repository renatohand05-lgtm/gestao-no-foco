import type { SupabaseClient } from "@supabase/supabase-js";

import {
  FINANCEIRO_DEFAULT_PER_PAGE,
  FINANCEIRO_MAX_PER_PAGE,
} from "@/lib/financeiro/constants";
import { buildContaBancariaPayload } from "@/lib/financeiro/mappers";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  ContaBancaria,
  ContaBancariaListItem,
  ContaBancariaSortField,
  ContaBancariaTipo,
  CreateContaBancariaInput,
  ListContasBancariasParams,
  PaginatedResult,
  SortOrder,
  UpdateContaBancariaInput,
} from "@/types/financeiro";

const LIST_SELECT =
  "id, nome, tipo, banco, agencia, conta, saldo_inicial, saldo_atual, ativo, created_at";

function resolveSort(
  sort?: ContaBancariaSortField,
  order?: SortOrder,
): { column: ContaBancariaSortField; ascending: boolean } {
  const allowed: ContaBancariaSortField[] = [
    "nome",
    "tipo",
    "banco",
    "ativo",
    "created_at",
  ];
  const column = allowed.includes(sort ?? "nome") ? (sort ?? "nome") : "nome";
  const ascending = order === "asc" || !order;

  return { column, ascending };
}

function mapUniqueViolation(error: { code?: string; message: string }) {
  if (error.code === "23505") {
    return "Já existe uma conta bancária com este nome.";
  }
  return error.message;
}

export class ContaBancariaService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async list(
    params: ListContasBancariasParams = {},
  ): Promise<PaginatedResult<ContaBancariaListItem>> {
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
      .from("contas_bancarias")
      .select(LIST_SELECT, { count: "exact" })
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .order(column, { ascending });

    if (search) {
      query = query.or(
        [
          `nome.ilike.%${search}%`,
          `banco.ilike.%${search}%`,
          `agencia.ilike.%${search}%`,
          `conta.ilike.%${search}%`,
          `titular.ilike.%${search}%`,
        ].join(","),
      );
    }

    if (params.tipo && params.tipo !== "all") {
      query = query.eq("tipo", params.tipo as ContaBancariaTipo);
    }

    if (params.ativo !== undefined && params.ativo !== "all") {
      query = query.eq("ativo", params.ativo);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) throw new Error(error.message);

    const total = count ?? 0;

    return {
      data: (data ?? []) as ContaBancariaListItem[],
      total,
      page,
      perPage,
      totalPages: Math.max(Math.ceil(total / perPage), 1),
    };
  }

  async getById(id: string): Promise<ContaBancaria | null> {
    const { data, error } = await this.supabase
      .from("contas_bancarias")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);

    return (data as ContaBancaria | null) ?? null;
  }

  async create(input: CreateContaBancariaInput): Promise<ContaBancaria> {
    const { data, error } = await this.supabase
      .from("contas_bancarias")
      .insert({
        tenant_id: this.tenantId,
        ...buildContaBancariaPayload(input),
        saldo_atual: input.saldo_inicial ?? 0,
      })
      .select("*")
      .single();

    if (error) throw new Error(mapUniqueViolation(error));

    return data as ContaBancaria;
  }

  async update(
    id: string,
    input: UpdateContaBancariaInput,
  ): Promise<ContaBancaria> {
    const { data, error } = await this.supabase
      .from("contas_bancarias")
      .update(buildContaBancariaPayload(input as CreateContaBancariaInput))
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .single();

    if (error) throw new Error(mapUniqueViolation(error));

    return data as ContaBancaria;
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("contas_bancarias")
      .update({ deleted_at: new Date().toISOString() })
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);
  }
}

export async function createContaBancariaService(tenantId: string) {
  const supabase = await createClient();
  return new ContaBancariaService(supabase, tenantId);
}
