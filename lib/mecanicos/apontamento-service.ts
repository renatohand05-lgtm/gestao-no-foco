import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type MecanicoApontamento = {
  id: string;
  mecanico_id: string;
  ordem_servico_id: string | null;
  servico_descricao: string | null;
  status: string;
  inicio_em: string;
  fim_em: string | null;
  pausa_total_segundos: number;
  duracao_segundos: number;
  manual: boolean;
  motivo: string | null;
  custo_hora_aplicado: number | null;
  custo_mao_obra: number | null;
};

export class MecanicoApontamentoService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async listByOs(ordemId: string): Promise<MecanicoApontamento[]> {
    const { data, error } = await this.supabase
      .from("mecanico_apontamentos" as never)
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("ordem_servico_id", ordemId)
      .is("deleted_at", null)
      .order("inicio_em", { ascending: false });
    if (error) {
      if (/relation.*does not exist|Could not find/i.test(error.message)) {
        return [];
      }
      throw new Error(error.message);
    }
    return (data ?? []) as unknown as MecanicoApontamento[];
  }

  async executar(params: {
    mecanicoId: string;
    acao: "iniciar" | "pausar" | "retomar" | "finalizar" | "manual";
    ordemId?: string | null;
    inicio?: string | null;
    fim?: string | null;
    motivo?: string | null;
    servico?: string | null;
  }): Promise<string> {
    const { data, error } = await this.supabase.rpc(
      "mecanico_apontamento_atomico" as never,
      {
        p_tenant_id: this.tenantId,
        p_mecanico_id: params.mecanicoId,
        p_acao: params.acao,
        p_ordem_id: params.ordemId ?? null,
        p_inicio: params.inicio ?? null,
        p_fim: params.fim ?? null,
        p_motivo: params.motivo ?? null,
        p_servico: params.servico ?? null,
      } as never,
    );
    if (error) throw new Error(error.message);
    return data as string;
  }
}

export async function createMecanicoApontamentoService(tenantId: string) {
  const supabase = await createClient();
  return new MecanicoApontamentoService(supabase, tenantId);
}
