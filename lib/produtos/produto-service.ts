import type { SupabaseClient } from "@supabase/supabase-js";

import {
  PRODUTOS_DEFAULT_PER_PAGE,
  PRODUTOS_MAX_PER_PAGE,
} from "@/lib/produtos/constants";
import { buildProdutoPayload } from "@/lib/produtos/mappers";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  CreateProdutoInput,
  ListProdutosParams,
  PaginatedResult,
  Produto,
  ProdutoListItem,
  ProdutoSortField,
  ProdutoTipo,
  SortOrder,
  UpdateProdutoInput,
} from "@/types/produtos";

const LIST_SELECT =
  "id, nome, tipo, codigo_interno, sku, categoria, marca, unidade_medida, preco_venda, estoque_atual, ativo, created_at, updated_at";

function resolveSort(
  sort?: ProdutoSortField,
  order?: SortOrder,
): { column: ProdutoSortField; ascending: boolean } {
  const allowed: ProdutoSortField[] = [
    "nome",
    "created_at",
    "preco_venda",
    "estoque_atual",
    "tipo",
    "ativo",
  ];
  const column = allowed.includes(sort ?? "nome") ? (sort ?? "nome") : "nome";
  const ascending = order === "asc" || !order;

  return { column, ascending };
}

function mapUniqueViolation(error: { code?: string; message: string }) {
  if (error.code !== "23505") return error.message;

  if (error.message.includes("produtos_tenant_sku_unique")) {
    return "Já existe um item com este SKU.";
  }
  if (error.message.includes("produtos_tenant_codigo_interno_unique")) {
    return "Já existe um item com este código interno.";
  }
  if (error.message.includes("produtos_tenant_codigo_barras_unique")) {
    return "Já existe um item com este código de barras.";
  }

  return "Já existe um item com estes dados de identificação.";
}

export class ProdutoService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async list(
    params: ListProdutosParams = {},
  ): Promise<PaginatedResult<ProdutoListItem>> {
    const page = Math.max(params.page ?? 1, 1);
    const perPage = Math.min(
      Math.max(params.perPage ?? PRODUTOS_DEFAULT_PER_PAGE, 1),
      PRODUTOS_MAX_PER_PAGE,
    );
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    const search = params.search?.trim();
    const { column, ascending } = resolveSort(params.sort, params.order);

    let query = this.supabase
      .from("produtos")
      .select(LIST_SELECT, { count: "exact" })
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .order(column, { ascending });

    if (search) {
      query = query.or(
        [
          `nome.ilike.%${search}%`,
          `sku.ilike.%${search}%`,
          `codigo_interno.ilike.%${search}%`,
          `codigo_barras.ilike.%${search}%`,
          `categoria.ilike.%${search}%`,
          `marca.ilike.%${search}%`,
          `fornecedor_principal.ilike.%${search}%`,
        ].join(","),
      );
    }

    if (params.tipo && params.tipo !== "all") {
      query = query.eq("tipo", params.tipo as ProdutoTipo);
    }

    if (params.ativo !== undefined && params.ativo !== "all") {
      query = query.eq("ativo", params.ativo);
    }

    if (params.categoria?.trim()) {
      query = query.ilike("categoria", `%${params.categoria.trim()}%`);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    const total = count ?? 0;

    return {
      data: (data ?? []) as ProdutoListItem[],
      total,
      page,
      perPage,
      totalPages: Math.max(Math.ceil(total / perPage), 1),
    };
  }

  async getById(id: string): Promise<Produto | null> {
    const { data, error } = await this.supabase
      .from("produtos")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return (data as Produto | null) ?? null;
  }

  async create(input: CreateProdutoInput): Promise<Produto> {
    const { data, error } = await this.supabase
      .from("produtos")
      .insert({
        tenant_id: this.tenantId,
        ...buildProdutoPayload(input),
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(mapUniqueViolation(error));
    }

    return data as Produto;
  }

  async update(id: string, input: UpdateProdutoInput): Promise<Produto> {
    const { data, error } = await this.supabase
      .from("produtos")
      .update(buildProdutoPayload(input as CreateProdutoInput))
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .single();

    if (error) {
      throw new Error(mapUniqueViolation(error));
    }

    return data as Produto;
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("produtos")
      .update({ deleted_at: new Date().toISOString() })
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null);

    if (error) {
      throw new Error(error.message);
    }
  }
}

export async function createProdutoService(tenantId: string) {
  const supabase = await createClient();
  return new ProdutoService(supabase, tenantId);
}
