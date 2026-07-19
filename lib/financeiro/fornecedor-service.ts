import type { SupabaseClient } from "@supabase/supabase-js";

import {
  masterCacheGet,
  masterCacheInvalidate,
  masterCacheSet,
  MASTER_CACHE_BUCKETS,
} from "@/lib/master-data/master-data-cache";
import { findFornecedorDuplicates } from "@/lib/master-data/master-data-deduplication";
import { onlyDigits, validateDocumento } from "@/lib/master-data/master-data-validation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  CreateFornecedorInput,
  Fornecedor,
  FornecedorDetail,
  FornecedorListItem,
  FornecedorSortField,
  ListFornecedoresParams,
  PaginatedResult,
  SortOrder,
  UpdateFornecedorInput,
} from "@/types/fornecedores";

const LIST_SELECT =
  "id, nome, nome_fantasia, documento, email, telefone, cidade, estado, ativo, recorrente, created_at";

const DETAIL_SELECT = `
  *,
  categoria_financeira:categorias_financeiras ( id, nome, dre_linha, dre_detalhe ),
  plano_conta:plano_contas ( id, codigo, nome, dre_linha, dre_detalhe ),
  centro_custo:centros_custo ( id, codigo, nome ),
  forma_pagamento:formas_pagamento ( id, nome ),
  conta_bancaria:contas_bancarias ( id, nome )
`;

function emptyToNull(value?: string | null) {
  const t = value?.trim();
  return t ? t : null;
}

function buildPayload(input: CreateFornecedorInput | UpdateFornecedorInput) {
  const doc = validateDocumento(input.documento);
  if (!doc.ok) throw new Error(doc.message);

  return {
    nome: input.nome!.trim(),
    nome_fantasia: emptyToNull(input.nome_fantasia),
    tipo_pessoa: input.tipo_pessoa ?? null,
    documento: doc.digits,
    email: emptyToNull(input.email),
    telefone: emptyToNull(input.telefone),
    cep: emptyToNull(input.cep),
    rua: emptyToNull(input.rua),
    numero: emptyToNull(input.numero),
    complemento: emptyToNull(input.complemento),
    bairro: emptyToNull(input.bairro),
    cidade: emptyToNull(input.cidade),
    estado: emptyToNull(input.estado)?.toUpperCase() ?? null,
    categoria_financeira_id: input.categoria_financeira_id || null,
    plano_conta_id: input.plano_conta_id || null,
    centro_custo_id: input.centro_custo_id || null,
    forma_pagamento_id: input.forma_pagamento_id || null,
    conta_bancaria_id: input.conta_bancaria_id || null,
    prazo_medio_dias: input.prazo_medio_dias ?? null,
    recorrente: input.recorrente ?? false,
    frequencia: input.frequencia ?? null,
    observacoes: emptyToNull(input.observacoes),
    ativo: input.ativo ?? true,
  };
}

function resolveSort(
  sort?: FornecedorSortField,
  order?: SortOrder,
): { column: FornecedorSortField; ascending: boolean } {
  const allowed: FornecedorSortField[] = [
    "nome",
    "documento",
    "cidade",
    "ativo",
    "created_at",
  ];
  const column = allowed.includes(sort ?? "nome") ? (sort ?? "nome") : "nome";
  return { column, ascending: order === "asc" || !order };
}

