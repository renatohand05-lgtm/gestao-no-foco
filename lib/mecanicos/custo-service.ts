import type { SupabaseClient } from "@supabase/supabase-js";

import { calcCustoHora, calcCustoMensal } from "@/lib/mecanicos/constants";
import { assertClassificacaoCustoIds } from "@/lib/mecanicos/classificacao";
import { MecanicoService } from "@/lib/mecanicos/mecanico-service";
import {
  pickCustoParaCompetencia,
  vigenciaContemData,
  vigenciasConflitam,
  vigenciaSobrepoeCompetencia,
} from "@/lib/mecanicos/vigencia";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type MecanicoCusto = {
  id: string;
  tenant_id: string;
  mecanico_id: string;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  salario_base: number;
  pro_labore: number;
  adicional: number;
  comissao: number;
  horas_extras: number;
  beneficios: number;
  cesta_basica: number;
  vale_transporte: number;
  vale_refeicao: number;
  encargos: number;
  impostos: number;
  bonus: number;
  descontos: number;
  custo_mensal_total: number;
  custo_hora: number;
  horas_base_calculo: number;
  dia_pagamento: number;
  data_vencimento_padrao: number;
  gerar_automatico: boolean;
  geracao_pausada: boolean;
  plano_conta_id: string | null;
  categoria_financeira_id: string | null;
  centro_custo_id: string | null;
  conta_bancaria_id: string | null;
  forma_pagamento_id: string | null;
  observacoes: string | null;
  created_at: string;
};

export type MecanicoCustoInput = {
  vigencia_inicio: string;
  vigencia_fim?: string | null;
  salario_base?: number;
  pro_labore?: number;
  adicional?: number;
  comissao?: number;
  horas_extras?: number;
  beneficios?: number;
  cesta_basica?: number;
  vale_transporte?: number;
  vale_refeicao?: number;
  encargos?: number;
  impostos?: number;
  bonus?: number;
  descontos?: number;
  horas_base_calculo?: number;
  dia_pagamento?: number;
  data_vencimento_padrao?: number;
  gerar_automatico?: boolean;
  geracao_pausada?: boolean;
  /** UUID obrigatório — nunca nome/código. */
  plano_conta_id: string;
  /** UUID obrigatório — nunca nome/código. */
  categoria_financeira_id: string;
  /** UUID obrigatório — nunca nome/código. */
  centro_custo_id: string;
  conta_bancaria_id?: string | null;
  forma_pagamento_id?: string | null;
  observacoes?: string | null;
};

export type MecanicoCustoClassificacaoInput = {
  categoria_financeira_id: string;
  plano_conta_id: string;
  centro_custo_id: string;
};

function n(v?: number | null): number {
  return Number(v ?? 0) || 0;
}

