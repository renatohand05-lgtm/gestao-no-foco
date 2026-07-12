import type { SupabaseClient } from "@supabase/supabase-js";

import {
  FINANCEIRO_DEFAULT_PER_PAGE,
  FINANCEIRO_MAX_PER_PAGE,
} from "@/lib/financeiro/constants";
import {
  addDays,
  addMonths,
  calcSaldoPendente,
  canCancelarContaPagar,
  canEditClassificacaoContaPagar,
  canEditContaPagar,
  resolveStatusExibicao,
  splitValorParcelas,
  todayISO,
} from "@/lib/financeiro/conta-pagar-utils";
import { buildContaPagarPayload } from "@/lib/financeiro/mappers";
import { baixarContaPagarAtomico } from "@/lib/financeiro/movimentacao-bancaria-rpc";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  CategoriaFinanceiraOption,
  CentroCustoOption,
  ClassificacaoContaPagarInput,
  ContaBancariaOption,
  ContaPagarDetail,
  ContaPagarListItem,
  ContaPagarSortField,
  ContaPagarStatusPersistido,
  ContasPagarResumo,
  CreateContaPagarInput,
  FormaPagamentoOption,
  FornecedorOption,
  ListContasPagarParams,
  PaginatedResult,
  PagarContaInput,
  PlanoContaOption,
  UpdateContaPagarInput,
} from "@/types/contas-pagar";
import type { SortOrder } from "@/types/financeiro";

const LIST_SELECT = `
  id,
  numero,
  descricao,
  fornecedor_id,
  fornecedor_nome,
  status,
  valor_original,
  desconto,
  juros,
  multa,
  valor_pago,
  data_emissao,
  data_competencia,
  data_vencimento,
  data_pagamento,
  parcela_numero,
  parcela_total,
  created_at,
  fornecedor:fornecedores ( id, nome, documento )
`;

const DETAIL_SELECT = `
  *,
  fornecedor:fornecedores ( id, nome, documento ),
  forma_pagamento:formas_pagamento ( id, nome ),
  categoria_financeira:categorias_financeiras ( id, nome ),
  centro_custo:centros_custo ( id, nome, codigo ),
  plano_conta:plano_contas ( id, nome, codigo ),
  conta_bancaria:contas_bancarias ( id, nome )
`;

