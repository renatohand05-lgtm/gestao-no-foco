import type { SupabaseClient } from "@supabase/supabase-js";

import { PRODUTO_TIPOS_SEM_ESTOQUE } from "@/lib/estoque/constants";
import { createEstoqueService } from "@/lib/estoque/estoque-service";
import { createClient } from "@/lib/supabase/server";
import {
  VENDA_STATUS_EDITAVEIS,
  VENDAS_DEFAULT_PER_PAGE,
  VENDAS_MAX_PER_PAGE,
} from "@/lib/vendas/constants";
import { formatVendaNumero } from "@/lib/vendas/format";
import { buildVendaHeaderPayload } from "@/lib/vendas/mappers";
import type { Database } from "@/types/database";
import type {
  ClienteOption,
  CreateVendaInput,
  ListVendasParams,
  PaginatedResult,
  ProdutoOption,
  SortOrder,
  UpdateVendaInput,
  VendaDetail,
  VendasAbertasView,
  VendaItemWithProduto,
  VendaListItem,
  VendaOpenViewItem,
  VendaSortField,
  VendaStatus,
} from "@/types/vendas";

const LIST_SELECT =
  "id, numero, cliente_id, data_venda, status, total, created_at, updated_at, cliente:clientes(id, nome, email, telefone, documento)";

const DETAIL_SELECT =
  "*, cliente:clientes(id, nome, email, telefone, documento)";

const ITEM_SELECT =
  "id, tenant_id, venda_id, produto_id, descricao, tipo_item, quantidade, preco_unitario, desconto, total, custo_unitario, margem, ordem, deleted_at, created_at, produto:produtos(id, nome, sku, tipo, unidade_medida, preco_venda, custo, estoque_atual)";

function resolveSort(
  sort?: VendaSortField,
  order?: SortOrder,
): { column: VendaSortField; ascending: boolean } {
  const allowed: VendaSortField[] = [
    "numero",
    "data_venda",
    "total",
    "status",
    "created_at",
  ];
  const column = allowed.includes(sort ?? "created_at")
    ? (sort ?? "created_at")
    : "created_at";
  const ascending = order === "asc";

  return { column, ascending };
}

function isEditableStatus(status: VendaStatus) {
  return VENDA_STATUS_EDITAVEIS.includes(
    status as (typeof VENDA_STATUS_EDITAVEIS)[number],
  );
}

type StockItem = {
  produto_id: string;
  quantidade: number;
  descricao: string;
};

function aggregateStockItems(itens: VendaItemWithProduto[]): StockItem[] {
  const map = new Map<string, StockItem>();

  for (const item of itens) {
    if (!item.produto_id) continue;
    if (PRODUTO_TIPOS_SEM_ESTOQUE.includes(item.tipo_item as "servico")) continue;

    const existing = map.get(item.produto_id);
    if (existing) {
      existing.quantidade += item.quantidade;
    } else {
      map.set(item.produto_id, {
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        descricao: item.descricao,
      });
    }
  }

  return Array.from(map.values());
}

function buildResumoFinanceiro(venda: VendaDetail) {
  const descontoItens = venda.itens.reduce(
    (sum, item) => sum + Number(item.desconto ?? 0),
    0,
  );

  return {
    subtotal: venda.subtotal,
    desconto_itens: Number(descontoItens.toFixed(2)),
    desconto_total: venda.desconto_total,
    total_geral: venda.total,
    margem_estimada: venda.margem_total,
  };
}

function buildAcoesDisponiveis(
  status: VendaStatus,
): Array<"editar" | "faturar" | "cancelar" | "excluir"> {
  const actions: Array<"editar" | "faturar" | "cancelar" | "excluir"> = [];

  if (status === "orcamento" || status === "em_andamento") {
    actions.push("editar", "faturar", "cancelar", "excluir");
  }

  return actions;
}

