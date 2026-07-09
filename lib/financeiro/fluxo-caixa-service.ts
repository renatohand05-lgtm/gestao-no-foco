import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { createMovimentacaoBancariaService } from "@/lib/financeiro/movimentacao-bancaria-service";
import { calcDeltaSaldo } from "@/lib/financeiro/movimentacao-bancaria-utils";
import type { Database } from "@/types/database";
import type {
  FluxoCaixaContaSaldo,
  FluxoCaixaPeriodoParams,
  FluxoCaixaResumo,
  MovimentacaoBancariaTipo,
} from "@/types/movimentacoes-bancarias";

const TIPOS_SAIDA: MovimentacaoBancariaTipo[] = ["saida", "transferencia"];

function isEntrada(
  tipo: MovimentacaoBancariaTipo,
  transferenciaPapel: string | null,
  delta: number,
): boolean {
  if (tipo === "entrada" || tipo === "ajuste") {
    return delta > 0;
  }
  if (tipo === "transferencia") {
    return transferenciaPapel === "recebida";
  }
  if (tipo === "estorno") {
    return delta > 0;
  }
  return false;
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

  async getResumo(
    params: FluxoCaixaPeriodoParams = {},
  ): Promise<FluxoCaixaResumo> {
    const contas = await this.listContasComSaldo();

    let query = this.supabase
      .from("movimentacoes_bancarias")
      .select(
        "tipo, transferencia_papel, valor, saldo_anterior, saldo_novo, estornada_por_id",
      )
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null);

    if (params.contaBancariaId) {
      query = query.eq("conta_bancaria_id", params.contaBancariaId);
    }

    if (params.dataDe) {
      query = query.gte("data_movimentacao", params.dataDe);
    }

    if (params.dataAte) {
      query = query.lte("data_movimentacao", params.dataAte);
    }

    const { data: movimentacoes, error } = await query;

    if (error) throw new Error(error.message);

    const resumo: FluxoCaixaResumo = {
      saldo_total: contas
        .filter((conta) => conta.ativo)
        .reduce((acc, conta) => acc + Number(conta.saldo_atual ?? 0), 0),
      total_entradas: 0,
      total_saidas: 0,
      saldo_periodo: 0,
      quantidade_movimentacoes: movimentacoes?.length ?? 0,
      quantidade_contas_ativas: contas.filter((conta) => conta.ativo).length,
    };

    for (const row of movimentacoes ?? []) {
      const delta = calcDeltaSaldo({
        saldo_anterior: row.saldo_anterior,
        saldo_novo: row.saldo_novo,
      });
      const valor = Math.abs(delta);

      if (isEntrada(row.tipo as MovimentacaoBancariaTipo, row.transferencia_papel, delta)) {
        resumo.total_entradas += valor;
        resumo.saldo_periodo += valor;
        continue;
      }

      if (
        TIPOS_SAIDA.includes(row.tipo as MovimentacaoBancariaTipo) &&
        row.tipo !== "transferencia"
      ) {
        resumo.total_saidas += valor;
        resumo.saldo_periodo -= valor;
        continue;
      }

      if (row.tipo === "transferencia" && row.transferencia_papel === "enviada") {
        resumo.total_saidas += valor;
        resumo.saldo_periodo -= valor;
      }
    }

    return resumo;
  }

  async getMovimentacaoService() {
    return createMovimentacaoBancariaService(this.tenantId);
  }
}

export async function createFluxoCaixaService(tenantId: string) {
  const supabase = await createClient();
  return new FluxoCaixaService(supabase, tenantId);
}