export class MecanicoCustoService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async listByMecanico(mecanicoId: string): Promise<MecanicoCusto[]> {
    const { data, error } = await this.supabase
      .from("mecanico_custos" as never)
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("mecanico_id", mecanicoId)
      .is("deleted_at", null)
      .order("vigencia_inicio", { ascending: false });
    if (error) {
      if (/relation.*does not exist|Could not find/i.test(error.message)) {
        return [];
      }
      throw new Error(error.message);
    }
    return (data ?? []) as unknown as MecanicoCusto[];
  }

  /** Custo vigente em um dia (apontamento / custo-hora). */
  async getVigente(
    mecanicoId: string,
    naData?: string,
  ): Promise<MecanicoCusto | null> {
    const ref = naData ?? new Date().toISOString().slice(0, 10);
    const list = await this.listByMecanico(mecanicoId);
    return list.find((c) => vigenciaContemData(c, ref)) ?? null;
  }

  /**
   * Custo para gerar obrigação da competência (mesma regra da RPC):
   * sobreposição entre vigência e o mês da competência.
   */
  async getVigenteParaCompetencia(
    mecanicoId: string,
    competencia: string,
  ): Promise<MecanicoCusto | null> {
    const list = await this.listByMecanico(mecanicoId);
    return pickCustoParaCompetencia(list, competencia);
  }

  cobreCompetencia(custo: MecanicoCusto, competencia: string): boolean {
    return vigenciaSobrepoeCompetencia(custo, competencia);
  }

  /**
   * Nova vigência: fecha a aberta (se houver) no dia anterior e cria histórico.
   * Impede sobreposição conflituosa com vigências existentes.
   * Exige UUIDs de categoria, plano e centro de custo.
   */
  async criarVigencia(
    mecanicoId: string,
    input: MecanicoCustoInput,
    motivo?: string,
  ): Promise<MecanicoCusto> {
    const classificacao = assertClassificacaoCustoIds(input);

    const existentes = await this.listByMecanico(mecanicoId);
    const aberto = existentes.find((c) => c.vigencia_fim == null);

    let fechados: MecanicoCusto[] = existentes;
    if (aberto) {
      const inicio = new Date(input.vigencia_inicio + "T12:00:00");
      const fimAnterior = new Date(inicio);
      fimAnterior.setDate(fimAnterior.getDate() - 1);
      const fimIso = fimAnterior.toISOString().slice(0, 10);
      if (fimIso >= aberto.vigencia_inicio) {
        await this.supabase
          .from("mecanico_custos" as never)
          .update({ vigencia_fim: fimIso } as never)
          .eq("id", aberto.id)
          .eq("tenant_id", this.tenantId);
        fechados = existentes.map((c) =>
          c.id === aberto.id ? { ...c, vigencia_fim: fimIso } : c,
        );
      } else {
        throw new Error(
          "Nova vigência conflita com a vigência aberta existente.",
        );
      }
    }

    const candidata = {
      vigencia_inicio: input.vigencia_inicio,
      vigencia_fim: input.vigencia_fim ?? null,
    };

    const conflito = fechados.find((c) => vigenciasConflitam(c, candidata));
    if (conflito) {
      throw new Error(
        `Já existe vigência conflitante (${conflito.vigencia_inicio}` +
          `${conflito.vigencia_fim ? ` → ${conflito.vigencia_fim}` : " → atual"}).`,
      );
    }

    const horas = n(input.horas_base_calculo) || 176;
    const mensal = calcCustoMensal(input);
    const hora = calcCustoHora(mensal, horas);

    const { data, error } = await this.supabase
      .from("mecanico_custos" as never)
      .insert({
        tenant_id: this.tenantId,
        mecanico_id: mecanicoId,
        vigencia_inicio: input.vigencia_inicio,
        vigencia_fim: input.vigencia_fim ?? null,
        salario_base: n(input.salario_base),
        pro_labore: n(input.pro_labore),
        adicional: n(input.adicional),
        comissao: n(input.comissao),
        horas_extras: n(input.horas_extras),
        beneficios: n(input.beneficios),
        cesta_basica: n(input.cesta_basica),
        vale_transporte: n(input.vale_transporte),
        vale_refeicao: n(input.vale_refeicao),
        encargos: n(input.encargos),
        impostos: n(input.impostos),
        bonus: n(input.bonus),
        descontos: n(input.descontos),
        custo_mensal_total: mensal,
        custo_hora: hora,
        horas_base_calculo: horas,
        dia_pagamento: input.dia_pagamento ?? 5,
        data_vencimento_padrao: input.data_vencimento_padrao ?? 5,
        gerar_automatico: input.gerar_automatico ?? false,
        geracao_pausada: input.geracao_pausada ?? false,
        plano_conta_id: classificacao.plano_conta_id,
        categoria_financeira_id: classificacao.categoria_financeira_id,
        centro_custo_id: classificacao.centro_custo_id,
        conta_bancaria_id: input.conta_bancaria_id ?? null,
        forma_pagamento_id: input.forma_pagamento_id ?? null,
        observacoes: input.observacoes?.trim() || null,
      } as never)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const row = data as unknown as MecanicoCusto;

    const audit = new MecanicoService(this.supabase, this.tenantId);
    await audit.audit(
      "mecanico_custo",
      row.id,
      "alteracao_salarial",
      aberto,
      row,
      motivo,
    );

    return row;
  }

  /**
   * Atualiza apenas a classificação financeira de uma vigência existente
   * (corrige registros antigos sem criar nova vigência).
   */
  async atualizarClassificacao(
    custoId: string,
    input: MecanicoCustoClassificacaoInput,
    motivo?: string,
  ): Promise<MecanicoCusto> {
    const classificacao = assertClassificacaoCustoIds(input);

    const { data: before, error: beforeError } = await this.supabase
      .from("mecanico_custos" as never)
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("id", custoId)
      .is("deleted_at", null)
      .maybeSingle();
    if (beforeError) throw new Error(beforeError.message);
    if (!before) throw new Error("Vigência de custo não encontrada.");

    const { data, error } = await this.supabase
      .from("mecanico_custos" as never)
      .update({
        categoria_financeira_id: classificacao.categoria_financeira_id,
        plano_conta_id: classificacao.plano_conta_id,
        centro_custo_id: classificacao.centro_custo_id,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("tenant_id", this.tenantId)
      .eq("id", custoId)
      .is("deleted_at", null)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const row = data as unknown as MecanicoCusto;

    const audit = new MecanicoService(this.supabase, this.tenantId);
    await audit.audit(
      "mecanico_custo",
      custoId,
      "atualizar_classificacao",
      before,
      {
        categoria_financeira_id: row.categoria_financeira_id,
        plano_conta_id: row.plano_conta_id,
        centro_custo_id: row.centro_custo_id,
      },
      motivo,
    );

    return row;
  }

  async pausarGeracao(custoId: string, pausada: boolean): Promise<void> {
    const { error } = await this.supabase
      .from("mecanico_custos" as never)
      .update({ geracao_pausada: pausada } as never)
      .eq("tenant_id", this.tenantId)
      .eq("id", custoId);
    if (error) throw new Error(error.message);
  }
}

export async function createMecanicoCustoService(tenantId: string) {
  const supabase = await createClient();
  return new MecanicoCustoService(supabase, tenantId);
}
