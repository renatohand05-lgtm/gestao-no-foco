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
  "id, nome, tipo, codigo_interno, sku, categoria, marca, unidade_medida, preco_venda, estoque_atual, ativo, created_at, updated_at, custo, preco_sugerido, tempo_estimado_minutos, unidade_cobranca";

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
    "custo",
    "preco_sugerido",
    "categoria",
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

    if (params.custoZerado) {
      query = query.or("custo.is.null,custo.eq.0");
    }
    if (params.precoZerado) {
      query = query.or("preco_venda.is.null,preco_venda.eq.0");
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
    const payload = buildProdutoPayload(input);
    const { data, error } = await this.supabase
      .from("produtos")
      .insert({
        tenant_id: this.tenantId,
        ...payload,
      })
      .select("*")
      .single();

    if (error) {
      const msg = error.message.toLowerCase();
      // Antes da migration 20260813: retry só com campos legados
      if (msg.includes("column") || msg.includes("schema cache")) {
        const legacy = {
          nome: payload.nome,
          tipo: payload.tipo,
          codigo_interno: payload.codigo_interno,
          sku: payload.sku,
          codigo_barras: payload.codigo_barras,
          categoria: payload.categoria,
          subcategoria: payload.subcategoria,
          marca: payload.marca,
          unidade_medida: payload.unidade_medida,
          custo: payload.custo,
          preco_venda: payload.preco_venda,
          margem_percent: payload.margem_percent,
          estoque_atual: payload.estoque_atual,
          estoque_minimo: payload.estoque_minimo,
          estoque_maximo: payload.estoque_maximo,
          localizacao: payload.localizacao,
          fornecedor_principal: payload.fornecedor_principal,
          observacoes: payload.observacoes,
          ativo: payload.ativo,
        };
        const retry = await this.supabase
          .from("produtos")
          .insert({ tenant_id: this.tenantId, ...legacy })
          .select("*")
          .single();
        if (retry.error) throw new Error(mapUniqueViolation(retry.error));
        return retry.data as Produto;
      }
      throw new Error(mapUniqueViolation(error));
    }

    return data as Produto;
  }

  async listNamesForDedup(): Promise<{ nome: string }[]> {
    const rows: { nome: string }[] = [];
    const pageSize = 1000;
    let from = 0;
    for (;;) {
      const { data, error } = await this.supabase
        .from("produtos")
        .select("nome")
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      if (!data?.length) break;
      rows.push(...(data as { nome: string }[]));
      if (data.length < pageSize) break;
      from += pageSize;
    }
    return rows;
  }

  async createMany(inputs: CreateProdutoInput[]): Promise<Produto[]> {
    if (inputs.length === 0) return [];
    const payloads = inputs.map((input) => ({
      tenant_id: this.tenantId,
      ...buildProdutoPayload(input),
    }));
    const { data, error } = await this.supabase
      .from("produtos")
      .insert(payloads)
      .select("*");
    if (error) throw new Error(mapUniqueViolation(error));
    return (data as Produto[]) ?? [];
  }

  async update(id: string, input: UpdateProdutoInput): Promise<Produto> {
    const payload = buildProdutoPayload(input as CreateProdutoInput);
    const { data, error } = await this.supabase
      .from("produtos")
      .update(payload)
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .single();

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("column") || msg.includes("schema cache")) {
        const legacy = {
          nome: payload.nome,
          tipo: payload.tipo,
          codigo_interno: payload.codigo_interno,
          sku: payload.sku,
          codigo_barras: payload.codigo_barras,
          categoria: payload.categoria,
          subcategoria: payload.subcategoria,
          marca: payload.marca,
          unidade_medida: payload.unidade_medida,
          custo: payload.custo,
          preco_venda: payload.preco_venda,
          margem_percent: payload.margem_percent,
          estoque_atual: payload.estoque_atual,
          estoque_minimo: payload.estoque_minimo,
          estoque_maximo: payload.estoque_maximo,
          localizacao: payload.localizacao,
          fornecedor_principal: payload.fornecedor_principal,
          observacoes: payload.observacoes,
          ativo: payload.ativo,
        };
        const retry = await this.supabase
          .from("produtos")
          .update(legacy)
          .eq("tenant_id", this.tenantId)
          .eq("id", id)
          .is("deleted_at", null)
          .select("*")
          .single();
        if (retry.error) throw new Error(mapUniqueViolation(retry.error));
        return retry.data as Produto;
      }
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
