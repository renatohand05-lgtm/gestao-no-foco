import type { SupabaseClient } from "@supabase/supabase-js";

import {
  FINANCEIRO_DEFAULT_PER_PAGE,
  FINANCEIRO_MAX_PER_PAGE,
} from "@/lib/financeiro/constants";
import { calcSaldoPendente as calcSaldoPendentePagar } from "@/lib/financeiro/conta-pagar-utils";
import { calcSaldoPendente as calcSaldoPendenteReceber } from "@/lib/financeiro/conta-receber-utils";
import { calcDeltaSaldo } from "@/lib/financeiro/movimentacao-bancaria-utils";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  FluxoCaixaContaSaldo,
  FluxoCaixaDailyPoint,
  FluxoCaixaFilterOptions,
  FluxoCaixaFilters,
  FluxoCaixaLancamento,
  FluxoCaixaListParams,
  FluxoCaixaResult,
  FluxoCaixaResumo,
  FluxoCaixaStatusFilter,
} from "@/types/fluxo-caixa";
import { paginateArray, toPaginatedResult } from "@/types/pagination";
import type { MovimentacaoBancariaTipo } from "@/types/movimentacoes-bancarias";

type TituloJoin = {
  id: string;
  categoria_financeira_id: string | null;
  centro_custo_id: string | null;
  categoria_financeira: { id: string; nome: string } | null;
  centro_custo: { id: string; nome: string } | null;
} | null;

type MovimentacaoRow = {
  id: string;
  tipo: MovimentacaoBancariaTipo;
  transferencia_papel: string | null;
  valor: number;
  saldo_anterior: number;
  saldo_novo: number;
  data_movimentacao: string;
  descricao: string;
  conta_bancaria_id: string;
  conta_receber_id: string | null;
  conta_pagar_id: string | null;
  conta_bancaria: { id: string; nome: string } | null;
  conta_receber: TituloJoin;
  conta_pagar: TituloJoin;
};

type ContaReceberPrevistoRow = {
  id: string;
  descricao: string;
  data_vencimento: string;
  valor_original: number;
  desconto: number;
  juros: number;
  multa: number;
  valor_recebido: number;
  conta_bancaria_id: string | null;
  categoria_financeira_id: string | null;
  centro_custo_id: string | null;
  conta_bancaria: { id: string; nome: string } | null;
  categoria_financeira: { id: string; nome: string } | null;
  centro_custo: { id: string; nome: string } | null;
};

type ContaPagarPrevistoRow = {
  id: string;
  descricao: string;
  data_vencimento: string;
  valor_original: number;
  desconto: number;
  juros: number;
  multa: number;
  valor_pago: number;
  conta_bancaria_id: string | null;
  categoria_financeira_id: string | null;
  centro_custo_id: string | null;
  conta_bancaria: { id: string; nome: string } | null;
  categoria_financeira: { id: string; nome: string } | null;
  centro_custo: { id: string; nome: string } | null;
};

const MOV_SELECT = `
  id,
  tipo,
  transferencia_papel,
  valor,
  saldo_anterior,
  saldo_novo,
  data_movimentacao,
  descricao,
  conta_bancaria_id,
  conta_receber_id,
  conta_pagar_id,
  conta_bancaria:contas_bancarias!movimentacoes_bancarias_conta_bancaria_id_fkey (
    id, nome
  ),
  conta_receber:contas_receber (
    id,
    categoria_financeira_id,
    centro_custo_id,
    categoria_financeira:categorias_financeiras ( id, nome ),
    centro_custo:centros_custo ( id, nome )
  ),
  conta_pagar:contas_pagar (
    id,
    categoria_financeira_id,
    centro_custo_id,
    categoria_financeira:categorias_financeiras ( id, nome ),
    centro_custo:centros_custo ( id, nome )
  )
`;

const CR_PREVISTO_SELECT = `
  id,
  descricao,
  data_vencimento,
  valor_original,
  desconto,
  juros,
  multa,
  valor_recebido,
  conta_bancaria_id,
  categoria_financeira_id,
  centro_custo_id,
  conta_bancaria:contas_bancarias ( id, nome ),
  categoria_financeira:categorias_financeiras ( id, nome ),
  centro_custo:centros_custo ( id, nome )
`;

