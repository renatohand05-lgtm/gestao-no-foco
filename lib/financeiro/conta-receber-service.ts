import type { SupabaseClient } from "@supabase/supabase-js";

import {
  FINANCEIRO_DEFAULT_PER_PAGE,
  FINANCEIRO_MAX_PER_PAGE,
} from "@/lib/financeiro/constants";
import {
  addMonths,
  calcSaldoPendente,
  calcValorLiquido,
  canCancelarContaReceber,
  canEditContaReceber,
  canReceberContaReceber,
  resolveStatusExibicao,
  splitValorParcelas,
  todayISO,
} from "@/lib/financeiro/conta-receber-utils";
import { buildContaReceberPayload } from "@/lib/financeiro/mappers";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  CategoriaFinanceiraOption,
  CentroCustoOption,
  ClienteOption,
  ContaReceberDetail,
  ContaReceberListItem,
  ContaReceberSortField,
  ContasReceberResumo,
  ContaReceberStatus,
  CreateContaReceberInput,
  FormaPagamentoOption,
  ListContasReceberParams,
  PaginatedResult,
  ReceberContaInput,
  UpdateContaReceberInput,
  VendaOption,
} from "@/types/contas-receber";
import type { SortOrder } from "@/types/financeiro";

const LIST_SELECT = `
  id,
  numero,
  descricao,
  cliente_id,
  venda_id,
  status,
  valor_original,
  desconto,
  juros,
  multa,
  valor_recebido,
  data_emissao,
  data_vencimento,
  data_recebimento,
  parcela_numero,
  parcela_total,
  created_at,
  cliente:clientes ( id, nome, documento ),
  venda:vendas ( id, numero )
`;

const DETAIL_SELECT = `
  *,
  cliente:clientes ( id, nome, documento ),
  venda:vendas ( id, numero ),
  forma_pagamento:formas_pagamento ( id, nome ),
  categoria_financeira:categorias_financeiras ( id, nome ),
  centro_custo:centros_custo ( id, nome, codigo )
`;

function resolveSort(
  sort?: ContaReceberSortField,
  order?: SortOrder,
): { column: ContaReceberSortField; ascending: boolean } {
  const allowed: ContaReceberSortField[] = [
    "numero",
    "data_vencimento",
    "data_emissao",
    "valor_original",
    "status",
    "created_at",
  ];
  const column = allowed.includes(sort ?? "data_vencimento")
    ? (sort ?? "data_vencimento")
    : "data_vencimento";
  const ascending = order === "asc";

  return { column, ascending };
}

function mapListItem(
  row: Omit<ContaReceberListItem, "status_exibicao">,
): ContaReceberListItem {
  return {
    ...row,
    status_exibicao: resolveStatusExibicao(row),
  };
}

function mapDetail(row: Omit<ContaReceberDetail, "status_exibicao">): ContaReceberDetail {
  return {
    ...row,
    status_exibicao: resolveStatusExibicao(row),
  };
}

function mapUniqueViolation(error: { code?: string; message: string }) {
  if (error.code === "23505") {
    return "Já existe uma conta a receber para esta venda e parcela.";
  }
  return error.message;
}

