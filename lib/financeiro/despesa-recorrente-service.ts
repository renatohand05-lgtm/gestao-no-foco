import type { SupabaseClient } from "@supabase/supabase-js";

import { createContaPagarService } from "@/lib/financeiro/conta-pagar-service";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type DespesaRecorrente = {
  id: string;
  tenant_id: string;
  descricao: string;
  fornecedor_id: string | null;
  fornecedor_nome: string | null;
  categoria_financeira_id: string | null;
  plano_conta_id: string | null;
  centro_custo_id: string | null;
  forma_pagamento_id: string | null;
  valor: number;
  dia_vencimento: number;
  inicia_em: string;
  termina_em: string | null;
  max_ocorrencias: number | null;
  ocorrencias_geradas: number;
  proxima_competencia: string | null;
  pausada: boolean;
  ativo: boolean;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type DespesaRecorrenteInput = {
  descricao: string;
  fornecedor_id?: string | null;
  fornecedor_nome?: string | null;
  categoria_financeira_id: string;
  plano_conta_id: string;
  centro_custo_id: string;
  forma_pagamento_id?: string | null;
  valor: number;
  dia_vencimento: number;
  inicia_em: string;
  termina_em?: string | null;
  max_ocorrencias?: number | null;
  observacoes?: string | null;
  ativo?: boolean;
  pausada?: boolean;
};

function firstOfMonth(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`;
}

function addMonthsISO(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d ?? 1));
  date.setUTCMonth(date.getUTCMonth() + months);
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function clampDay(year: number, month: number, day: number): string {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const safe = Math.min(day, last);
  return `${year}-${String(month).padStart(2, "0")}-${String(safe).padStart(2, "0")}`;
}

export class DespesaRecorrenteService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async list(): Promise<DespesaRecorrente[]> {
    const { data, error } = await this.supabase
      .from("despesas_recorrentes" as never)
      .select("*")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .order("descricao", { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as DespesaRecorrente[];
  }

  async getById(id: string): Promise<DespesaRecorrente | null> {
    const { data, error } = await this.supabase
      .from("despesas_recorrentes" as never)
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data as DespesaRecorrente | null) ?? null;
  }

  async create(input: DespesaRecorrenteInput): Promise<DespesaRecorrente> {
    const proxima = firstOfMonth(input.inicia_em);
    const { data, error } = await this.supabase
      .from("despesas_recorrentes" as never)
      .insert({
        tenant_id: this.tenantId,
        descricao: input.descricao.trim(),
        fornecedor_id: input.fornecedor_id ?? null,
        fornecedor_nome: input.fornecedor_nome?.trim() || null,
        categoria_financeira_id: input.categoria_financeira_id,
        plano_conta_id: input.plano_conta_id,
        centro_custo_id: input.centro_custo_id,
        forma_pagamento_id: input.forma_pagamento_id ?? null,
        valor: input.valor,
        dia_vencimento: input.dia_vencimento,
        inicia_em: input.inicia_em,
        termina_em: input.termina_em ?? null,
        max_ocorrencias: input.max_ocorrencias ?? null,
        ocorrencias_geradas: 0,
        proxima_competencia: proxima,
        pausada: input.pausada ?? false,
        ativo: input.ativo ?? true,
        observacoes: input.observacoes?.trim() || null,
      } as never)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data as unknown as DespesaRecorrente;
  }

  async update(
    id: string,
    input: Partial<DespesaRecorrenteInput>,
  ): Promise<DespesaRecorrente> {
    const payload: Record<string, unknown> = {};
    if (input.descricao != null) payload.descricao = input.descricao.trim();
    if (input.fornecedor_id !== undefined) {
      payload.fornecedor_id = input.fornecedor_id;
    }
    if (input.fornecedor_nome !== undefined) {
      payload.fornecedor_nome = input.fornecedor_nome?.trim() || null;
    }
    if (input.categoria_financeira_id) {
      payload.categoria_financeira_id = input.categoria_financeira_id;
    }
    if (input.plano_conta_id) payload.plano_conta_id = input.plano_conta_id;
    if (input.centro_custo_id) payload.centro_custo_id = input.centro_custo_id;
    if (input.forma_pagamento_id !== undefined) {
      payload.forma_pagamento_id = input.forma_pagamento_id;
    }
    if (input.valor != null) payload.valor = input.valor;
    if (input.dia_vencimento != null) {
      payload.dia_vencimento = input.dia_vencimento;
    }
    if (input.termina_em !== undefined) payload.termina_em = input.termina_em;
    if (input.max_ocorrencias !== undefined) {
      payload.max_ocorrencias = input.max_ocorrencias;
    }
    if (input.observacoes !== undefined) {
      payload.observacoes = input.observacoes?.trim() || null;
    }
    if (input.ativo != null) payload.ativo = input.ativo;
    if (input.pausada != null) payload.pausada = input.pausada;

    const { data, error } = await this.supabase
      .from("despesas_recorrentes" as never)
      .update(payload as never)
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data as unknown as DespesaRecorrente;
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("despesas_recorrentes" as never)
      .update({ deleted_at: new Date().toISOString(), ativo: false } as never)
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);
  }

  async pause(id: string, pausada: boolean): Promise<DespesaRecorrente> {
    return this.update(id, { pausada });
  }

  /**
   * Gera a próxima ocorrência como Conta a Pagar (competência).
   * Não cria movimentação bancária. Não duplica competência já gerada.
   */
  async generateNextOccurrence(id: string): Promise<{
    contaId: string;
    competencia: string;
  } | null> {
    const series = await this.getById(id);
    if (!series) throw new Error("Recorrência não encontrada.");
    if (!series.ativo || series.pausada) {
      throw new Error("Recorrência inativa ou pausada.");
    }
    if (
      series.max_ocorrencias != null &&
      series.ocorrencias_geradas >= series.max_ocorrencias
    ) {
      throw new Error("Limite de ocorrências atingido.");
    }

    const competencia = series.proxima_competencia
      ? firstOfMonth(series.proxima_competencia)
      : firstOfMonth(series.inicia_em);

    if (series.termina_em && competencia > series.termina_em) {
      throw new Error("Recorrência já encerrada para a competência.");
    }

    // Anti-duplicidade: mesma série + mesma competência (inclui cancelados/soft-deleted)
    const { data: existing, error: existingError } = await this.supabase
      .from("contas_pagar")
      .select("id")
      .eq("tenant_id", this.tenantId)
      .eq("despesa_recorrente_id" as never, id as never)
      .eq("data_competencia", competencia)
      .limit(1)
      .maybeSingle();

    if (existingError && !existingError.message.includes("despesa_recorrente")) {
      throw new Error(existingError.message);
    }
    if (existing) {
      throw new Error(
        "Já existe ocorrência para esta competência (ativa, cancelada ou excluída logicamente).",
      );
    }

    const [yy, mm] = competencia.split("-").map(Number);
    const vencimento = clampDay(yy!, mm!, series.dia_vencimento);

    const cp = await createContaPagarService(this.tenantId);
    const created = await cp.create({
      fornecedor_id: series.fornecedor_id,
      fornecedor_nome: series.fornecedor_nome,
      forma_pagamento_id: series.forma_pagamento_id,
      categoria_financeira_id: series.categoria_financeira_id!,
      centro_custo_id: series.centro_custo_id!,
      plano_conta_id: series.plano_conta_id!,
      descricao: `${series.descricao} (${competencia.slice(0, 7)})`,
      valor_original: Number(series.valor),
      desconto: 0,
      juros: 0,
      multa: 0,
      data_emissao: competencia,
      data_competencia: competencia,
      data_vencimento: vencimento,
      parcelas: 1,
      observacoes: series.observacoes,
    });

    // Vincula se coluna existir
    await this.supabase
      .from("contas_pagar")
      .update({ despesa_recorrente_id: id } as never)
      .eq("id", created.id)
      .eq("tenant_id", this.tenantId);

    const nextCompetencia = addMonthsISO(competencia, 1);
    await this.supabase
      .from("despesas_recorrentes" as never)
      .update({
        ocorrencias_geradas: series.ocorrencias_geradas + 1,
        proxima_competencia: nextCompetencia,
      } as never)
      .eq("id", id)
      .eq("tenant_id", this.tenantId);

    return { contaId: created.id, competencia };
  }
}

export async function createDespesaRecorrenteService(tenantId: string) {
  const supabase = await createClient();
  return new DespesaRecorrenteService(supabase, tenantId);
}
