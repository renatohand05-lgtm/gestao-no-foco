import type { SupabaseClient } from "@supabase/supabase-js";

import type { OsMecanicoPapel } from "@/lib/mecanicos/constants";
import { MecanicoCustoService } from "@/lib/mecanicos/custo-service";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type OrdemServicoMecanico = {
  id: string;
  tenant_id: string;
  ordem_servico_id: string;
  mecanico_id: string;
  papel: OsMecanicoPapel;
  etapa: string | null;
  percentual_participacao: number;
  horas_estimadas: number;
  horas_realizadas: number;
  rateio_receita_mao_obra: number;
  rateio_comissao: number;
  atribuido_em: string;
  removido_em: string | null;
  motivo_remocao: string | null;
  observacao: string | null;
  ativo: boolean;
  congelado: boolean;
  mecanico?: { nome_completo: string; especialidade: string; status: string; disponibilidade: string } | null;
};

export type OsCustoReal = {
  custoPecas: number;
  custoServicosTerceiros: number;
  custoMaoObra: number;
  receita: number;
  descontos: number;
  custoEstimado: number;
  custoRealizado: number;
  desvio: number;
  margemBruta: number;
  margemLiquidaEstimada: number;
  detalheMaoObra: Array<{
    mecanico_id: string;
    horas: number;
    custo_hora: number;
    custo: number;
  }>;
};

