import type { SupabaseClient } from "@supabase/supabase-js";

import {
  ESTOQUE_DEFAULT_PER_PAGE,
  ESTOQUE_MAX_PER_PAGE,
  ESTOQUE_PRODUTOS_RESUMO_PER_PAGE,
  PRODUTO_TIPOS_SEM_ESTOQUE,
} from "@/lib/estoque/constants";
import { calcCustoMedioPonderado } from "@/lib/nfe/nfe-custo";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  CreateMovimentacaoInput,
  EstoqueMovimentacaoDetail,
  EstoqueMovimentacaoListItem,
  EstoqueProdutoResumo,
  ListEstoqueProdutosParams,
  ListMovimentacoesParams,
  MovimentacaoSortField,
  MovimentacaoTipo,
  PaginatedResult,
  SortOrder,
} from "@/types/estoque";

const MOVIMENTACAO_SELECT =
  "id, tenant_id, produto_id, tipo, quantidade, quantidade_anterior, quantidade_nova, motivo, origem, observacoes, created_by, deleted_at, created_at, produto:produtos(id, nome, sku, unidade_medida, estoque_minimo)";

const PRODUTO_ESTOQUE_SELECT =
  "id, nome, sku, unidade_medida, estoque_atual, estoque_minimo, estoque_maximo, categoria";

function resolveSort(
  sort?: MovimentacaoSortField,
  order?: SortOrder,
): { column: MovimentacaoSortField; ascending: boolean } {
  const allowed: MovimentacaoSortField[] = [
    "created_at",
    "tipo",
    "quantidade",
    "quantidade_nova",
  ];
  const column = allowed.includes(sort ?? "created_at")
    ? (sort ?? "created_at")
    : "created_at";
  const ascending = order === "asc";

  return { column, ascending };
}

function calcNovaQuantidade(
  tipo: MovimentacaoTipo,
  quantidade: number,
  estoqueAnterior: number,
) {
  switch (tipo) {
    case "entrada":
      return estoqueAnterior + quantidade;
    case "saida":
      return estoqueAnterior - quantidade;
    case "ajuste":
      return quantidade;
    default:
      return estoqueAnterior;
  }
}