const CP_PREVISTO_SELECT = `
  id,
  descricao,
  data_vencimento,
  valor_original,
  desconto,
  juros,
  multa,
  valor_pago,
  conta_bancaria_id,
  categoria_financeira_id,
  centro_custo_id,
  conta_bancaria:contas_bancarias ( id, nome ),
  categoria_financeira:categorias_financeiras ( id, nome ),
  centro_custo:centros_custo ( id, nome )
`;

function isEntradaDelta(
  tipo: MovimentacaoBancariaTipo,
  transferenciaPapel: string | null,
  delta: number,
): boolean {
  if (tipo === "entrada") return true;
  if (tipo === "ajuste") return delta > 0;
  if (tipo === "transferencia") return transferenciaPapel === "recebida";
  if (tipo === "estorno") return delta > 0;
  return false;
}

function eachDateInclusive(dataDe: string, dataAte: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${dataDe}T12:00:00`);
  const end = new Date(`${dataAte}T12:00:00`);

  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime())) {
    return dates;
  }

  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function resolveTituloCategoria(row: MovimentacaoRow): {
  id: string | null;
  nome: string | null;
} {
  const titulo = row.conta_receber ?? row.conta_pagar;
  return {
    id: titulo?.categoria_financeira_id ?? null,
    nome: titulo?.categoria_financeira?.nome ?? null,
  };
}

function resolveTituloCentro(row: MovimentacaoRow): {
  id: string | null;
  nome: string | null;
} {
  const titulo = row.conta_receber ?? row.conta_pagar;
  return {
    id: titulo?.centro_custo_id ?? null,
    nome: titulo?.centro_custo?.nome ?? null,
  };
}

function matchesCategoriaCentro(
  categoriaId: string | null | undefined,
  centroCustoId: string | null | undefined,
  filters: Pick<FluxoCaixaFilters, "categoriaId" | "centroCustoId">,
): boolean {
  if (filters.categoriaId) {
    if (!categoriaId || categoriaId !== filters.categoriaId) return false;
  }
  if (filters.centroCustoId) {
    if (!centroCustoId || centroCustoId !== filters.centroCustoId) return false;
  }
  return true;
}

function includeStatus(
  status: FluxoCaixaStatusFilter | undefined,
  natureza: "realizado" | "previsto",
): boolean {
  const resolved = status ?? "all";
  if (resolved === "all") return true;
  return resolved === natureza;
}

function paginateFluxoItens(
  allItens: FluxoCaixaLancamento[],
  params: FluxoCaixaListParams,
) {
  if (params.exportAll) {
    const total = allItens.length;
    return toPaginatedResult(allItens, total, 1, Math.max(total, 1));
  }

  const page = Number(params.page) > 0 ? Number(params.page) : 1;
  const perPage = Math.min(
    Math.max(params.perPage ?? FINANCEIRO_DEFAULT_PER_PAGE, 1),
    FINANCEIRO_MAX_PER_PAGE,
  );

  return paginateArray(allItens, page, perPage);
}

export class FluxoCaixaService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async listContasComSaldo(): Promise<FluxoCaixaContaSaldo[]> {
    const { data, error } = await this.supabase
      .from("contas_bancarias")
      .select("id, nome, tipo, saldo_inicial, saldo_atual, ativo")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .order("nome", { ascending: true });

    if (error) throw new Error(error.message);

    return (data ?? []) as FluxoCaixaContaSaldo[];
  }

  async listFilterOptions(): Promise<FluxoCaixaFilterOptions> {
    const [contasResult, categoriasResult, centrosResult] = await Promise.all([
      this.supabase
        .from("contas_bancarias")
        .select("id, nome")
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .eq("ativo", true)
        .order("nome", { ascending: true }),
      this.supabase
        .from("categorias_financeiras")
        .select("id, nome")
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .eq("ativo", true)
        .order("nome", { ascending: true }),
      this.supabase
        .from("centros_custo")
        .select("id, nome")
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .eq("ativo", true)
        .order("nome", { ascending: true }),
    ]);

    if (contasResult.error) throw new Error(contasResult.error.message);
    if (categoriasResult.error) throw new Error(categoriasResult.error.message);
    if (centrosResult.error) throw new Error(centrosResult.error.message);

    return {
      contas: contasResult.data ?? [],
      categorias: categoriasResult.data ?? [],
      centrosCusto: centrosResult.data ?? [],
    };
  }

  async getFluxo(params: FluxoCaixaListParams): Promise<FluxoCaixaResult> {
    const status = params.status ?? "all";
    const includeItens = params.includeItens !== false;
    const [contas, filterOptions, movimentacoesSaldo, movimentacoesPeriodo, crPrevistos, cpPrevistos] =
      await Promise.all([
        this.listContasComSaldo(),
        this.listFilterOptions(),
        this.fetchMovimentacoesParaSaldoInicial(params),
        this.fetchMovimentacoesPeriodo(params),
        this.fetchContasReceberPrevistas(params),
        this.fetchContasPagarPrevistas(params),
      ]);

    const contasEscopo = contas.filter((conta) => {
      if (!conta.ativo) return false;
      if (params.contaBancariaId && conta.id !== params.contaBancariaId) {
        return false;
      }
      return true;
    });

    const saldoAtual = contasEscopo.reduce(
      (acc, conta) => acc + Number(conta.saldo_atual ?? 0),
      0,
    );

    const deltaAposInicio = movimentacoesSaldo.reduce((acc, row) => {
      return acc + calcDeltaSaldo(row);
    }, 0);

    const saldoInicial = saldoAtual - deltaAposInicio;

    const realizados: FluxoCaixaLancamento[] = [];
    let entradasRealizadas = 0;
    let saidasRealizadas = 0;

    for (const row of movimentacoesPeriodo) {
      const categoria = resolveTituloCategoria(row);
      const centro = resolveTituloCentro(row);

      if (
        !matchesCategoriaCentro(categoria.id, centro.id, params)
      ) {
        continue;
      }

      const delta = calcDeltaSaldo(row);
      const entrada = isEntradaDelta(
        row.tipo,
        row.transferencia_papel,
        delta,
      );
      const valor = Math.abs(delta);
      const direcao = entrada ? "entrada" : "saida";

      if (entrada) {
        entradasRealizadas += valor;
      } else {
        saidasRealizadas += valor;
      }

      realizados.push({
        id: `mov-${row.id}`,
        data: row.data_movimentacao,
        descricao: row.descricao,
        natureza: "realizado",
        direcao,
        tipo: row.tipo,
        valor,
        saldo_novo: row.saldo_novo,
        conta_bancaria_id: row.conta_bancaria_id,
        conta_bancaria_nome: row.conta_bancaria?.nome ?? null,
        categoria_id: categoria.id,
        categoria_nome: categoria.nome,
        centro_custo_id: centro.id,
        centro_custo_nome: centro.nome,
        origem_titulo: "movimentacao",
      });
    }

    const previstos: FluxoCaixaLancamento[] = [];
    let entradasPrevistas = 0;
    let saidasPrevistas = 0;

    for (const row of crPrevistos) {
      if (
        !matchesCategoriaCentro(
          row.categoria_financeira_id,
          row.centro_custo_id,
          params,
        )
      ) {
        continue;
      }

      const valor = calcSaldoPendenteReceber(row);
      if (valor <= 0) continue;

      entradasPrevistas += valor;
      previstos.push({
        id: `cr-${row.id}`,
        data: row.data_vencimento,
        descricao: row.descricao,
        natureza: "previsto",
        direcao: "entrada",
        tipo: null,
        valor,
        saldo_novo: null,
        conta_bancaria_id: row.conta_bancaria_id,
        conta_bancaria_nome: row.conta_bancaria?.nome ?? null,
        categoria_id: row.categoria_financeira_id,
        categoria_nome: row.categoria_financeira?.nome ?? null,
        centro_custo_id: row.centro_custo_id,
        centro_custo_nome: row.centro_custo?.nome ?? null,
        origem_titulo: "conta_receber",
      });
    }

    for (const row of cpPrevistos) {
      if (
        !matchesCategoriaCentro(
          row.categoria_financeira_id,
          row.centro_custo_id,
          params,
        )
      ) {
        continue;
      }

      const valor = calcSaldoPendentePagar(row);
      if (valor <= 0) continue;

      saidasPrevistas += valor;
      previstos.push({
        id: `cp-${row.id}`,
        data: row.data_vencimento,
        descricao: row.descricao,
        natureza: "previsto",
        direcao: "saida",
        tipo: null,
        valor,
        saldo_novo: null,
        conta_bancaria_id: row.conta_bancaria_id,
        conta_bancaria_nome: row.conta_bancaria?.nome ?? null,
        categoria_id: row.categoria_financeira_id,
        categoria_nome: row.categoria_financeira?.nome ?? null,
        centro_custo_id: row.centro_custo_id,
        centro_custo_nome: row.centro_custo?.nome ?? null,
        origem_titulo: "conta_pagar",
      });
    }

    const entradasRealizadasVisivel = includeStatus(status, "realizado")
      ? entradasRealizadas
      : 0;
    const saidasRealizadasVisivel = includeStatus(status, "realizado")
      ? saidasRealizadas
      : 0;
    const entradasPrevistasVisivel = includeStatus(status, "previsto")
      ? entradasPrevistas
      : 0;
    const saidasPrevistasVisivel = includeStatus(status, "previsto")
      ? saidasPrevistas
      : 0;

    const saldoProjetado =
      saldoInicial +
      entradasRealizadasVisivel +
      entradasPrevistasVisivel -
      saidasRealizadasVisivel -
      saidasPrevistasVisivel;

    const dailyMap = new Map<
      string,
      {
        entradas_realizadas: number;
        saidas_realizadas: number;
        entradas_previstas: number;
        saidas_previstas: number;
      }
    >();

    for (const data of eachDateInclusive(params.dataDe, params.dataAte)) {
      dailyMap.set(data, {
        entradas_realizadas: 0,
        saidas_realizadas: 0,
        entradas_previstas: 0,
        saidas_previstas: 0,
      });
    }

    if (includeStatus(status, "realizado")) {
      for (const item of realizados) {
        const bucket = dailyMap.get(item.data);
        if (!bucket) continue;
        if (item.direcao === "entrada") {
          bucket.entradas_realizadas += item.valor;
        } else {
          bucket.saidas_realizadas += item.valor;
        }
      }
    }

    if (includeStatus(status, "previsto")) {
      for (const item of previstos) {
        const bucket = dailyMap.get(item.data);
        if (!bucket) continue;
        if (item.direcao === "entrada") {
          bucket.entradas_previstas += item.valor;
        } else {
          bucket.saidas_previstas += item.valor;
        }
      }
    }

    let acumulado = saldoInicial;
    const daily: FluxoCaixaDailyPoint[] = [];

    for (const data of eachDateInclusive(params.dataDe, params.dataAte)) {
      const bucket = dailyMap.get(data)!;
      const entradas =
        bucket.entradas_realizadas + bucket.entradas_previstas;
      const saidas = bucket.saidas_realizadas + bucket.saidas_previstas;
      const saldoDiario = entradas - saidas;
      acumulado += saldoDiario;

      daily.push({
        data,
        entradas,
        saidas,
        entradas_realizadas: bucket.entradas_realizadas,
        saidas_realizadas: bucket.saidas_realizadas,
        entradas_previstas: bucket.entradas_previstas,
        saidas_previstas: bucket.saidas_previstas,
        saldo_diario: saldoDiario,
        saldo_acumulado: acumulado,
      });
    }

    const lastDay = daily[daily.length - 1];

    const resumo: FluxoCaixaResumo = {
      saldo_inicial: saldoInicial,
      entradas_previstas: entradasPrevistasVisivel,
      saidas_previstas: saidasPrevistasVisivel,
      entradas_realizadas: entradasRealizadasVisivel,
      saidas_realizadas: saidasRealizadasVisivel,
      saldo_diario: lastDay?.saldo_diario ?? 0,
      saldo_acumulado: lastDay?.saldo_acumulado ?? saldoInicial,
      saldo_projetado: saldoProjetado,
      saldo_atual: saldoAtual,
    };

    const allItens = includeItens
      ? [
          ...(includeStatus(status, "realizado") ? realizados : []),
          ...(includeStatus(status, "previsto") ? previstos : []),
        ].sort((a, b) => {
          if (a.data === b.data) {
            return a.descricao.localeCompare(b.descricao, "pt-BR");
          }
          return a.data < b.data ? 1 : -1;
        })
      : [];

    const itens = includeItens
      ? paginateFluxoItens(allItens, params)
      : toPaginatedResult([], 0, 1, FINANCEIRO_DEFAULT_PER_PAGE);

    return {
      resumo,
      daily,
      itens,
      filterOptions,
    };
  }

  private async fetchMovimentacoesParaSaldoInicial(
    params: FluxoCaixaFilters,
  ): Promise<Pick<MovimentacaoRow, "saldo_anterior" | "saldo_novo">[]> {
    let query = this.supabase
      .from("movimentacoes_bancarias")
      .select("saldo_anterior, saldo_novo")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .gte("data_movimentacao", params.dataDe);

    if (params.contaBancariaId) {
      query = query.eq("conta_bancaria_id", params.contaBancariaId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  private async fetchMovimentacoesPeriodo(
    params: FluxoCaixaFilters,
  ): Promise<MovimentacaoRow[]> {
    let query = this.supabase
      .from("movimentacoes_bancarias")
      .select(MOV_SELECT)
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .gte("data_movimentacao", params.dataDe)
      .lte("data_movimentacao", params.dataAte)
      .order("data_movimentacao", { ascending: false });

    if (params.contaBancariaId) {
      query = query.eq("conta_bancaria_id", params.contaBancariaId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as MovimentacaoRow[];
  }

  private async fetchContasReceberPrevistas(
    params: FluxoCaixaFilters,
  ): Promise<ContaReceberPrevistoRow[]> {
    let query = this.supabase
      .from("contas_receber")
      .select(CR_PREVISTO_SELECT)
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("status", "aberto")
      .gte("data_vencimento", params.dataDe)
      .lte("data_vencimento", params.dataAte);

    if (params.contaBancariaId) {
      query = query.eq("conta_bancaria_id", params.contaBancariaId);
    }

    if (params.categoriaId) {
      query = query.eq("categoria_financeira_id", params.categoriaId);
    }

    if (params.centroCustoId) {
      query = query.eq("centro_custo_id", params.centroCustoId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ContaReceberPrevistoRow[];
  }

  private async fetchContasPagarPrevistas(
    params: FluxoCaixaFilters,
  ): Promise<ContaPagarPrevistoRow[]> {
    let query = this.supabase
      .from("contas_pagar")
      .select(CP_PREVISTO_SELECT)
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .in("status", ["aberto", "parcial"])
      .gte("data_vencimento", params.dataDe)
      .lte("data_vencimento", params.dataAte);

    if (params.contaBancariaId) {
      query = query.eq("conta_bancaria_id", params.contaBancariaId);
    }

    if (params.categoriaId) {
      query = query.eq("categoria_financeira_id", params.categoriaId);
    }

    if (params.centroCustoId) {
      query = query.eq("centro_custo_id", params.centroCustoId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ContaPagarPrevistoRow[];
  }
}

export async function createFluxoCaixaService(tenantId: string) {
  const supabase = await createClient();
  return new FluxoCaixaService(supabase, tenantId);
}

export function defaultFluxoCaixaPeriodo(now = new Date()): {
  dataDe: string;
  dataAte: string;
} {
  const year = now.getFullYear();
  const month = now.getMonth();
  const pad = (value: number) => String(value).padStart(2, "0");
  const dataDe = `${year}-${pad(month + 1)}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const dataAte = `${year}-${pad(month + 1)}-${pad(lastDay)}`;
  return { dataDe, dataAte };
}
