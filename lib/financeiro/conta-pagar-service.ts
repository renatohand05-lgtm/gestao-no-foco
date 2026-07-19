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
  canEstornarContaPagar,
  canSoftDeleteContaPagar,
  resolveStatusExibicao,
  splitValorParcelas,
  todayISO,
} from "@/lib/financeiro/conta-pagar-utils";
import type { ParcelScope } from "@/lib/financeiro/conta-lifecycle";
import {
  listFinanceiroLancamentoEvents,
  recordFinanceiroLancamentoEvent,
} from "@/lib/financeiro/financeiro-eventos";
import { buildContaPagarPayload } from "@/lib/financeiro/mappers";
import { normalizeRateioLines } from "@/lib/financeiro/conta-pagar-rateio";
import {
  baixarContaPagarAtomico,
  estornarMovimentacaoBancariaAtomico,
} from "@/lib/financeiro/movimentacao-bancaria-rpc";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  CategoriaFinanceiraOption,
  CentroCustoOption,
  ClassificacaoContaPagarInput,
  ContaBancariaOption,
  ContaPagarDetail,
  ContaPagarListItem,
  ContaPagarRateioLine,
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
  grupo_parcelamento_id,
  parcela_numero,
  parcela_total,
  created_at,
  fornecedor:fornecedores ( id, nome, documento )
`;

const DETAIL_SELECT = `
  *,
  fornecedor:fornecedores ( id, nome, documento ),
  forma_pagamento:formas_pagamento ( id, nome ),
  categoria_financeira:categorias_financeiras ( id, nome, dre_linha ),
  centro_custo:centros_custo ( id, nome, codigo ),
  plano_conta:plano_contas ( id, nome, codigo, dre_linha ),
  conta_bancaria:contas_bancarias ( id, nome ),
  rateios:contas_pagar_rateios ( id, centro_custo_id, percentual, valor, descricao, deleted_at, centro_custo:centros_custo ( id, nome, codigo ) )
`;

/** Fallback quando a coluna descricao ainda não existe no remoto. */
const DETAIL_SELECT_WITHOUT_RATEIO_DESCRICAO = `
  *,
  fornecedor:fornecedores ( id, nome, documento ),
  forma_pagamento:formas_pagamento ( id, nome ),
  categoria_financeira:categorias_financeiras ( id, nome, dre_linha ),
  centro_custo:centros_custo ( id, nome, codigo ),
  plano_conta:plano_contas ( id, nome, codigo, dre_linha ),
  conta_bancaria:contas_bancarias ( id, nome ),
  rateios:contas_pagar_rateios ( id, centro_custo_id, percentual, valor, deleted_at, centro_custo:centros_custo ( id, nome, codigo ) )
`;

const DETAIL_SELECT_WITHOUT_RATEIOS = `
  *,
  fornecedor:fornecedores ( id, nome, documento ),
  forma_pagamento:formas_pagamento ( id, nome ),
  categoria_financeira:categorias_financeiras ( id, nome, dre_linha ),
  centro_custo:centros_custo ( id, nome, codigo ),
  plano_conta:plano_contas ( id, nome, codigo, dre_linha ),
  conta_bancaria:contas_bancarias ( id, nome )