export class EstoqueService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async listMovimentacoes(
    params: ListMovimentacoesParams = {},
  ): Promise<PaginatedResult<EstoqueMovimentacaoListItem>> {
    const page = Math.max(params.page ?? 1, 1);
    const perPage = Math.min(
      Math.max(params.perPage ?? ESTOQUE_DEFAULT_PER_PAGE, 1),
      ESTOQUE_MAX_PER_PAGE,
    );
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    const search = params.search?.trim();
    const { column, ascending } = resolveSort(params.sort, params.order);

    let query = this.supabase
      .from("estoque_movimentacoes")
      .select(MOVIMENTACAO_SELECT, { count: "exact" })
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .order(column, { ascending });

    if (params.tipo && params.tipo !== "all") {
      query = query.eq("tipo", params.tipo);
    }

    if (params.origem?.trim()) {
      query = query.eq("origem", params.origem.trim());
    }

    if (params.produtoId) {
      query = query.eq("produto_id", params.produtoId);
    }

    if (search) {
      const { data: produtos } = await this.supabase
        .from("produtos")
        .select("id")
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .or(`nome.ilike.%${search}%,sku.ilike.%${search}%`);

      const produtoIds = produtos?.map((item) => item.id) ?? [];
      const filters = [
        `motivo.ilike.%${search}%`,
        `origem.ilike.%${search}%`,
        `observacoes.ilike.%${search}%`,
      ];

      if (produtoIds.length > 0) {
        filters.push(`produto_id.in.(${produtoIds.join(",")})`);
      }

      query = query.or(filters.join(","));
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    const total = count ?? 0;

    return {
      data: (data ?? []) as EstoqueMovimentacaoListItem[],
      total,
      page,
      perPage,
      totalPages: Math.max(Math.ceil(total / perPage), 1),
    };
  }

  async getMovimentacaoById(id: string): Promise<EstoqueMovimentacaoDetail | null> {
    const { data, error } = await this.supabase
      .from("estoque_movimentacoes")
      .select(MOVIMENTACAO_SELECT)
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) return null;

    const movimentacao = data as EstoqueMovimentacaoListItem;
    let createdByProfile = null;

    if (movimentacao.created_by) {
      const { data: profile } = await this.supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", movimentacao.created_by)
        .maybeSingle();

      createdByProfile = profile ?? null;
    }

    return {
      ...movimentacao,
      created_by_profile: createdByProfile,
    };
  }

  async listProdutosEstoque(
    params: ListEstoqueProdutosParams = {},
  ): Promise<PaginatedResult<EstoqueProdutoResumo>> {
    const page = Math.max(params.page ?? 1, 1);
    const perPage = Math.min(
      Math.max(params.perPage ?? ESTOQUE_PRODUTOS_RESUMO_PER_PAGE, 1),
      ESTOQUE_MAX_PER_PAGE,
    );
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    const search = params.search?.trim();

    let query = this.supabase
      .from("produtos")
      .select(PRODUTO_ESTOQUE_SELECT, { count: "exact" })
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .not("tipo", "eq", "servico")
      .order("nome", { ascending: true });

    if (search) {
      query = query.or(
        `nome.ilike.%${search}%,sku.ilike.%${search}%,categoria.ilike.%${search}%`,
      );
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    let items = (data ?? []) as EstoqueProdutoResumo[];

    if (params.alerta) {
      items = items.filter(
        (item) =>
          item.estoque_minimo !== null &&
          item.estoque_atual < item.estoque_minimo,
      );
    }

    const total = params.alerta ? items.length : (count ?? 0);

    return {
      data: items,
      total,
      page,
      perPage,
      totalPages: Math.max(Math.ceil(total / perPage), 1),
    };
  }

  async listAlertasEstoqueBaixo(): Promise<EstoqueProdutoResumo[]> {
    const { data, error } = await this.supabase
      .from("produtos")
      .select(PRODUTO_ESTOQUE_SELECT)
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .not("tipo", "eq", "servico")
      .not("estoque_minimo", "is", null)
      .order("nome", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return ((data ?? []) as EstoqueProdutoResumo[]).filter(
      (item) => item.estoque_atual < (item.estoque_minimo ?? 0),
    );
  }

  async listProdutosParaMovimentacao() {
    const { data, error } = await this.supabase
      .from("produtos")
      .select("id, nome, sku, unidade_medida, estoque_atual, tipo")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("ativo", true)
      .not("tipo", "eq", "servico")
      .order("nome", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  }

  async createMovimentacao(
    input: CreateMovimentacaoInput,
    createdBy: string | null,
  ) {
    const { data: produto, error: produtoError } = await this.supabase
      .from("produtos")
      .select("id, nome, tipo, estoque_atual, custo")
      .eq("tenant_id", this.tenantId)
      .eq("id", input.produto_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (produtoError) {
      throw new Error(produtoError.message);
    }

    if (!produto) {
      throw new Error("Produto não encontrado.");
    }

    if (PRODUTO_TIPOS_SEM_ESTOQUE.includes(produto.tipo as "servico")) {
      throw new Error("Serviços não possuem controle de estoque.");
    }

    const estoqueAnterior = Number(produto.estoque_atual ?? 0);
    const quantidadeNova = calcNovaQuantidade(
      input.tipo,
      input.quantidade,
      estoqueAnterior,
    );

    if (input.tipo === "saida" && input.quantidade > estoqueAnterior) {
      throw new Error(
        `Saída não permitida. Estoque disponível: ${estoqueAnterior}.`,
      );
    }

    if (quantidadeNova < 0) {
      throw new Error("A movimentação resultaria em estoque negativo.");
    }

    if (input.tipo !== "ajuste" && input.quantidade <= 0) {
      throw new Error("Informe uma quantidade maior que zero.");
    }

    const { data: movimentacao, error: movimentacaoError } = await this.supabase
      .from("estoque_movimentacoes")
      .insert({
        tenant_id: this.tenantId,
        produto_id: input.produto_id,
        tipo: input.tipo,
        quantidade: input.quantidade,
        quantidade_anterior: estoqueAnterior,
        quantidade_nova: quantidadeNova,
        motivo: input.motivo ?? null,
        origem: input.origem,
        observacoes: input.observacoes ?? null,
        created_by: createdBy,
      })
      .select("id")
      .single();

    if (movimentacaoError) {
      throw new Error(movimentacaoError.message);
    }

    const produtoUpdate: {
      estoque_atual: number;
      custo?: number;
      updated_at?: string;
    } = {
      estoque_atual: quantidadeNova,
      updated_at: new Date().toISOString(),
    };

    // Política CTO NF-e / compras: entrada com custo → médio ponderado
    if (
      input.tipo === "entrada" &&
      input.custo_unitario_entrada != null &&
      Number.isFinite(Number(input.custo_unitario_entrada))
    ) {
      produtoUpdate.custo = calcCustoMedioPonderado({
        saldoAtual: estoqueAnterior,
        custoMedioAtual: produto.custo,
        quantidadeEntrada: input.quantidade,
        custoUnitarioEntrada: Number(input.custo_unitario_entrada),
      });
    }

    const { error: updateError } = await this.supabase
      .from("produtos")
      .update(produtoUpdate)
      .eq("tenant_id", this.tenantId)
      .eq("id", input.produto_id)
      .is("deleted_at", null);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return movimentacao;
  }

  async softDeleteMovimentacao(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("estoque_movimentacoes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null);

    if (error) {
      throw new Error(error.message);
    }
  }
}

export async function createEstoqueService(tenantId: string) {
  const supabase = await createClient();
  return new EstoqueService(supabase, tenantId);
}