export class OsMecanicoService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async listByOs(ordemId: string): Promise<OrdemServicoMecanico[]> {
    const { data, error } = await this.supabase
      .from("ordem_servico_mecanicos" as never)
      .select(
        "*, mecanico:mecanicos(nome_completo, especialidade, status, disponibilidade)",
      )
      .eq("tenant_id", this.tenantId)
      .eq("ordem_servico_id", ordemId)
      .eq("ativo", true)
      .is("removido_em", null)
      .order("atribuido_em");
    if (error) {
      if (/relation.*does not exist|Could not find/i.test(error.message)) {
        return [];
      }
      throw new Error(error.message);
    }
    return (data ?? []) as unknown as OrdemServicoMecanico[];
  }

  async atribuir(params: {
    ordemId: string;
    mecanicoId: string;
    papel?: OsMecanicoPapel;
    percentual?: number;
    horasEstimadas?: number;
    etapa?: string | null;
    observacao?: string | null;
    forcar?: boolean;
  }): Promise<string> {
    const { data, error } = await this.supabase.rpc(
      "os_atribuir_mecanico_atomico" as never,
      {
        p_tenant_id: this.tenantId,
        p_ordem_id: params.ordemId,
        p_mecanico_id: params.mecanicoId,
        p_papel: params.papel ?? "principal",
        p_percentual: params.percentual ?? (params.papel === "auxiliar" ? 0 : 100),
        p_horas_estimadas: params.horasEstimadas ?? 0,
        p_etapa: params.etapa ?? null,
        p_observacao: params.observacao ?? null,
        p_forcar: params.forcar ?? false,
      } as never,
    );
    if (error) throw new Error(error.message);
    return data as string;
  }

  async remover(params: {
    alocacaoId: string;
    motivo: string;
  }): Promise<void> {
    const { error } = await this.supabase
      .from("ordem_servico_mecanicos" as never)
      .update({
        ativo: false,
        removido_em: new Date().toISOString(),
        motivo_remocao: params.motivo,
      } as never)
      .eq("tenant_id", this.tenantId)
      .eq("id", params.alocacaoId)
      .eq("congelado", false);
    if (error) throw new Error(error.message);
  }

  async transferir(params: {
    ordemId: string;
    deMecanicoId: string;
    paraMecanicoId: string;
    motivo?: string;
    forcar?: boolean;
  }): Promise<string> {
    const atuais = await this.listByOs(params.ordemId);
    const atual = atuais.find(
      (a) => a.mecanico_id === params.deMecanicoId && a.papel === "principal",
    );
    if (atual) {
      await this.remover({
        alocacaoId: atual.id,
        motivo: params.motivo ?? "transferencia",
      });
    }
    return this.atribuir({
      ordemId: params.ordemId,
      mecanicoId: params.paraMecanicoId,
      papel: "principal",
      percentual: atual?.percentual_participacao ?? 100,
      horasEstimadas: atual?.horas_estimadas ?? 0,
      observacao: params.motivo ?? "transferencia",
      forcar: params.forcar,
    });
  }

  async congelarAlocacoes(ordemId: string): Promise<void> {
    await this.supabase
      .from("ordem_servico_mecanicos" as never)
      .update({ congelado: true } as never)
      .eq("tenant_id", this.tenantId)
      .eq("ordem_servico_id", ordemId)
      .eq("ativo", true);
  }

  /**
   * Custo real da OS = peças + terceiros + (horas × custo/hora vigente).
   */
  async calcularCustoReal(ordemId: string): Promise<OsCustoReal> {
    const [{ data: os }, { data: itens }, alocacoes] = await Promise.all([
      this.supabase
        .from("ordens_servico")
        .select("valor_total")
        .eq("id", ordemId)
        .eq("tenant_id", this.tenantId)
        .maybeSingle(),
      this.supabase
        .from("ordem_servico_itens")
        .select(
          "tipo_item, valor_total, custo_unitario, quantidade, horas_previstas, horas_realizadas",
        )
        .eq("ordem_servico_id", ordemId)
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null),
      this.listByOs(ordemId),
    ]);

    const rows = (itens ?? []) as unknown as Array<{
      tipo_item: string | null;
      valor_total: number | null;
      custo_unitario: number | null;
      quantidade: number | null;
      horas_previstas: number | null;
      horas_realizadas: number | null;
    }>;

    let custoPecas = 0;
    let custoServicosTerceiros = 0;
    for (const it of rows) {
      const custoLinha =
        Number(it.custo_unitario ?? 0) * Number(it.quantidade ?? 0);
      if (it.tipo_item === "produto" || it.tipo_item === "peca") {
        custoPecas += custoLinha;
      } else if (
        it.tipo_item === "terceiro" ||
        it.tipo_item === "servico_terceiro"
      ) {
        custoServicosTerceiros += custoLinha;
      }
    }

    const custoSvc = new MecanicoCustoService(this.supabase, this.tenantId);
    const detalheMaoObra: OsCustoReal["detalheMaoObra"] = [];
    let custoMaoObra = 0;

    for (const a of alocacoes) {
      const vigente = await custoSvc.getVigente(a.mecanico_id);
      const custoHora = Number(vigente?.custo_hora ?? 0);
      const horas = Number(a.horas_realizadas ?? 0);
      const custo = Math.round(horas * custoHora * 100) / 100;
      detalheMaoObra.push({
        mecanico_id: a.mecanico_id,
        horas,
        custo_hora: custoHora,
        custo,
      });
      custoMaoObra += custo;
    }

    // Fallback: apontamentos finalizados
    if (custoMaoObra === 0) {
      const { data: apts } = await this.supabase
        .from("mecanico_apontamentos" as never)
        .select("mecanico_id, duracao_segundos, custo_mao_obra, custo_hora_aplicado")
        .eq("tenant_id", this.tenantId)
        .eq("ordem_servico_id", ordemId)
        .eq("status", "finalizado")
        .is("deleted_at", null);
      for (const apt of (apts ?? []) as Array<{
        mecanico_id: string;
        duracao_segundos: number;
        custo_mao_obra: number | null;
        custo_hora_aplicado: number | null;
      }>) {
        const horas = Number(apt.duracao_segundos ?? 0) / 3600;
        const custo =
          Number(apt.custo_mao_obra ?? 0) ||
          Math.round(horas * Number(apt.custo_hora_aplicado ?? 0) * 100) / 100;
        custoMaoObra += custo;
        detalheMaoObra.push({
          mecanico_id: apt.mecanico_id,
          horas,
          custo_hora: Number(apt.custo_hora_aplicado ?? 0),
          custo,
        });
      }
    }

    const receita = Number(
      (os as { valor_total?: number } | null)?.valor_total ?? 0,
    );
    const descontos = 0;
    const custoEstimado =
      custoPecas +
      custoServicosTerceiros +
      detalheMaoObra.reduce((s, d) => {
        const a = alocacoes.find((x) => x.mecanico_id === d.mecanico_id);
        return s + Number(a?.horas_estimadas ?? 0) * d.custo_hora;
      }, 0);
    const custoRealizado = custoPecas + custoServicosTerceiros + custoMaoObra;
    const margemBruta = receita - custoPecas - custoServicosTerceiros;
    const margemLiquidaEstimada = receita - descontos - custoRealizado;

    return {
      custoPecas,
      custoServicosTerceiros,
      custoMaoObra,
      receita,
      descontos,
      custoEstimado,
      custoRealizado,
      desvio: custoRealizado - custoEstimado,
      margemBruta,
      margemLiquidaEstimada,
      detalheMaoObra,
    };
  }
}

export async function createOsMecanicoService(tenantId: string) {
  const supabase = await createClient();
  return new OsMecanicoService(supabase, tenantId);
}