export class VendaService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async list(
    params: ListVendasParams = {},
  ): Promise<PaginatedResult<VendaListItem>> {
    const page = Math.max(params.page ?? 1, 1);
    const perPage = Math.min(
      Math.max(params.perPage ?? VENDAS_DEFAULT_PER_PAGE, 1),
      VENDAS_MAX_PER_PAGE,
    );
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    const search = params.search?.trim();
    const { column, ascending } = resolveSort(params.sort, params.order);

    let query = this.supabase
      .from("vendas")
      .select(LIST_SELECT, { count: "exact" })
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .order(column, { ascending });

    if (params.status && params.status !== "all") {
      query = query.eq("status", params.status);
    }

    if (params.clienteId) {
      query = query.eq("cliente_id", params.clienteId);
    }

    if (search) {
      const { data: clientes } = await this.supabase
        .from("clientes")
        .select("id")
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .or(`nome.ilike.%${search}%,documento.ilike.%${search}%`);

      const clienteIds = clientes?.map((item) => item.id) ?? [];
      const filters: string[] = [];

      if (/^\d+$/.test(search)) {
        filters.push(`numero.eq.${search}`);
      }

      if (clienteIds.length > 0) {
        filters.push(`cliente_id.in.(${clienteIds.join(",")})`);
      }

      if (filters.length > 0) {
        query = query.or(filters.join(","));
      } else if (/^\d+$/.test(search)) {
        query = query.eq("numero", Number(search));
      } else {
        return {
          data: [],
          total: 0,
          page,
          perPage,
          totalPages: 1,
        };
      }
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    const total = count ?? 0;

    return {
      data: (data ?? []) as VendaListItem[],
      total,
      page,
      perPage,
      totalPages: Math.max(Math.ceil(total / perPage), 1),
    };
  }

  async getById(id: string): Promise<VendaDetail | null> {
    const { data, error } = await this.supabase
      .from("vendas")
      .select(DETAIL_SELECT)
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) return null;

    const { data: itens, error: itensError } = await this.supabase
      .from("venda_itens")
      .select(ITEM_SELECT)
      .eq("tenant_id", this.tenantId)
      .eq("venda_id", id)
      .is("deleted_at", null)
      .order("ordem", { ascending: true });

    if (itensError) {
      throw new Error(itensError.message);
    }

    const vendaData = data as unknown as VendaDetail;
    let createdByProfile = null;

    if (vendaData.created_by) {
      const { data: profile } = await this.supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", vendaData.created_by)
        .maybeSingle();

      createdByProfile = profile ?? null;
    }

    return {
      ...vendaData,
      itens: (itens ?? []) as VendaItemWithProduto[],
      created_by_profile: createdByProfile,
    };
  }

  async getVendasAbertasView(
    searchTerm?: string,
  ): Promise<VendasAbertasView> {
    const term = searchTerm?.trim();

    const emptyView: VendasAbertasView = {
      items: [],
      resumo: {
        quantidade: 0,
        subtotal: 0,
        desconto_itens: 0,
        desconto_total: 0,
        total_geral: 0,
        margem_estimada: null,
        por_status: {
          orcamento: 0,
          em_andamento: 0,
        },
      },
    };

    let headerQuery = this.supabase
      .from("vendas")
      .select(DETAIL_SELECT)
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .in("status", ["orcamento", "em_andamento"]);

    if (term) {
      const digits = /^\d+$/.test(term);

      const { data: clientes } = await this.supabase
        .from("clientes")
        .select("id")
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .or(`nome.ilike.%${term}%,documento.ilike.%${term}%`);

      const clienteIds = clientes?.map((c) => c.id) ?? [];
      const filters: string[] = [];

      if (digits) {
        filters.push(`numero.eq.${term}`);
      }

      if (clienteIds.length > 0) {
        filters.push(`cliente_id.in.(${clienteIds.join(",")})`);
      }

      if (filters.length === 0) {
        return emptyView;
      }

      headerQuery = headerQuery.or(filters.join(","));
    }

    headerQuery = headerQuery
      .order("data_venda", { ascending: false })
      .order("numero", { ascending: false });

    const { data: vendasData, error: vendasError } = await headerQuery;

    if (vendasError) throw new Error(vendasError.message);

    const vendas = (vendasData ?? []) as VendaDetail[];
    const vendaIds = vendas.map((v) => v.id);

    if (vendaIds.length === 0) return emptyView;

    const { data: itensData, error: itensError } = await this.supabase
      .from("venda_itens")
      .select(ITEM_SELECT)
      .eq("tenant_id", this.tenantId)
      .in("venda_id", vendaIds)
      .is("deleted_at", null)
      .order("ordem", { ascending: true });

    if (itensError) throw new Error(itensError.message);

    const itensByVenda = new Map<string, VendaItemWithProduto[]>();

    for (const item of (itensData ?? []) as VendaItemWithProduto[]) {
      const list = itensByVenda.get(item.venda_id) ?? [];
      list.push(item);
      itensByVenda.set(item.venda_id, list);
    }

    const items: VendaOpenViewItem[] = vendas.map((venda) => {
      const itens = itensByVenda.get(venda.id) ?? [];

      const vendaDetail = {
        ...venda,
        itens,
      } as VendaDetail;

      return {
        ...vendaDetail,
        resumo: buildResumoFinanceiro(vendaDetail),
        acoes_disponiveis: buildAcoesDisponiveis(vendaDetail.status),
      };
    });

    const resumoBase = items.reduce(
      (acc, venda) => {
        acc.quantidade += 1;
        acc.subtotal += venda.resumo.subtotal;
        acc.desconto_itens += venda.resumo.desconto_itens;
        acc.desconto_total += venda.resumo.desconto_total;
        acc.total_geral += venda.resumo.total_geral;
        if (venda.resumo.margem_estimada !== null) {
          acc.margem_estimada += venda.resumo.margem_estimada;
          acc.hasMargem = true;
        }
        acc.por_status[
          venda.status as "orcamento" | "em_andamento"
        ] += 1;
        return acc;
      },
      {
        quantidade: 0,
        subtotal: 0,
        desconto_itens: 0,
        desconto_total: 0,
        total_geral: 0,
        margem_estimada: 0,
        hasMargem: false,
        por_status: {
          orcamento: 0,
          em_andamento: 0,
        },
      },
    );

    return {
      items,
      resumo: {
        quantidade: resumoBase.quantidade,
        subtotal: Number(resumoBase.subtotal.toFixed(2)),
        desconto_itens: Number(resumoBase.desconto_itens.toFixed(2)),
        desconto_total: Number(resumoBase.desconto_total.toFixed(2)),
        total_geral: Number(resumoBase.total_geral.toFixed(2)),
        margem_estimada: resumoBase.hasMargem
          ? Number(resumoBase.margem_estimada.toFixed(2))
          : null,
        por_status: resumoBase.por_status,
      },
    };
  }

  async listClientesParaVenda(): Promise<ClienteOption[]> {
    const { data, error } = await this.supabase
      .from("clientes")
      .select("id, nome, documento")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as ClienteOption[];
  }

  async listProdutosParaVenda(): Promise<ProdutoOption[]> {
    const { data, error } = await this.supabase
      .from("produtos")
      .select(
        "id, nome, sku, tipo, unidade_medida, preco_venda, custo, estoque_atual",
      )
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as ProdutoOption[];
  }

  private async loadProdutosMap(produtoIds: string[]) {
    const uniqueIds = [...new Set(produtoIds)];

    const { data, error } = await this.supabase
      .from("produtos")
      .select(
        "id, nome, sku, tipo, unidade_medida, preco_venda, custo, estoque_atual",
      )
      .eq("tenant_id", this.tenantId)
      .in("id", uniqueIds)
      .is("deleted_at", null);

    if (error) {
      throw new Error(error.message);
    }

    const map = new Map<string, ProdutoOption>();
    for (const produto of (data ?? []) as ProdutoOption[]) {
      map.set(produto.id, produto);
    }

    if (map.size !== uniqueIds.length) {
      throw new Error("Um ou mais produtos não foram encontrados.");
    }

    return map;
  }

  private async validateCliente(clienteId: string) {
    const { data, error } = await this.supabase
      .from("clientes")
      .select("id")
      .eq("tenant_id", this.tenantId)
      .eq("id", clienteId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error("Cliente não encontrado.");
    }
  }

  private async insertItens(
    vendaId: string,
    itemRows: ReturnType<typeof buildVendaHeaderPayload>["itemRows"],
  ) {
    const payload = itemRows.map((item) => ({
      tenant_id: this.tenantId,
      venda_id: vendaId,
      produto_id: item.produto_id,
      descricao: item.descricao,
      tipo_item: item.tipo_item,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      desconto: item.desconto,
      total: item.total,
      custo_unitario: item.custo_unitario,
      margem: item.margem,
      ordem: item.ordem,
    }));

    const { error } = await this.supabase.from("venda_itens").insert(payload);

    if (error) {
      throw new Error(error.message);
    }
  }

  private async softDeleteItens(vendaId: string) {
    const { error } = await this.supabase
      .from("venda_itens")
      .update({ deleted_at: new Date().toISOString() })
      .eq("tenant_id", this.tenantId)
      .eq("venda_id", vendaId)
      .is("deleted_at", null);

    if (error) {
      throw new Error(error.message);
    }
  }

  async create(
    input: CreateVendaInput,
    createdBy: string | null,
  ): Promise<VendaDetail> {
    await this.validateCliente(input.cliente_id);

    const produtos = await this.loadProdutosMap(
      input.itens.map((item) => item.produto_id),
    );
    const header = buildVendaHeaderPayload(input, produtos);

    const { data: venda, error } = await this.supabase
      .from("vendas")
      .insert({
        tenant_id: this.tenantId,
        cliente_id: header.cliente_id,
        data_venda: header.data_venda,
        status: header.status,
        subtotal: header.subtotal,
        desconto_total: header.desconto_total,
        total: header.total,
        margem_total: header.margem_total,
        forma_pagamento: header.forma_pagamento,
        observacoes: header.observacoes,
        created_by: createdBy,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    await this.insertItens(venda.id, header.itemRows);

    const detail = await this.getById(venda.id);
    if (!detail) {
      throw new Error("Erro ao carregar venda criada.");
    }

    return detail;
  }

  async update(id: string, input: UpdateVendaInput): Promise<VendaDetail> {
    const existing = await this.getById(id);

    if (!existing) {
      throw new Error("Venda não encontrada.");
    }

    if (!isEditableStatus(existing.status)) {
      throw new Error("Somente orçamentos e vendas em andamento podem ser editados.");
    }

    await this.validateCliente(input.cliente_id);

    const produtos = await this.loadProdutosMap(
      input.itens.map((item) => item.produto_id),
    );
    const header = buildVendaHeaderPayload(input, produtos);

    const { error } = await this.supabase
      .from("vendas")
      .update({
        cliente_id: header.cliente_id,
        data_venda: header.data_venda,
        status: header.status,
        subtotal: header.subtotal,
        desconto_total: header.desconto_total,
        total: header.total,
        margem_total: header.margem_total,
        forma_pagamento: header.forma_pagamento,
        observacoes: header.observacoes,
      })
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null);

    if (error) {
      throw new Error(error.message);
    }

    await this.softDeleteItens(id);
    await this.insertItens(id, header.itemRows);

    const detail = await this.getById(id);
    if (!detail) {
      throw new Error("Erro ao carregar venda atualizada.");
    }

    return detail;
  }

  async softDelete(id: string): Promise<void> {
    const existing = await this.getById(id);

    if (!existing) {
      throw new Error("Venda não encontrada.");
    }

    if (!isEditableStatus(existing.status)) {
      throw new Error("Somente orçamentos e vendas em andamento podem ser excluídos.");
    }

    const now = new Date().toISOString();

    const { error } = await this.supabase
      .from("vendas")
      .update({ deleted_at: now })
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null);

    if (error) {
      throw new Error(error.message);
    }

    await this.softDeleteItens(id);
  }

  private async validateStockForFaturamento(itens: VendaItemWithProduto[]) {
    const stockItems = aggregateStockItems(itens);

    for (const item of stockItems) {
      const produto = itens.find((i) => i.produto_id === item.produto_id)?.produto;

      if (!produto) {
        throw new Error(`Produto "${item.descricao}" não encontrado.`);
      }

      if (item.quantidade > produto.estoque_atual) {
        throw new Error(
          `Estoque insuficiente para "${item.descricao}". Disponível: ${produto.estoque_atual}.`,
        );
      }
    }
  }

  private async processStockSaida(
    venda: VendaDetail,
    createdBy: string | null,
  ) {
    const estoqueService = await createEstoqueService(this.tenantId);

    const stockItems = aggregateStockItems(venda.itens);
    const referencia = `${formatVendaNumero(venda.numero)} (ID: ${venda.id})`;

    for (const item of stockItems) {
      await estoqueService.createMovimentacao(
        {
          produto_id: item.produto_id,
          tipo: "saida",
          quantidade: item.quantidade,
          motivo: `Faturamento da venda ${referencia}`,
          origem: "venda",
          observacoes: referencia,
        },
        createdBy,
      );
    }
  }

  private async processStockDevolucao(
    venda: VendaDetail,
    createdBy: string | null,
  ) {
    const estoqueService = await createEstoqueService(this.tenantId);
    const stockItems = aggregateStockItems(venda.itens);
    const referencia = `${formatVendaNumero(venda.numero)} (ID: ${venda.id})`;

    for (const item of stockItems) {
      await estoqueService.createMovimentacao(
        {
          produto_id: item.produto_id,
          tipo: "entrada",
          quantidade: item.quantidade,
          motivo: `Cancelamento da venda ${referencia}`,
          origem: "devolucao",
          observacoes: referencia,
        },
        createdBy,
      );
    }
  }

  async faturar(id: string, createdBy: string | null): Promise<VendaDetail> {
    const venda = await this.getById(id);

    if (!venda) {
      throw new Error("Venda não encontrada.");
    }

    if (venda.status === "faturado") {
      throw new Error("Esta venda já está faturada.");
    }

    if (venda.status === "cancelado") {
      throw new Error("Não é possível faturar uma venda cancelada.");
    }

    if (venda.itens.length === 0) {
      throw new Error("A venda precisa ter pelo menos um item para ser faturada.");
    }

    await this.validateStockForFaturamento(venda.itens);
    await this.processStockSaida(venda, createdBy);

    const { error } = await this.supabase
      .from("vendas")
      .update({ status: "faturado" })
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null);

    if (error) {
      throw new Error(error.message);
    }

    const detail = await this.getById(id);
    if (!detail) {
      throw new Error("Erro ao carregar venda faturada.");
    }

    return detail;
  }

  async cancelar(id: string, createdBy: string | null): Promise<VendaDetail> {
    const venda = await this.getById(id);

    if (!venda) {
      throw new Error("Venda não encontrada.");
    }

    if (venda.status === "cancelado") {
      throw new Error("Esta venda já está cancelada.");
    }

    if (venda.status === "faturado") {
      await this.processStockDevolucao(venda, createdBy);
    }

    const { error } = await this.supabase
      .from("vendas")
      .update({ status: "cancelado" })
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null);

    if (error) {
      throw new Error(error.message);
    }

    const detail = await this.getById(id);
    if (!detail) {
      throw new Error("Erro ao carregar venda cancelada.");
    }

    return detail;
  }
}

export async function createVendaService(tenantId: string) {
  const supabase = await createClient();
  return new VendaService(supabase, tenantId);
}
