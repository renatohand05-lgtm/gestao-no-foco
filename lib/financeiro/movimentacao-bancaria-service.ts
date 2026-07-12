import type { SupabaseClient } from "@supabase/supabase-js";

import {
  FINANCEIRO_DEFAULT_PER_PAGE,
  FINANCEIRO_MAX_PER_PAGE,
} from "@/lib/financeiro/constants";
import { buildTransferenciaBancariaPayload } from "@/lib/financeiro/mappers";
import {
  estornarMovimentacaoBancariaAtomico,
  registrarMovimentacaoBancariaAtomico,
  transferirEntreContasAtomico,
} from "@/lib/financeiro/movimentacao-bancaria-rpc";
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

  async create(
    input: CreateMovimentacaoBancariaInput,
    createdBy: string | null,
  ): Promise<MovimentacaoBancariaDetail> {
    const movimentacaoId = await registrarMovimentacaoBancariaAtomico(
      this.supabase,
      {
        tenantId: this.tenantId,
        contaBancariaId: input.conta_bancaria_id,
        tipo: input.tipo,
        valor: input.valor,
        dataMovimentacao: input.data_movimentacao,
        descricao: input.descricao,
        origem: input.origem ?? "manual",
        contaPagarId: input.conta_pagar_id,
        contaReceberId: input.conta_receber_id,
        observacoes: input.observacoes,
        createdBy,
      },
    );

    const detail = await this.getById(movimentacaoId);
    if (!detail) {
      throw new Error("Erro ao carregar movimentação criada.");
    }

    return detail;
  }

  async createTransferencia(
    input: CreateTransferenciaBancariaInput,
    createdBy: string | null,
  ): Promise<{ enviada: MovimentacaoBancariaDetail; recebida: MovimentacaoBancariaDetail }> {
    const base = buildTransferenciaBancariaPayload(input);
    const result = await transferirEntreContasAtomico(this.supabase, {
      tenantId: this.tenantId,
      contaOrigemId: input.conta_origem_id,
      contaDestinoId: input.conta_destino_id,
      valor: input.valor,
      dataMovimentacao: base.data_movimentacao,
      descricao: base.descricao,
      observacoes: base.observacoes,
      createdBy,
    });

    const [enviada, recebida] = await Promise.all([
      this.getById(result.enviada_id),
      this.getById(result.recebida_id),
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
    const estornoId = await estornarMovimentacaoBancariaAtomico(this.supabase, {
      tenantId: this.tenantId,
      movimentacaoId,
      dataMovimentacao: input.data_movimentacao,
      observacoes: input.observacoes,
      createdBy,
    });

    const detail = await this.getById(estornoId);
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

    // Movimentações alteram saldo_atual; exclusão (soft-delete) sem estorno
    // deixaria o caixa inconsistente. Reversão somente via estorno.
    throw new Error(
      "Movimentações bancárias não podem ser excluídas. Utilize o estorno para reverter o efeito no saldo.",
    );
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