export class ContaReceberService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async list(
    params: ListContasReceberParams = {},
  ): Promise<PaginatedResult<ContaReceberListItem>> {
    const page = Math.max(params.page ?? 1, 1);
    const perPage = Math.min(
      Math.max(params.perPage ?? FINANCEIRO_DEFAULT_PER_PAGE, 1),
      FINANCEIRO_MAX_PER_PAGE,
    );
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    const search = params.search?.trim();
    const { column, ascending } = resolveSort(params.sort, params.order);
    const today = todayISO();

    let query = this.supabase
      .from("contas_receber")
      .select(LIST_SELECT, { count: "exact" })
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .order(column, { ascending });

    if (search) {
      const numericSearch = /^\d+$/.test(search);
      if (numericSearch) {
        query = query.or(`descricao.ilike.%${search}%,numero.eq.${search}`);
      } else {
        query = query.ilike("descricao", `%${search}%`);
      }
    }

    if (params.clienteId) {
      query = query.eq("cliente_id", params.clienteId);
    }

    if (params.vencimentoDe) {
      query = query.gte("data_vencimento", params.vencimentoDe);
    }

    if (params.vencimentoAte) {
      query = query.lte("data_vencimento", params.vencimentoAte);
    }

    if (params.status && params.status !== "all") {
      if (params.status === "vencido") {
        query = query
          .eq("status", "aberto")
          .lt("data_vencimento", today);
      } else if (params.status === "aberto") {
        query = query
          .eq("status", "aberto")
          .gte("data_vencimento", today);
      } else {
        query = query.eq("status", params.status);
      }
    }

    const { data, error, count } = await query.range(from, to);

    if (error) throw new Error(error.message);

    const total = count ?? 0;

    return {
      data: ((data ?? []) as Omit<ContaReceberListItem, "status_exibicao">[]).map(
        mapListItem,
      ),
      total,
      page,
      perPage,
      totalPages: Math.max(Math.ceil(total / perPage), 1),
    };
  }

  async getResumo(): Promise<ContasReceberResumo> {
    const today = todayISO();
    const proximoFim = (() => {
      const d = new Date(`${today}T12:00:00`);
      d.setDate(d.getDate() + 7);
      return d.toISOString().slice(0, 10);
    })();

    const { data, error } = await this.supabase
      .from("contas_receber")
      .select(
        "status, valor_original, desconto, juros, multa, valor_recebido, data_vencimento",
      )
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .neq("status", "cancelado");

    if (error) throw new Error(error.message);

    const resumo: ContasReceberResumo = {
      total_aberto: 0,
      total_recebido: 0,
      total_vencido: 0,
      vencimentos_proximos: 0,
      quantidade_aberto: 0,
      quantidade_vencido: 0,
      quantidade_proximos: 0,
    };

    for (const row of data ?? []) {
      const statusExibicao = resolveStatusExibicao({
        status: row.status as ContaReceberStatus,
        data_vencimento: row.data_vencimento,
      });

      if (row.status === "recebido") {
        resumo.total_recebido += row.valor_recebido;
        continue;
      }

      const saldo = calcSaldoPendente(row);

      if (statusExibicao === "aberto") {
        resumo.total_aberto += saldo;
        resumo.quantidade_aberto += 1;

        if (
          row.data_vencimento >= today &&
          row.data_vencimento <= proximoFim
        ) {
          resumo.vencimentos_proximos += saldo;
          resumo.quantidade_proximos += 1;
        }
      }

      if (statusExibicao === "vencido") {
        resumo.total_vencido += saldo;
        resumo.quantidade_vencido += 1;
      }
    }

    return resumo;
  }

  async getById(id: string): Promise<ContaReceberDetail | null> {
    const { data, error } = await this.supabase
      .from("contas_receber")
      .select(DETAIL_SELECT)
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (!data) return null;

    return mapDetail(data as Omit<ContaReceberDetail, "status_exibicao">);
  }

  async existsForVenda(vendaId: string): Promise<boolean> {
    const { count, error } = await this.supabase
      .from("contas_receber")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.tenantId)
      .eq("venda_id", vendaId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    return (count ?? 0) > 0;
  }

  async create(input: CreateContaReceberInput): Promise<ContaReceberDetail> {
    const parcelas = Math.max(input.parcelas ?? 1, 1);
    const grupoId = parcelas > 1 ? crypto.randomUUID() : null;
    const valores = splitValorParcelas(input.valor_original, parcelas);

    const rows = valores.map((valor, index) => ({
      tenant_id: this.tenantId,
      ...buildContaReceberPayload({
        ...input,
        valor_original: valor,
        data_vencimento:
          index === 0
            ? input.data_vencimento
            : addMonths(input.data_vencimento, index),
      }),
      grupo_parcelamento_id: grupoId,
      parcela_numero: index + 1,
      parcela_total: parcelas,
      status: "aberto" as const,
      valor_recebido: 0,
    }));

    const { data, error } = await this.supabase
      .from("contas_receber")
      .insert(rows)
      .select("id")
      .order("parcela_numero", { ascending: true });

    if (error) throw new Error(mapUniqueViolation(error));

    const createdId = data?.[0]?.id as string | undefined;
    if (!createdId) {
      throw new Error("Erro ao criar conta a receber.");
    }

    const detail = await this.getById(createdId);
    if (!detail) {
      throw new Error("Erro ao carregar conta a receber criada.");
    }

    return detail;
  }

  async update(
    id: string,
    input: UpdateContaReceberInput,
  ): Promise<ContaReceberDetail> {
    const current = await this.getById(id);

    if (!current) {
      throw new Error("Conta a receber não encontrada.");
    }

    if (!canEditContaReceber(current)) {
      throw new Error("Somente contas em aberto ou vencidas podem ser editadas.");
    }

    const { data, error } = await this.supabase
      .from("contas_receber")
      .update(buildContaReceberPayload(input as CreateContaReceberInput))
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .select("id")
      .single();

    if (error) throw new Error(mapUniqueViolation(error));

    const detail = await this.getById(data.id);
    if (!detail) {
      throw new Error("Erro ao carregar conta a receber atualizada.");
    }

    return detail;
  }

  async receber(id: string, input: ReceberContaInput): Promise<ContaReceberDetail> {
    const current = await this.getById(id);

    if (!current) {
      throw new Error("Conta a receber não encontrada.");
    }

    if (!canReceberContaReceber(current)) {
      throw new Error("Esta conta não pode receber baixa no status atual.");
    }

    const desconto = input.desconto ?? current.desconto;
    const juros = input.juros ?? current.juros;
    const multa = input.multa ?? current.multa;
    const valorLiquido = calcValorLiquido({
      valor_original: current.valor_original,
      desconto,
      juros,
      multa,
    });
    const valorRecebido = input.valor_recebido ?? valorLiquido;

    if (valorRecebido < 0) {
      throw new Error("Valor recebido não pode ser negativo.");
    }

    const { data, error } = await this.supabase
      .from("contas_receber")
      .update({
        desconto,
        juros,
        multa,
        valor_recebido: valorRecebido,
        data_recebimento: input.data_recebimento,
        status: "recebido",
      })
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    const detail = await this.getById(data.id);
    if (!detail) {
      throw new Error("Erro ao carregar conta após baixa.");
    }

    return detail;
  }

  async cancelar(id: string): Promise<ContaReceberDetail> {
    const current = await this.getById(id);

    if (!current) {
      throw new Error("Conta a receber não encontrada.");
    }

    if (!canCancelarContaReceber(current)) {
      throw new Error("Esta conta não pode ser cancelada no status atual.");
    }

    const { data, error } = await this.supabase
      .from("contas_receber")
      .update({ status: "cancelado" })
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    const detail = await this.getById(data.id);
    if (!detail) {
      throw new Error("Erro ao carregar conta após cancelamento.");
    }

    return detail;
  }

  async softDelete(id: string): Promise<void> {
    const current = await this.getById(id);

    if (!current) {
      throw new Error("Conta a receber não encontrada.");
    }

    if (current.status !== "cancelado") {
      throw new Error("Somente contas canceladas podem ser excluídas.");
    }

    const { error } = await this.supabase
      .from("contas_receber")
      .update({ deleted_at: new Date().toISOString() })
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);
  }

  async listClientes(): Promise<ClienteOption[]> {
    const { data, error } = await this.supabase
      .from("clientes")
      .select("id, nome, documento")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (error) throw new Error(error.message);

    return (data ?? []) as ClienteOption[];
  }

  async listVendas(): Promise<VendaOption[]> {
    const { data, error } = await this.supabase
      .from("vendas")
      .select("id, numero, cliente_id, total, status")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("status", "faturado")
      .order("numero", { ascending: false });

    if (error) throw new Error(error.message);

    return (data ?? []) as VendaOption[];
  }

  async listFormasPagamento(): Promise<FormaPagamentoOption[]> {
    const { data, error } = await this.supabase
      .from("formas_pagamento")
      .select("id, nome")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (error) throw new Error(error.message);

    return (data ?? []) as FormaPagamentoOption[];
  }

  async listCategorias(): Promise<CategoriaFinanceiraOption[]> {
    const { data, error } = await this.supabase
      .from("categorias_financeiras")
      .select("id, nome, tipo")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("ativo", true)
      .in("tipo", ["receita", "ambos"])
      .order("nome", { ascending: true });

    if (error) throw new Error(error.message);

    return (data ?? []) as CategoriaFinanceiraOption[];
  }

  async listCentrosCusto(): Promise<CentroCustoOption[]> {
    const { data, error } = await this.supabase
      .from("centros_custo")
      .select("id, codigo, nome")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("ativo", true)
      .order("codigo", { ascending: true });

    if (error) throw new Error(error.message);

    return (data ?? []) as CentroCustoOption[];
  }
}

export async function createContaReceberService(tenantId: string) {
  const supabase = await createClient();
  return new ContaReceberService(supabase, tenantId);
}
