import type { SupabaseClient } from "@supabase/supabase-js";

import {
  FINANCEIRO_DEFAULT_PER_PAGE,
  FINANCEIRO_MAX_PER_PAGE,
} from "@/lib/financeiro/constants";
import {
  buildMovimentacaoBancariaPayload,
  buildTransferenciaBancariaPayload,
} from "@/lib/financeiro/mappers";
import {
  calcDeltaSaldo,
  calcNovoSaldoBancario,
  calcValorEstorno,
  isMovimentacaoEstornavel,
} from "@/lib/financeiro/movimentacao-bancaria-utils";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { SortOrder } from "@/types/financeiro";
import type {
  CreateMovimentacaoBancariaInput,
  CreateTransferenciaBancariaInput,
  EstornarMovimentacaoBancariaInput,
  ListMovimentacoesBancariasParams,
  MovimentacaoBancariaDetail,
  MovimentacaoBancariaListItem,
  MovimentacaoBancariaSortField,
  PaginatedResult,
} from "@/types/movimentacoes-bancarias";

const LIST_SELECT = `
  *,
  conta_bancaria:contas_bancarias!movimentacoes_bancarias_conta_bancaria_id_fkey (
    id, nome, tipo, banco
  ),
  conta_contrapartida:contas_bancarias!movimentacoes_bancarias_conta_bancaria_contrapartida_id_fkey (
    id, nome, tipo, banco
  )
`;

const DETAIL_SELECT = LIST_SELECT;

function resolveSort(
  sort?: MovimentacaoBancariaSortField,
  order?: SortOrder,
): { column: MovimentacaoBancariaSortField; ascending: boolean } {
  const allowed: MovimentacaoBancariaSortField[] = [
    "created_at",
    "data_movimentacao",
    "tipo",
    "valor",
    "saldo_novo",
  ];
  const column = allowed.includes(sort ?? "created_at")
    ? (sort ?? "created_at")
    : "created_at";
  const ascending = order === "asc";

  return { column, ascending };
}