export class FornecedorService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async list(
    params: ListFornecedoresParams = {},
  ): Promise<PaginatedResult<FornecedorListItem>> {
    const page = Math.max(params.page ?? 1, 1);
    const perPage = Math.min(Math.max(params.perPage ?? 20, 1), 100);
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    const search = params.search?.trim();
    const { column, ascending } = resolveSort(params.sort, params.order);

    let query = this.supabase
      .from("fornecedores")
      .select(LIST_SELECT, { count: "exact" })
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .order(column, { ascending });

    if (search) {
      const digits = onlyDigits(search);
      const filters = [
        `nome.ilike.%${search}%`,
        `nome_fantasia.ilike.%${search}%`,
        `email.ilike.%${search}%`,
        `cidade.ilike.%${search}%`,
      ];
      if (digits) filters.push(`documento.ilike.%${digits}%`);
      query = query.or(filters.join(","));
    }

    if (params.ativo !== undefined && params.ativo !== "all") {
      query = query.eq("ativo", params.ativo);
    }

    const { data, error, count } = await query.range(from, to);
    if (error) throw new Error(error.message);

    return {
      data: (data ?? []) as FornecedorListItem[],
      total: count ?? 0,
      page,
      perPage,
      totalPages: Math.max(Math.ceil((count ?? 0) / perPage), 1),
    };
  }

  async listActiveOptions(): Promise<
    Array<{ id: string; nome: string; documento: string | null }>
  > {
    const cached = masterCacheGet<
      Array<{ id: string; nome: string; documento: string | null }>
    >(this.tenantId, MASTER_CACHE_BUCKETS.fornecedores);
    if (cached) return cached;

    const { data, error } = await this.supabase
      .from("fornecedores")
      .select("id, nome, documento")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<{
      id: string;
      nome: string;
      documento: string | null;
    }>;
    masterCacheSet(this.tenantId, MASTER_CACHE_BUCKETS.fornecedores, rows);
    return rows;
  }

  async getById(id: string): Promise<FornecedorDetail | null> {
    const { data, error } = await this.supabase
      .from("fornecedores")
      .select(DETAIL_SELECT)
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      // Colunas novas ainda não migradas — fallback mínimo
      if (error.message.toLowerCase().includes("nome_fantasia")) {
        const fallback = await this.supabase
          .from("fornecedores")
          .select("*")
          .eq("tenant_id", this.tenantId)
          .eq("id", id)
          .is("deleted_at", null)
          .maybeSingle();
        if (fallback.error) throw new Error(fallback.error.message);
        return (fallback.data as FornecedorDetail | null) ?? null;
      }
      throw new Error(error.message);
    }
    return (data as FornecedorDetail | null) ?? null;
  }

  async checkDuplicates(input: {
    excludeId?: string;
    documento?: string | null;
    nome?: string | null;
    nomeFantasia?: string | null;
    email?: string | null;
  }) {
    const { data, error } = await this.supabase
      .from("fornecedores")
      .select("id, nome, nome_fantasia, documento, email")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .limit(500);

    if (error && !error.message.toLowerCase().includes("nome_fantasia")) {
      throw new Error(error.message);
    }

    const candidates = (data ?? []).map((row) => ({
      id: row.id as string,
      label: (row as { nome: string }).nome,
      nome: (row as { nome: string }).nome,
      nomeFantasia: (row as { nome_fantasia?: string | null }).nome_fantasia,
      documento: (row as { documento?: string | null }).documento,
      email: (row as { email?: string | null }).email,
    }));

    return findFornecedorDuplicates({ ...input, candidates });
  }

  async create(input: CreateFornecedorInput): Promise<Fornecedor> {
    const dup = await this.checkDuplicates({
      documento: input.documento,
      nome: input.nome,
      nomeFantasia: input.nome_fantasia,
      email: input.email,
    });
    if (dup.hasDuplicates) {
      const first = dup.matches[0];
      throw new Error(
        `Possível duplicidade: ${first?.label} (${first?.matchedOn.join(", ")}). Confirme antes de seguir.`,
      );
    }

    const { data, error } = await this.supabase
      .from("fornecedores")
      .insert({
        tenant_id: this.tenantId,
        ...buildPayload(input),
      } as never)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("Já existe fornecedor com este documento neste tenant.");
      }
      throw new Error(error.message);
    }

    masterCacheInvalidate(this.tenantId, MASTER_CACHE_BUCKETS.fornecedores);
    return data as unknown as Fornecedor;
  }

  async update(id: string, input: UpdateFornecedorInput): Promise<Fornecedor> {
    if (input.documento || input.nome || input.email || input.nome_fantasia) {
      const dup = await this.checkDuplicates({
        excludeId: id,
        documento: input.documento,
        nome: input.nome,
        nomeFantasia: input.nome_fantasia,
        email: input.email,
      });
      if (dup.hasDuplicates) {
        const first = dup.matches[0];
        throw new Error(
          `Possível duplicidade: ${first?.label} (${first?.matchedOn.join(", ")}).`,
        );
      }
    }

    const current = await this.getById(id);
    if (!current) throw new Error("Fornecedor não encontrado.");

    const merged = buildPayload({
      ...current,
      ...input,
      nome: input.nome ?? current.nome,
      ativo: input.ativo ?? current.ativo,
    });

    const { data, error } = await this.supabase
      .from("fornecedores")
      .update(merged as never)
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("Já existe fornecedor com este documento neste tenant.");
      }
      throw new Error(error.message);
    }

    masterCacheInvalidate(this.tenantId, MASTER_CACHE_BUCKETS.fornecedores);
    return data as unknown as Fornecedor;
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("fornecedores")
      .update({ deleted_at: new Date().toISOString(), ativo: false } as never)
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);
    masterCacheInvalidate(this.tenantId, MASTER_CACHE_BUCKETS.fornecedores);
  }
}

export async function createFornecedorService(tenantId: string) {
  const supabase = await createClient();
  return new FornecedorService(supabase, tenantId);
}
