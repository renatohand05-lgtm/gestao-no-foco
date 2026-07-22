import type { SupabaseClient } from "@supabase/supabase-js";

import { MecanicoService } from "@/lib/mecanicos/mecanico-service";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type MecanicoCompetencia = {
  id: string;
  tenant_id: string;
  mecanico_id: string;
  mecanico_custo_id: string | null;
  competencia: string;
  tipo_obrigacao: string;
  valor: number;
  status: string;
  data_vencimento: string;
  categoria_financeira_id: string | null;
  plano_conta_id: string | null;
  centro_custo_id: string | null;
  conta_bancaria_id: string | null;
  forma_pagamento_id: string | null;
  conta_pagar_id: string | null;
  observacoes: string | null;
  origem: string;
  created_at: string;
};

/**
 * Gera obrigação mensal via RPC atômica.
 * Fluxo: custo → competência → conta a pagar → (pagamento) → DRE.
 * Nunca lança salário direto no DRE.
 */
export class MecanicoCompetenciaService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async listByMecanico(mecanicoId: string): Promise<MecanicoCompetencia[]> {
    const { data, error } = await this.supabase
      .from("mecanico_competencias" as never)
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("mecanico_id", mecanicoId)
      .is("deleted_at", null)
      .order("competencia", { ascending: false });
    if (error) {
      if (/relation.*does not exist|Could not find/i.test(error.message)) {
        return [];
      }
      throw new Error(error.message);
    }
    return (data ?? []) as unknown as MecanicoCompetencia[];
  }

  async listByCompetencia(competencia: string): Promise<MecanicoCompetencia[]> {
    const comp = `${competencia.slice(0, 7)}-01`;
    const { data, error } = await this.supabase
      .from("mecanico_competencias" as never)
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("competencia", comp)
      .is("deleted_at", null);
    if (error) {
      if (/relation.*does not exist|Could not find/i.test(error.message)) {
        return [];
      }
      throw new Error(error.message);
    }
    return (data ?? []) as unknown as MecanicoCompetencia[];
  }

  async gerar(params: {
    mecanicoId: string;
    competencia: string;
    tipo?: string;
    dataVencimento?: string | null;
    observacoes?: string | null;
  }): Promise<string> {
    const competencia = `${params.competencia.slice(0, 7)}-01`;
    const { data, error } = await this.supabase.rpc(
      "gerar_obrigacao_mecanico_atomico" as never,
      {
        p_tenant_id: this.tenantId,
        p_mecanico_id: params.mecanicoId,
        p_competencia: competencia,
        p_tipo_obrigacao: params.tipo ?? "folha",
        p_data_vencimento: params.dataVencimento ?? null,
        p_observacoes: params.observacoes ?? null,
      } as never,
    );

    if (error) throw new Error(error.message);
    return data as string;
  }

  async alterarVencimento(
    id: string,
    dataVencimento: string,
  ): Promise<void> {
    const { data: row, error } = await this.supabase
      .from("mecanico_competencias" as never)
      .update({ data_vencimento: dataVencimento } as never)
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .select("conta_pagar_id")
      .single();
    if (error) throw new Error(error.message);

    const contaId = (row as { conta_pagar_id?: string | null })?.conta_pagar_id;
    if (contaId) {
      await this.supabase
        .from("contas_pagar")
        .update({ data_vencimento: dataVencimento } as never)
        .eq("id", contaId)
        .eq("tenant_id", this.tenantId)
        .eq("status", "aberto");
    }

    const audit = new MecanicoService(this.supabase, this.tenantId);
    await audit.audit(
      "mecanico_competencia",
      id,
      "alterar_vencimento",
      null,
      { data_vencimento: dataVencimento },
    );
  }

  /** Resumo para DRE: custos por competência via CAP geradas (sem duplicar). */
  async resumoDre(competencia: string): Promise<{
    total: number;
    porMecanico: Array<{ mecanico_id: string; valor: number }>;
    porCentroCusto: Array<{ centro_custo_id: string | null; valor: number }>;
    quantidade: number;
  }> {
    const rows = await this.listByCompetencia(competencia);
    const geradas = rows.filter((r) =>
      ["gerada", "paga"].includes(r.status),
    );
    const total = geradas.reduce((s, r) => s + Number(r.valor), 0);
    const porMecanicoMap = new Map<string, number>();
    const porCcMap = new Map<string, number>();
    for (const r of geradas) {
      porMecanicoMap.set(
        r.mecanico_id,
        (porMecanicoMap.get(r.mecanico_id) ?? 0) + Number(r.valor),
      );
      const cc = r.centro_custo_id ?? "sem";
      porCcMap.set(cc, (porCcMap.get(cc) ?? 0) + Number(r.valor));
    }
    return {
      total,
      porMecanico: [...porMecanicoMap.entries()].map(([mecanico_id, valor]) => ({
        mecanico_id,
        valor,
      })),
      porCentroCusto: [...porCcMap.entries()].map(([k, valor]) => ({
        centro_custo_id: k === "sem" ? null : k,
        valor,
      })),
      quantidade: geradas.length,
    };
  }
}

export async function createMecanicoCompetenciaService(tenantId: string) {
  const supabase = await createClient();
  return new MecanicoCompetenciaService(supabase, tenantId);
}