function resolveSort(
  sort?: ContaPagarSortField,
  order?: SortOrder,
): { column: ContaPagarSortField; ascending: boolean } {
  const allowed: ContaPagarSortField[] = [
    "numero",
    "data_vencimento",
    "data_emissao",
    "data_competencia",
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
  row: Omit<ContaPagarListItem, "status_exibicao">,
): ContaPagarListItem {
  return {
    ...row,
    status_exibicao: resolveStatusExibicao({
      status: row.status as ContaPagarStatusPersistido,
      data_vencimento: row.data_vencimento,
    }),
  };
}

function mapDetail(row: Omit<ContaPagarDetail, "status_exibicao">): ContaPagarDetail {
  return {
    ...row,
    status_exibicao: resolveStatusExibicao({
      status: row.status as ContaPagarStatusPersistido,
      data_vencimento: row.data_vencimento,
    }),
  };
}

function isPendenteStatus(status: ContaPagarStatusPersistido): boolean {
  return status === "aberto" || status === "parcial";
}

export class ContaPagarService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async list(
    params: ListContasPagarParams = {},
  ): Promise<PaginatedResult<ContaPagarListItem>> {
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
      .from("contas_pagar")
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

    if (params.fornecedorId) {
      query = query.eq("fornecedor_id", params.fornecedorId);
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
      data: ((data ?? []) as Omit<ContaPagarListItem, "status_exibicao">[]).map(
        mapListItem,
      ),
      total,
      page,
      perPage,
      totalPages: Math.max(Math.ceil(total / perPage), 1),
    };
  }

  async getResumo(): Promise<ContasPagarResumo> {
    const today = todayISO();
    const proximo7 = addDays(today, 7);
    const proximo30 = addDays(today, 30);

    const { data, error } = await this.supabase
      .from("contas_pagar")
      .select(
        "status, valor_original, desconto, juros, multa, valor_pago, data_vencimento",
      )
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .neq("status", "cancelado");

    if (error) throw new Error(error.message);

    const resumo: ContasPagarResumo = {
      total_aberto: 0,
      total_pago: 0,
      total_vencido: 0,
      vencendo_hoje: 0,
      proximos_7_dias: 0,
      proximos_30_dias: 0,
      quantidade_aberto: 0,
      quantidade_vencido: 0,
      quantidade_vencendo_hoje: 0,
      quantidade_proximos_7: 0,
      quantidade_proximos_30: 0,
    };

    for (const row of data ?? []) {
      const statusPersistido = row.status as ContaPagarStatusPersistido;
      const statusExibicao = resolveStatusExibicao({
        status: statusPersistido,
        data_vencimento: row.data_vencimento,
      });

      if (statusPersistido === "pago") {
        resumo.total_pago += row.valor_pago;
        continue;
      }

      const saldo = calcSaldoPendente(row);

      if (statusPersistido === "parcial") {
        resumo.total_pago += row.valor_pago;
      }

      if (!isPendenteStatus(statusPersistido)) {
        continue;
      }

      if (statusExibicao === "aberto") {
        resumo.total_aberto += saldo;
        resumo.quantidade_aberto += 1;

        if (row.data_vencimento === today) {
          resumo.vencendo_hoje += saldo;
          resumo.quantidade_vencendo_hoje += 1;
        }

        if (row.data_vencimento > today && row.data_vencimento <= proximo7) {
          resumo.proximos_7_dias += saldo;
          resumo.quantidade_proximos_7 += 1;
        }

        if (row.data_vencimento > today && row.data_vencimento <= proximo30) {
          resumo.proximos_30_dias += saldo;
          resumo.quantidade_proximos_30 += 1;
        }
      }

      if (statusExibicao === "vencido") {
        resumo.total_vencido += saldo;
        resumo.quantidade_vencido += 1;
      }

      if (statusPersistido === "parcial") {
        resumo.total_aberto += saldo;
        resumo.quantidade_aberto += 1;

        if (row.data_vencimento === today) {
          resumo.vencendo_hoje += saldo;
          resumo.quantidade_vencendo_hoje += 1;
        }
      }
    }

    return resumo;
  }

  async getById(id: string): Promise<ContaPagarDetail | null> {
    const { data, error } = await this.supabase
      .from("contas_pagar")
      .select(DETAIL_SELECT)
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (!data) return null;

    return mapDetail(data as Omit<ContaPagarDetail, "status_exibicao">);
  }

  async create(input: CreateContaPagarInput): Promise<ContaPagarDetail> {
    const parcelas = Math.max(input.parcelas ?? 1, 1);
    const grupoId = parcelas > 1 ? crypto.randomUUID() : null;
    const valores = splitValorParcelas(input.valor_original, parcelas);

    const rows = valores.map((valor, index) => ({
      tenant_id: this.tenantId,
      ...buildContaPagarPayload({
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
      valor_pago: 0,
      anexos_metadata: [],
    }));

    const { data, error } = await this.supabase
      .from("contas_pagar")
      .insert(rows)
      .select("id, parcela_numero")
      .order("parcela_numero", { ascending: true });

    if (error) throw new Error(error.message);

    const createdId = data?.[0]?.id as string | undefined;
    if (!createdId) {
      throw new Error("Erro ao criar conta a pagar.");
    }

    const detail = await this.getById(createdId);
    if (!detail) {
      throw new Error("Erro ao carregar conta a pagar criada.");
    }

    return detail;
  }

  async update(
    id: string,
    input: UpdateContaPagarInput,
  ): Promise<ContaPagarDetail> {
    const current = await this.getById(id);

    if (!current) {
      throw new Error("Conta a pagar não encontrada.");
    }

    if (!canEditContaPagar(current)) {
      throw new Error(
        "Somente contas em aberto, vencidas ou parciais podem ser editadas.",
      );
    }

    const { data, error } = await this.supabase
      .from("contas_pagar")
      .update(buildContaPagarPayload(input as CreateContaPagarInput))
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    const detail = await this.getById(data.id);
    if (!detail) {
      throw new Error("Erro ao carregar conta a pagar atualizada.");
    }

    return detail;
  }

  async updateClassificacao(
    id: string,
    input: ClassificacaoContaPagarInput,
  ): Promise<ContaPagarDetail> {
    const current = await this.getById(id);

    if (!current) {
      throw new Error("Conta a pagar não encontrada.");
    }

    if (!canEditClassificacaoContaPagar(current)) {
      throw new Error(
        "Somente contas não canceladas permitem corrigir a classificação.",
      );
    }

    const { data, error } = await this.supabase
      .from("contas_pagar")
      .update({
        categoria_financeira_id: input.categoria_financeira_id,
        centro_custo_id: input.centro_custo_id,
        plano_conta_id: input.plano_conta_id,
        data_competencia: input.data_competencia,
      })
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    const detail = await this.getById(data.id);
    if (!detail) {
      throw new Error("Erro ao carregar conta a pagar atualizada.");
    }

    return detail;
  }

  async pagar(id: string, input: PagarContaInput): Promise<ContaPagarDetail> {
    await baixarContaPagarAtomico(this.supabase, {
      tenantId: this.tenantId,
      contaPagarId: id,
      dataPagamento: input.data_pagamento,
      contaBancariaId: input.conta_bancaria_id,
      valorPagamento: input.valor_pagamento,
      desconto: input.desconto,
      juros: input.juros,
      multa: input.multa,
      formaPagamentoId: input.forma_pagamento_id,
    });

    const detail = await this.getById(id);
    if (!detail) {
      throw new Error("Erro ao carregar conta após baixa.");
    }

    return detail;
  }

  async cancelar(id: string): Promise<ContaPagarDetail> {
    const current = await this.getById(id);

    if (!current) {
      throw new Error("Conta a pagar não encontrada.");
    }

    if (!canCancelarContaPagar(current)) {
      throw new Error("Esta conta não pode ser cancelada no status atual.");
    }

    if (current.status === "pago") {
      throw new Error("Conta paga não pode ser cancelada. Estorne manualmente.");
    }

    const { data, error } = await this.supabase
      .from("contas_pagar")
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
      throw new Error("Conta a pagar não encontrada.");
    }

    if (current.status !== "cancelado") {
      throw new Error("Somente contas canceladas podem ser excluídas.");
    }

    const { error } = await this.supabase
      .from("contas_pagar")
      .update({ deleted_at: new Date().toISOString() })
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);
  }

  async listFornecedores(): Promise<FornecedorOption[]> {
    const { data, error } = await this.supabase
      .from("fornecedores")
      .select("id, nome, documento")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (error) throw new Error(error.message);

    return (data ?? []) as FornecedorOption[];
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
      .in("tipo", ["despesa", "ambos"])
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

  async listPlanoContas(): Promise<PlanoContaOption[]> {
    const { data, error } = await this.supabase
      .from("plano_contas")
      .select("id, codigo, nome")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("ativo", true)
      .eq("aceita_lancamento", true)
      .in("tipo", ["despesa", "passivo"])
      .order("codigo", { ascending: true });

    if (error) throw new Error(error.message);

    return (data ?? []) as PlanoContaOption[];
  }

  async listContasBancarias(): Promise<ContaBancariaOption[]> {
    const { data, error } = await this.supabase
      .from("contas_bancarias")
      .select("id, nome")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (error) throw new Error(error.message);

    return (data ?? []) as ContaBancariaOption[];
  }
}

export async function createContaPagarService(tenantId: string) {
  const supabase = await createClient();
  return new ContaPagarService(supabase, tenantId);
}
