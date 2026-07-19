import type { SupabaseClient } from "@supabase/supabase-js";

import {
  FINANCEIRO_DEFAULT_PER_PAGE,
  FINANCEIRO_MAX_PER_PAGE,
} from "@/lib/financeiro/constants";
import {
  addMonths,
  calcSaldoPendente,
  canCancelarContaReceber,
  canEditClassificacaoContaReceber,
  canEditContaReceber,
  canEstornarContaReceber,
  canSoftDeleteContaReceber,
  resolveStatusExibicao,
  splitValorParcelas,
  todayISO,
} from "@/lib/financeiro/conta-receber-utils";
import type { ParcelScope } from "@/lib/financeiro/conta-lifecycle";
import {
  listFinanceiroLancamentoEvents,
  recordFinanceiroLancamentoEvent,
} from "@/lib/financeiro/financeiro-eventos";
import { buildContaReceberPayload } from "@/lib/financeiro/mappers";
import {
  baixarContaReceberAtomico,
  estornarMovimentacaoBancariaAtomico,
} from "@/lib/financeiro/movimentacao-bancaria-rpc";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  CategoriaFinanceiraOption,
  CentroCustoOption,
  ClassificacaoContaReceberInput,
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
  PlanoContaOption,
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
  data_competencia,
  data_vencimento,
  data_recebimento,
  conta_bancaria_id,
  grupo_parcelamento_id,
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
  centro_custo:centros_custo ( id, nome, codigo ),
  plano_conta:plano_contas ( id, nome, codigo ),
  conta_bancaria:contas_bancarias ( id, nome )
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
      .select("id, parcela_numero")
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

  async updateClassificacao(
    id: string,
    input: ClassificacaoContaReceberInput,
  ): Promise<ContaReceberDetail> {
    const current = await this.getById(id);

    if (!current) {
      throw new Error("Conta a receber não encontrada.");
    }

    if (!canEditClassificacaoContaReceber(current)) {
      throw new Error(
        "Somente contas não canceladas permitem corrigir a classificação.",
      );
    }

    const { data, error } = await this.supabase
      .from("contas_receber")
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
      throw new Error("Erro ao carregar conta a receber atualizada.");
    }

    return detail;
  }

  async receber(id: string, input: ReceberContaInput): Promise<ContaReceberDetail> {
    await baixarContaReceberAtomico(this.supabase, {
      tenantId: this.tenantId,
      contaReceberId: id,
      dataRecebimento: input.data_recebimento,
      contaBancariaId: input.conta_bancaria_id,
      valorRecebido: input.valor_recebido,
      desconto: input.desconto,
      juros: input.juros,
      multa: input.multa,
    });

    const detail = await this.getById(id);
    if (!detail) {
      throw new Error("Erro ao carregar conta após baixa.");
    }

    return detail;
  }

  async cancelar(
    id: string,
    options: {
      motivo?: string | null;
      userId?: string | null;
      scope?: ParcelScope;
    } = {},
  ): Promise<ContaReceberDetail> {
    const current = await this.getById(id);

    if (!current) {
      throw new Error("Conta a receber não encontrada.");
    }

    if (!canCancelarContaReceber(current)) {
      if (canEstornarContaReceber(current)) {
        throw new Error(
          "Conta com recebimento não pode ser cancelada. Estorne o recebimento antes.",
        );
      }
      throw new Error("Esta conta não pode ser cancelada no status atual.");
    }

    const ids = await this.resolveParcelIds(current, options.scope ?? "atual");

    for (const parcelId of ids) {
      const parcel = await this.getById(parcelId);
      if (!parcel || !canCancelarContaReceber(parcel)) continue;

      const { error } = await this.supabase
        .from("contas_receber")
        .update({ status: "cancelado" })
        .eq("tenant_id", this.tenantId)
        .eq("id", parcelId)
        .is("deleted_at", null);

      if (error) throw new Error(error.message);

      await recordFinanceiroLancamentoEvent(this.supabase, {
        tenantId: this.tenantId,
        entityType: "conta_receber",
        entityId: parcelId,
        action: "cancelamento",
        motivo: options.motivo,
        payloadAntes: { status: parcel.status },
        payloadDepois: { status: "cancelado" },
        userId: options.userId,
      });
    }

    const detail = await this.getById(id);
    if (!detail) {
      throw new Error("Erro ao carregar conta após cancelamento.");
    }

    return detail;
  }

  async softDelete(
    id: string,
    options: {
      motivo?: string | null;
      userId?: string | null;
      scope?: ParcelScope;
    } = {},
  ): Promise<void> {
    const current = await this.getById(id);

    if (!current) {
      throw new Error("Conta a receber não encontrada.");
    }

    if (!canSoftDeleteContaReceber(current)) {
      if (canEstornarContaReceber(current)) {
        throw new Error(
          "Conta com recebimento não pode ser excluída. Estorne o recebimento antes.",
        );
      }
      throw new Error("Esta conta não pode ser excluída no status atual.");
    }

    if ((await this.countActiveBaixas(id)) > 0) {
      throw new Error(
        "Existem movimentações bancárias ativas vinculadas. Estorne antes de excluir.",
      );
    }

    const ids = await this.resolveParcelIds(current, options.scope ?? "atual");
    const now = new Date().toISOString();

    for (const parcelId of ids) {
      const parcel = await this.getById(parcelId);
      if (!parcel || !canSoftDeleteContaReceber(parcel)) continue;
      if ((await this.countActiveBaixas(parcelId)) > 0) continue;

      const { error } = await this.supabase
        .from("contas_receber")
        .update({ deleted_at: now })
        .eq("tenant_id", this.tenantId)
        .eq("id", parcelId)
        .is("deleted_at", null);

      if (error) throw new Error(error.message);

      await recordFinanceiroLancamentoEvent(this.supabase, {
        tenantId: this.tenantId,
        entityType: "conta_receber",
        entityId: parcelId,
        action: "soft_delete",
        motivo: options.motivo,
        payloadAntes: { status: parcel.status },
        payloadDepois: { deleted_at: now },
        userId: options.userId,
      });
    }
  }

  async estornarBaixas(
    id: string,
    input: { motivo: string; data_estorno?: string; userId?: string | null },
  ): Promise<ContaReceberDetail> {
    const motivo = input.motivo?.trim();
    if (!motivo || motivo.length < 3) {
      throw new Error("Informe o motivo do estorno (mínimo 3 caracteres).");
    }

    const current = await this.getById(id);
    if (!current) throw new Error("Conta a receber não encontrada.");
    if (!canEstornarContaReceber(current)) {
      throw new Error("Esta conta não possui recebimento para estornar.");
    }

    const { data: moves, error } = await this.supabase
      .from("movimentacoes_bancarias")
      .select("id, tipo, estornada_por_id, valor")
      .eq("tenant_id", this.tenantId)
      .eq("conta_receber_id", id)
      .is("deleted_at", null)
      .is("estornada_por_id", null)
      .neq("tipo", "estorno");

    if (error) throw new Error(error.message);

    const ativos = moves ?? [];
    if (ativos.length === 0) {
      throw new Error("Nenhuma movimentação ativa encontrada para estornar.");
    }

    const dataEstorno = input.data_estorno || todayISO();

    for (const move of ativos) {
      await estornarMovimentacaoBancariaAtomico(this.supabase, {
        tenantId: this.tenantId,
        movimentacaoId: move.id,
        dataMovimentacao: dataEstorno,
        observacoes: `Estorno CR ${current.numero}: ${motivo}`,
        createdBy: input.userId ?? null,
      });
    }

    const { error: reopenError } = await this.supabase
      .from("contas_receber")
      .update({
        valor_recebido: 0,
        status: "aberto",
        data_recebimento: null,
      })
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null);

    if (reopenError) throw new Error(reopenError.message);

    await recordFinanceiroLancamentoEvent(this.supabase, {
      tenantId: this.tenantId,
      entityType: "conta_receber",
      entityId: id,
      action: "estorno",
      motivo,
      payloadAntes: {
        status: current.status,
        valor_recebido: current.valor_recebido,
        movimentacoes: ativos.map((m) => m.id),
      },
      payloadDepois: { status: "aberto", valor_recebido: 0 },
      userId: input.userId,
    });

    const detail = await this.getById(id);
    if (!detail) throw new Error("Erro ao carregar conta após estorno.");
    return detail;
  }

  async duplicar(
    id: string,
    userId?: string | null,
  ): Promise<ContaReceberDetail> {
    const current = await this.getById(id);
    if (!current) throw new Error("Conta a receber não encontrada.");

    const created = await this.create({
      cliente_id: current.cliente_id,
      venda_id: null,
      forma_pagamento_id: current.forma_pagamento_id,
      categoria_financeira_id: current.categoria_financeira_id!,
      centro_custo_id: current.centro_custo_id!,
      plano_conta_id: current.plano_conta_id!,
      descricao: `${current.descricao} (cópia)`,
      valor_original: current.valor_original,
      desconto: current.desconto,
      juros: current.juros,
      multa: current.multa,
      data_emissao: todayISO(),
      data_competencia: current.data_competencia,
      data_vencimento: current.data_vencimento,
      parcelas: 1,
      observacoes: current.observacoes,
    });

    await recordFinanceiroLancamentoEvent(this.supabase, {
      tenantId: this.tenantId,
      entityType: "conta_receber",
      entityId: created.id,
      action: "duplicacao",
      motivo: `Duplicado de ${current.id}`,
      payloadAntes: { origem_id: current.id },
      payloadDepois: { id: created.id },
      userId,
    });

    return created;
  }

  async listEventos(id: string) {
    return listFinanceiroLancamentoEvents(this.supabase, {
      tenantId: this.tenantId,
      entityType: "conta_receber",
      entityId: id,
    });
  }

  private async countActiveBaixas(contaId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("movimentacoes_bancarias")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.tenantId)
      .eq("conta_receber_id", contaId)
      .is("deleted_at", null)
      .is("estornada_por_id", null)
      .neq("tipo", "estorno");

    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  private async resolveParcelIds(
    current: ContaReceberDetail,
    scope: ParcelScope,
  ): Promise<string[]> {
    if (scope === "atual" || !current.grupo_parcelamento_id) {
      return [current.id];
    }

    let query = this.supabase
      .from("contas_receber")
      .select("id, parcela_numero, status, valor_recebido")
      .eq("tenant_id", this.tenantId)
      .eq("grupo_parcelamento_id", current.grupo_parcelamento_id)
      .is("deleted_at", null)
      .order("parcela_numero", { ascending: true });

    if (scope === "atual_e_proximas") {
      query = query.gte("parcela_numero", current.parcela_numero);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (data ?? [])
      .filter((row) => Number(row.valor_recebido ?? 0) <= 0)
      .filter(
        (row) => row.status === "aberto" || row.status === "cancelado",
      )
      .map((row) => row.id as string);
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

  async listPlanoContas(): Promise<PlanoContaOption[]> {
    const { data, error } = await this.supabase
      .from("plano_contas")
      .select("id, codigo, nome")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("ativo", true)
      .in("tipo", ["receita", "ativo"])
      .order("codigo", { ascending: true });

    if (error) throw new Error(error.message);

    return (data ?? []) as PlanoContaOption[];
  }

  async listContasBancarias(): Promise<{ id: string; nome: string }[]> {
    const { data, error } = await this.supabase
      .from("contas_bancarias")
      .select("id, nome")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (error) throw new Error(error.message);

    return data ?? [];
  }
}

export async function createContaReceberService(tenantId: string) {
  const supabase = await createClient();
  return new ContaReceberService(supabase, tenantId);
}