export class MovimentacaoBancariaService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async list(
    params: ListMovimentacoesBancariasParams = {},
  ): Promise<PaginatedResult<MovimentacaoBancariaListItem>> {
    const page = Math.max(params.page ?? 1, 1);
    const perPage = Math.min(
      Math.max(params.perPage ?? FINANCEIRO_DEFAULT_PER_PAGE, 1),
      FINANCEIRO_MAX_PER_PAGE,
    );
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    const search = params.search?.trim();
    const { column, ascending } = resolveSort(params.sort, params.order);

    let query = this.supabase
      .from("movimentacoes_bancarias")
      .select(LIST_SELECT, { count: "exact" })
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .order(column, { ascending });

    if (search) {
      query = query.or(
        `descricao.ilike.%${search}%,observacoes.ilike.%${search}%`,
      );
    }

    if (params.tipo && params.tipo !== "all") {
      query = query.eq("tipo", params.tipo);
    }

    if (params.origem && params.origem !== "all") {
      query = query.eq("origem", params.origem);
    }

    if (params.contaBancariaId) {
      query = query.eq("conta_bancaria_id", params.contaBancariaId);
    }

    if (params.dataDe) {
      query = query.gte("data_movimentacao", params.dataDe);
    }

    if (params.dataAte) {
      query = query.lte("data_movimentacao", params.dataAte);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) throw new Error(error.message);

    const total = count ?? 0;

    return {
      data: (data ?? []) as MovimentacaoBancariaListItem[],
      total,
      page,
      perPage,
      totalPages: Math.max(Math.ceil(total / perPage), 1),
    };
  }

  async getById(id: string): Promise<MovimentacaoBancariaDetail | null> {
    const { data, error } = await this.supabase
      .from("movimentacoes_bancarias")
      .select(DETAIL_SELECT)
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);

    return (data as MovimentacaoBancariaDetail | null) ?? null;
  }

  private async getContaBancariaAtiva(contaBancariaId: string) {
    const { data, error } = await this.supabase
      .from("contas_bancarias")
      .select("id, nome, saldo_atual, ativo")
      .eq("tenant_id", this.tenantId)
      .eq("id", contaBancariaId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (!data) {
      throw new Error("Conta bancária não encontrada.");
    }

    if (!data.ativo) {
      throw new Error("Conta bancária inativa não aceita movimentações.");
    }

    return data;
  }

  private async atualizarSaldoConta(contaBancariaId: string, saldoNovo: number) {
    const { error } = await this.supabase
      .from("contas_bancarias")
      .update({ saldo_atual: saldoNovo })
      .eq("tenant_id", this.tenantId)
      .eq("id", contaBancariaId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);
  }

  private async inserirMovimentacao(
    payload: Database["public"]["Tables"]["movimentacoes_bancarias"]["Insert"],
    saldoNovo: number,
  ) {
    const { data, error } = await this.supabase
      .from("movimentacoes_bancarias")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("Esta movimentação já foi estornada.");
      }
      throw new Error(error.message);
    }

    await this.atualizarSaldoConta(
      payload.conta_bancaria_id as string,
      saldoNovo,
    );

    const detail = await this.getById(data.id);
    if (!detail) {
      throw new Error("Erro ao carregar movimentação criada.");
    }

    return detail;
  }

  async create(
    input: CreateMovimentacaoBancariaInput,
    createdBy: string | null,
  ): Promise<MovimentacaoBancariaDetail> {
    const conta = await this.getContaBancariaAtiva(input.conta_bancaria_id);
    const saldoAnterior = Number(conta.saldo_atual ?? 0);

    if (input.tipo !== "ajuste" && input.valor <= 0) {
      throw new Error("Informe um valor maior que zero.");
    }

    if (input.tipo === "ajuste" && input.valor < 0) {
      throw new Error("Informe um saldo de ajuste válido.");
    }

    const saldoNovo = calcNovoSaldoBancario({
      tipo: input.tipo,
      valor: input.valor,
      saldoAnterior,
    });

    if (input.tipo === "saida" && saldoNovo < 0) {
      throw new Error("Saldo insuficiente para esta saída.");
    }

    return this.inserirMovimentacao(
      {
        tenant_id: this.tenantId,
        ...buildMovimentacaoBancariaPayload(input),
        saldo_anterior: saldoAnterior,
        saldo_novo: saldoNovo,
        origem: input.origem ?? "manual",
        created_by: createdBy,
      },
      saldoNovo,
    );
  }

  async createTransferencia(
    input: CreateTransferenciaBancariaInput,
    createdBy: string | null,
  ): Promise<{ enviada: MovimentacaoBancariaDetail; recebida: MovimentacaoBancariaDetail }> {
    if (input.conta_origem_id === input.conta_destino_id) {
      throw new Error("Selecione contas diferentes para a transferência.");
    }

    if (input.valor <= 0) {
      throw new Error("Informe um valor maior que zero.");
    }

    const [origem, destino] = await Promise.all([
      this.getContaBancariaAtiva(input.conta_origem_id),
      this.getContaBancariaAtiva(input.conta_destino_id),
    ]);

    const saldoOrigemAnterior = Number(origem.saldo_atual ?? 0);
    const saldoDestinoAnterior = Number(destino.saldo_atual ?? 0);

    if (input.valor > saldoOrigemAnterior) {
      throw new Error("Saldo insuficiente na conta de origem.");
    }

    const saldoOrigemNovo = saldoOrigemAnterior - input.valor;
    const saldoDestinoNovo = saldoDestinoAnterior + input.valor;
    const grupoId = crypto.randomUUID();
    const base = buildTransferenciaBancariaPayload(input);

    const { data: enviadaRow, error: enviadaError } = await this.supabase
      .from("movimentacoes_bancarias")
      .insert({
        tenant_id: this.tenantId,
        conta_bancaria_id: input.conta_origem_id,
        conta_bancaria_contrapartida_id: input.conta_destino_id,
        grupo_transferencia_id: grupoId,
        tipo: "transferencia",
        transferencia_papel: "enviada",
        valor: input.valor,
        saldo_anterior: saldoOrigemAnterior,
        saldo_novo: saldoOrigemNovo,
        data_movimentacao: base.data_movimentacao,
        descricao: base.descricao,
        origem: "transferencia",
        observacoes: base.observacoes,
        created_by: createdBy,
      })
      .select("id")
      .single();

    if (enviadaError) throw new Error(enviadaError.message);

    const { data: recebidaRow, error: recebidaError } = await this.supabase
      .from("movimentacoes_bancarias")
      .insert({
        tenant_id: this.tenantId,
        conta_bancaria_id: input.conta_destino_id,
        conta_bancaria_contrapartida_id: input.conta_origem_id,
        grupo_transferencia_id: grupoId,
        tipo: "transferencia",
        transferencia_papel: "recebida",
        valor: input.valor,
        saldo_anterior: saldoDestinoAnterior,
        saldo_novo: saldoDestinoNovo,
        data_movimentacao: base.data_movimentacao,
        descricao: base.descricao,
        origem: "transferencia",
        observacoes: base.observacoes,
        created_by: createdBy,
      })
      .select("id")
      .single();

    if (recebidaError) {
      await this.supabase
        .from("movimentacoes_bancarias")
        .delete()
        .eq("id", enviadaRow.id);
      throw new Error(recebidaError.message);
    }

    await Promise.all([
      this.atualizarSaldoConta(input.conta_origem_id, saldoOrigemNovo),
      this.atualizarSaldoConta(input.conta_destino_id, saldoDestinoNovo),
    ]);

    const [enviada, recebida] = await Promise.all([
      this.getById(enviadaRow.id),
      this.getById(recebidaRow.id),
    ]);

    if (!enviada || !recebida) {
      throw new Error("Erro ao carregar transferência criada.");
    }

    return { enviada, recebida };
  }

  async estornar(
    movimentacaoId: string,
    input: EstornarMovimentacaoBancariaInput,
    createdBy: string | null,
  ): Promise<MovimentacaoBancariaDetail> {
    const original = await this.getById(movimentacaoId);

    if (!original) {
      throw new Error("Movimentação não encontrada.");
    }

    if (!isMovimentacaoEstornavel(original)) {
      throw new Error("Esta movimentação não pode ser estornada.");
    }

    const conta = await this.getContaBancariaAtiva(original.conta_bancaria_id);
    const saldoAnterior = Number(conta.saldo_atual ?? 0);
    const delta = calcDeltaSaldo(original);
    const saldoNovo = saldoAnterior - delta;
    const valor = calcValorEstorno(original);

    if (saldoNovo < 0) {
      throw new Error("Estorno resultaria em saldo negativo na conta.");
    }

    const { data: estornoRow, error: estornoError } = await this.supabase
      .from("movimentacoes_bancarias")
      .insert({
        tenant_id: this.tenantId,
        conta_bancaria_id: original.conta_bancaria_id,
        tipo: "estorno",
        valor,
        saldo_anterior: saldoAnterior,
        saldo_novo: saldoNovo,
        data_movimentacao: input.data_movimentacao,
        descricao: `Estorno: ${original.descricao}`,
        origem: "estorno",
        movimentacao_estornada_id: original.id,
        observacoes: input.observacoes ?? null,
        created_by: createdBy,
      })
      .select("id")
      .single();

    if (estornoError) {
      if (estornoError.code === "23505") {
        throw new Error("Esta movimentação já foi estornada.");
      }
      throw new Error(estornoError.message);
    }

    const { error: updateOriginalError } = await this.supabase
      .from("movimentacoes_bancarias")
      .update({ estornada_por_id: estornoRow.id })
      .eq("tenant_id", this.tenantId)
      .eq("id", original.id)
      .is("deleted_at", null);

    if (updateOriginalError) throw new Error(updateOriginalError.message);

    await this.atualizarSaldoConta(original.conta_bancaria_id, saldoNovo);

    const detail = await this.getById(estornoRow.id);
    if (!detail) {
      throw new Error("Erro ao carregar estorno criado.");
    }

    return detail;
  }

  async softDelete(id: string): Promise<void> {
    const movimentacao = await this.getById(id);

    if (!movimentacao) {
      throw new Error("Movimentação não encontrada.");
    }

    if (movimentacao.tipo === "estorno") {
      throw new Error("Estornos não podem ser excluídos diretamente.");
    }

    const { error } = await this.supabase
      .from("movimentacoes_bancarias")
      .update({ deleted_at: new Date().toISOString() })
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);
  }

  async listContasBancariasAtivas() {
    const { data, error } = await this.supabase
      .from("contas_bancarias")
      .select("id, nome, saldo_atual")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (error) throw new Error(error.message);

    return data ?? [];
  }
}

export async function createMovimentacaoBancariaService(tenantId: string) {
  const supabase = await createClient();
  return new MovimentacaoBancariaService(supabase, tenantId);
}
