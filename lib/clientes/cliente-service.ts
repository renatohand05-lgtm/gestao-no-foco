import type { SupabaseClient } from "@supabase/supabase-js";

import {
  CLIENTES_DEFAULT_PER_PAGE,
  CLIENTES_MAX_PER_PAGE,
} from "@/lib/clientes/constants";
import { buildClientePayload } from "@/lib/clientes/mappers";
import { onlyDigits } from "@/lib/clientes/masks";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  Cliente,
  ClienteListItem,
  ClienteSortField,
  CreateClienteInput,
  ListClientesParams,
  PaginatedResult,
  SortOrder,
  UpdateClienteInput,
} from "@/types/clientes";

const LIST_SELECT =
  "id, nome, email, telefone, whatsapp, documento, tipo_pessoa, cidade, estado, ativo, created_at, updated_at";

function resolveSort(
  sort?: ClienteSortField,
  order?: SortOrder,
): { column: ClienteSortField; ascending: boolean } {
  const allowed: ClienteSortField[] = [
    "nome",
    "created_at",
    "documento",
    "cidade",
    "ativo",
  ];
  const column = allowed.includes(sort ?? "nome") ? (sort ?? "nome") : "nome";
  const ascending = order === "asc" || !order;

  return { column, ascending };
}

export class ClienteService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async list(
    params: ListClientesParams = {},
  ): Promise<PaginatedResult<ClienteListItem>> {
    const page = Math.max(params.page ?? 1, 1);
    const perPage = Math.min(
      Math.max(params.perPage ?? CLIENTES_DEFAULT_PER_PAGE, 1),
      CLIENTES_MAX_PER_PAGE,
    );
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    const search = params.search?.trim();
    const { column, ascending } = resolveSort(params.sort, params.order);

    let query = this.supabase
      .from("clientes")
      .select(LIST_SELECT, { count: "exact" })
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .order(column, { ascending });

    if (search) {
      const digits = onlyDigits(search);
      const filters = [
        `nome.ilike.%${search}%`,
        `email.ilike.%${search}%`,
        `telefone.ilike.%${search}%`,
        `whatsapp.ilike.%${search}%`,
        `cidade.ilike.%${search}%`,
      ];

      if (digits) {
        filters.push(`documento.ilike.%${digits}%`, `cep.ilike.%${digits}%`);
      }

      query = query.or(filters.join(","));
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    const total = count ?? 0;

    return {
      data: (data ?? []) as ClienteListItem[],
      total,
      page,
      perPage,
      totalPages: Math.max(Math.ceil(total / perPage), 1),
    };
  }

  async getById(id: string): Promise<Cliente | null> {
    const { data, error } = await this.supabase
      .from("clientes")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return (data as Cliente | null) ?? null;
  }

  async create(input: CreateClienteInput): Promise<Cliente> {
    const { data, error } = await this.supabase
      .from("clientes")
      .insert({
        tenant_id: this.tenantId,
        ...buildClientePayload(input),
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("Já existe um cliente com este CPF/CNPJ.");
      }
      throw new Error(error.message);
    }

    return data as Cliente;
  }

  async update(id: string, input: UpdateClienteInput): Promise<Cliente> {
    const { data, error } = await this.supabase
      .from("clientes")
      .update(buildClientePayload(input as CreateClienteInput))
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("Já existe um cliente com este CPF/CNPJ.");
      }
      throw new Error(error.message);
    }

    return data as Cliente;
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("clientes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null);

    if (error) {
      throw new Error(error.message);
    }
  }
}

export async function createClienteService(tenantId: string) {
  const supabase = await createClient();
  return new ClienteService(supabase, tenantId);
}