`;

function isMissingRateioDescricaoError(message: string) {
  const m = message.toLowerCase();
  return m.includes("descricao") && m.includes("rateio");
}

function isMissingRateioTableError(message: string) {
  return message.toLowerCase().includes("contas_pagar_rateios");
}

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

function mapDetail(
  row: Omit<ContaPagarDetail, "status_exibicao" | "rateios"> & {
    rateios?: Array<{
      id: string;
      centro_custo_id: string;
      percentual: number;
      valor: number;
      descricao: string | null;
      deleted_at: string | null;
      centro_custo?: { id: string; nome: string; codigo: string } | null;
    }> | null;
  },
): ContaPagarDetail {
  const rateios: ContaPagarRateioLine[] = (row.rateios ?? [])
    .filter((r) => !r.deleted_at)
    .map((r) => ({
      id: r.id,
      centro_custo_id: r.centro_custo_id,
      percentual: Number(r.percentual),
      valor: Number(r.valor),
      descricao: r.descricao,
      centro_custo: r.centro_custo ?? null,
    }));

  return {
    ...row,
    rateios,
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
    const run = (select: string) =>
      this.supabase
        .from("contas_pagar")
        .select(select)
        .eq("tenant_id", this.tenantId)
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();

    let { data, error } = await run(DETAIL_SELECT);

    if (error && isMissingRateioDescricaoError(error.message)) {
      ({ data, error } = await run(DETAIL_SELECT_WITHOUT_RATEIO_DESCRICAO));
    }

    if (error && isMissingRateioTableError(error.message)) {
      ({ data, error } = await run(DETAIL_SELECT_WITHOUT_RATEIOS));
    }

    if (error) throw new Error(error.message);
    if (!data) return null;

    return mapDetail(data as never);
  }

  /**
   * Substitui rateios ativos (soft-delete + insert).
   * Linhas vazias = remove rateio (conta volta ao centro único).
   */
  async replaceRateios(
    contaId: string,
    lines: NonNullable<CreateContaPagarInput["rateios"]>,
    valorOriginal: number,
  ): Promise<void> {
    const normalized = normalizeRateioLines(valorOriginal, lines ?? []);

    if (normalized.length > 0) {
      const centroIds = [...new Set(normalized.map((l) => l.centro_custo_id))];
      const { data: centros, error: centrosError } = await this.supabase
        .from("centros_custo")
        .select("id")
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .eq("ativo", true)
        .in("id", centroIds);

      if (centrosError) throw new Error(centrosError.message);
      if ((centros ?? []).length !== centroIds.length) {
        throw new Error(
          "Centro de custo inválido, inativo ou de outro tenant no rateio.",
        );
      }
    }

    const now = new Date().toISOString();
    const { error: softError } = await this.supabase
      .from("contas_pagar_rateios" as never)
      .update({ deleted_at: now } as never)
      .eq("tenant_id", this.tenantId)
      .eq("conta_pagar_id", contaId)
      .is("deleted_at", null);

    if (softError) throw new Error(softError.message);

    if (normalized.length === 0) return;

    const rowsWithDescricao = normalized.map((line) => ({
      tenant_id: this.tenantId,
      conta_pagar_id: contaId,
      centro_custo_id: line.centro_custo_id,
      percentual: line.percentual,
      valor: line.valor,
      descricao: line.descricao,
    }));

    let { error: insertError } = await this.supabase
      .from("contas_pagar_rateios" as never)
      .insert(rowsWithDescricao as never);

    if (
      insertError &&
      isMissingRateioDescricaoError(insertError.message)
    ) {
      ({ error: insertError } = await this.supabase
        .from("contas_pagar_rateios" as never)
        .insert(
          normalized.map((line) => ({
            tenant_id: this.tenantId,
            conta_pagar_id: contaId,
            centro_custo_id: line.centro_custo_id,
            percentual: line.percentual,
            valor: line.valor,
          })) as never,
        ));
    }

    if (insertError) throw new Error(insertError.message);
  }

  async create(input: CreateContaPagarInput): Promise<ContaPagarDetail> {
    const parcelas = Math.max(input.parcelas ?? 1, 1);
    const grupoId = parcelas > 1 ? crypto.randomUUID() : null;
    const valores = splitValorParcelas(input.valor_original, parcelas);
    const rateios = input.rateios;

    const rows = valores.map((valor, index) => ({
      tenant_id: this.tenantId,
      ...buildContaPagarPayload({
        ...input,
        valor_original: valor,
        data_vencimento:
          index === 0
            ? input.data_vencimento
            : addMonths(input.data_vencimento, index),
        data_competencia:
          index === 0
            ? input.data_competencia
            : addMonths(input.data_competencia, index),
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
      .select("id, parcela_numero, valor_original")
      .order("parcela_numero", { ascending: true });

    if (error) throw new Error(error.message);

    const created = data ?? [];
    const createdId = created[0]?.id as string | undefined;
    if (!createdId) {
      throw new Error("Erro ao criar conta a pagar.");
    }

    if (rateios && rateios.length > 0) {
      for (const parcela of created) {
        await this.replaceRateios(
          parcela.id as string,
          rateios,
          Number(parcela.valor_original),
        );
      }
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

    if (current.status === "cancelado") {
      throw new Error("Conta cancelada não admite alteração.");
    }

    if (!canEditContaPagar(current)) {
      throw new Error(
        "Somente contas em aberto, vencidas ou parciais podem ser editadas.",
      );
    }

    const { rateios, ...rest } = input;
    const { data, error } = await this.supabase
      .from("contas_pagar")
      .update(buildContaPagarPayload(rest as CreateContaPagarInput))
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .select("id, valor_original")
      .single();

    if (error) throw new Error(error.message);

    if (rateios !== undefined) {
      await this.replaceRateios(
        id,
        rateios ?? [],
        Number(data.valor_original),
      );
    }

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

  async cancelar(
    id: string,
    options: {
      motivo?: string | null;
      userId?: string | null;
      scope?: ParcelScope;
    } = {},
  ): Promise<ContaPagarDetail> {
    const current = await this.getById(id);

    if (!current) {
      throw new Error("Conta a pagar não encontrada.");
    }

    if (!canCancelarContaPagar(current)) {
      if (canEstornarContaPagar(current)) {
        throw new Error(
          "Conta com pagamento não pode ser cancelada. Estorne o pagamento antes.",
        );
      }
      throw new Error("Esta conta não pode ser cancelada no status atual.");
    }

    const ids = await this.resolveParcelIds(current, options.scope ?? "atual");

    for (const parcelId of ids) {
      const parcel = await this.getById(parcelId);
      if (!parcel) continue;
      if (!canCancelarContaPagar(parcel)) continue;

      const { error } = await this.supabase
        .from("contas_pagar")
        .update({ status: "cancelado" })
        .eq("tenant_id", this.tenantId)
        .eq("id", parcelId)
        .is("deleted_at", null);

      if (error) throw new Error(error.message);

      await recordFinanceiroLancamentoEvent(this.supabase, {
        tenantId: this.tenantId,
        entityType: "conta_pagar",
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
      throw new Error("Conta a pagar não encontrada.");
    }

    if (!canSoftDeleteContaPagar(current)) {
      if (canEstornarContaPagar(current)) {
        throw new Error(
          "Conta com pagamento não pode ser excluída. Estorne o pagamento antes de cancelar/excluir.",
        );
      }
      throw new Error("Esta conta não pode ser excluída no status atual.");
    }

    const activeMoves = await this.countActiveBaixas(id);
    if (activeMoves > 0) {
      throw new Error(
        "Existem movimentações bancárias ativas vinculadas. Estorne antes de excluir.",
      );
    }

    const ids = await this.resolveParcelIds(current, options.scope ?? "atual");
    const now = new Date().toISOString();

    for (const parcelId of ids) {
      const parcel = await this.getById(parcelId);
      if (!parcel || !canSoftDeleteContaPagar(parcel)) continue;
      if ((await this.countActiveBaixas(parcelId)) > 0) continue;

      const { error } = await this.supabase
        .from("contas_pagar")
        .update({ deleted_at: now })
        .eq("tenant_id", this.tenantId)
        .eq("id", parcelId)
        .is("deleted_at", null);

      if (error) throw new Error(error.message);

      await recordFinanceiroLancamentoEvent(this.supabase, {
        tenantId: this.tenantId,
        entityType: "conta_pagar",
        entityId: parcelId,
        action: "soft_delete",
        motivo: options.motivo,
        payloadAntes: { status: parcel.status, deleted_at: null },
        payloadDepois: { deleted_at: now },
        userId: options.userId,
      });
    }
  }

  async estornarBaixas(
    id: string,
    input: { motivo: string; data_estorno?: string; userId?: string | null },
  ): Promise<ContaPagarDetail> {
    const motivo = input.motivo?.trim();
    if (!motivo || motivo.length < 3) {
      throw new Error("Informe o motivo do estorno (mínimo 3 caracteres).");
    }

    const current = await this.getById(id);
    if (!current) throw new Error("Conta a pagar não encontrada.");
    if (!canEstornarContaPagar(current)) {
      throw new Error("Esta conta não possui pagamento para estornar.");
    }

    const { data: moves, error } = await this.supabase
      .from("movimentacoes_bancarias")
      .select("id, tipo, estornada_por_id, valor")
      .eq("tenant_id", this.tenantId)
      .eq("conta_pagar_id", id)
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
        observacoes: `Estorno CP ${current.numero}: ${motivo}`,
        createdBy: input.userId ?? null,
      });
    }

    const { error: reopenError } = await this.supabase
      .from("contas_pagar")
      .update({
        valor_pago: 0,
        status: "aberto",
        data_pagamento: null,
      })
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null);

    if (reopenError) throw new Error(reopenError.message);

    await recordFinanceiroLancamentoEvent(this.supabase, {
      tenantId: this.tenantId,
      entityType: "conta_pagar",
      entityId: id,
      action: "estorno",
      motivo,
      payloadAntes: {
        status: current.status,
        valor_pago: current.valor_pago,
        movimentacoes: ativos.map((m) => m.id),
      },
      payloadDepois: { status: "aberto", valor_pago: 0 },
      userId: input.userId,
    });

    const detail = await this.getById(id);
    if (!detail) throw new Error("Erro ao carregar conta após estorno.");
    return detail;
  }

  async duplicar(
    id: string,
    userId?: string | null,
  ): Promise<ContaPagarDetail> {
    const current = await this.getById(id);
    if (!current) throw new Error("Conta a pagar não encontrada.");

    const created = await this.create({
      fornecedor_id: current.fornecedor_id,
      fornecedor_nome: current.fornecedor_nome,
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
      rateios: (current.rateios ?? []).map((r) => ({
          centro_custo_id: r.centro_custo_id,
          percentual: r.percentual,
          descricao: r.descricao,
        })),
    });

    await recordFinanceiroLancamentoEvent(this.supabase, {
      tenantId: this.tenantId,
      entityType: "conta_pagar",
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
      entityType: "conta_pagar",
      entityId: id,
    });
  }

  private async countActiveBaixas(contaId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("movimentacoes_bancarias")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.tenantId)
      .eq("conta_pagar_id", contaId)
      .is("deleted_at", null)
      .is("estornada_por_id", null)
      .neq("tipo", "estorno");

    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  private async resolveParcelIds(
    current: ContaPagarDetail,
    scope: ParcelScope,
  ): Promise<string[]> {
    if (scope === "atual" || !current.grupo_parcelamento_id) {
      return [current.id];
    }

    let query = this.supabase
      .from("contas_pagar")
      .select("id, parcela_numero, status, valor_pago")
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
      .filter((row) => Number(row.valor_pago ?? 0) <= 0)
      .filter(
        (row) => row.status === "aberto" || row.status === "cancelado",
      )
      .map((row) => row.id as string);
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
      .select("id, nome, tipo, dre_linha")
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
      .select("id, codigo, nome, dre_linha")
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
