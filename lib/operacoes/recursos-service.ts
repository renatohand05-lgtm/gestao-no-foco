import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export const RECURSO_TIPOS = [
  "elevador",
  "rampa",
  "box",
  "equipamento",
] as const;

export type RecursoTipo = (typeof RECURSO_TIPOS)[number];

export const RECURSO_STATUS = [
  "disponivel",
  "ocupado",
  "reservado",
  "manutencao",
  "bloqueado",
] as const;

export type RecursoStatus = (typeof RECURSO_STATUS)[number];

export type OficinaRecurso = {
  id: string;
  nome: string;
  codigo: string | null;
  tipo: string;
  status: string;
  capacidade: number | null;
  centroCustoId: string | null;
  ordemServicoId: string | null;
  observacoes: string | null;
  dataManutencao: string | null;
  proximaManutencao: string | null;
  responsavelId: string | null;
  ativo: boolean;
  utilizado: boolean;
  arquivadoEm: string | null;
};

export type RecursoFormInput = {
  nome: string;
  codigo?: string | null;
  tipo: RecursoTipo;
  status?: RecursoStatus;
  capacidade?: number | null;
  centro_custo_id?: string | null;
  observacoes?: string | null;
  data_manutencao?: string | null;
  proxima_manutencao?: string | null;
  responsavel_id?: string | null;
  ativo?: boolean;
};

export type RecursosOcupacaoData = {
  recursos: OficinaRecurso[];
  kpis: {
    total: number;
    disponivel: number;
    ocupado: number;
    reservado: number;
    manutencao: number;
    bloqueado: number;
    taxaOcupacao: number;
  };
  migrationPending: boolean;
};

function mapRow(r: Record<string, unknown>): OficinaRecurso {
  return {
    id: String(r.id),
    nome: String(r.nome),
    codigo: (r.codigo as string | null) ?? null,
    tipo: String(r.tipo),
    status: String(r.status),
    capacidade: r.capacidade != null ? Number(r.capacidade) : null,
    centroCustoId: (r.centro_custo_id as string | null) ?? null,
    ordemServicoId: (r.ordem_servico_id as string | null) ?? null,
    observacoes: (r.observacoes as string | null) ?? null,
    dataManutencao: (r.data_manutencao as string | null) ?? null,
    proximaManutencao: (r.proxima_manutencao as string | null) ?? null,
    responsavelId: (r.responsavel_id as string | null) ?? null,
    ativo: Boolean(r.ativo ?? true),
    utilizado: Boolean(r.utilizado ?? false),
    arquivadoEm: (r.arquivado_em as string | null) ?? null,
  };
}

export class RecursosOcupacaoService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async getData(incluirArquivados = false): Promise<RecursosOcupacaoData> {
    let query = this.supabase
      .from("oficina_recursos")
      .select(
        "id, nome, codigo, tipo, status, capacidade, centro_custo_id, ordem_servico_id, observacoes, data_manutencao, proxima_manutencao, responsavel_id, ativo, utilizado, arquivado_em",
      )
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .order("nome");

    if (!incluirArquivados) {
      query = query.is("arquivado_em", null);
    }

    const { data, error } = await query;

    if (error) {
      // colunas Gate 2 ainda não aplicadas — fallback mínimo
      const fallback = await this.supabase
        .from("oficina_recursos")
        .select("id, nome, tipo, status, ordem_servico_id, observacoes, ativo")
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .order("nome");
      if (fallback.error) {
        return {
          recursos: [],
          kpis: emptyKpis(),
          migrationPending: true,
        };
      }
      const recursos = (fallback.data ?? []).map((r) =>
        mapRow({ ...r, codigo: null, utilizado: false, arquivado_em: null }),
      );
      return { recursos, kpis: calcKpis(recursos), migrationPending: false };
    }

    const recursos = (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
    return { recursos, kpis: calcKpis(recursos), migrationPending: false };
  }

  async listDisponiveis(): Promise<OficinaRecurso[]> {
    const { recursos } = await this.getData();
    return recursos.filter(
      (r) =>
        r.ativo &&
        !r.arquivadoEm &&
        (r.status === "disponivel" || r.status === "reservado"),
    );
  }

  async create(input: RecursoFormInput): Promise<string> {
    const { data, error } = await this.supabase
      .from("oficina_recursos")
      .insert({
        tenant_id: this.tenantId,
        nome: input.nome.trim(),
        codigo: input.codigo?.trim() || null,
        tipo: input.tipo,
        status: input.status ?? "disponivel",
        capacidade: input.capacidade ?? null,
        centro_custo_id: input.centro_custo_id || null,
        observacoes: input.observacoes?.trim() || null,
        data_manutencao: input.data_manutencao || null,
        proxima_manutencao: input.proxima_manutencao || null,
        responsavel_id: input.responsavel_id || null,
        ativo: input.ativo ?? true,
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return data.id as string;
  }

  async update(id: string, input: Partial<RecursoFormInput>): Promise<void> {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.nome != null) payload.nome = input.nome.trim();
    if (input.codigo !== undefined) payload.codigo = input.codigo?.trim() || null;
    if (input.tipo != null) payload.tipo = input.tipo;
    if (input.status != null) payload.status = input.status;
    if (input.capacidade !== undefined) payload.capacidade = input.capacidade;
    if (input.centro_custo_id !== undefined) {
      payload.centro_custo_id = input.centro_custo_id || null;
    }
    if (input.observacoes !== undefined) {
      payload.observacoes = input.observacoes?.trim() || null;
    }
    if (input.data_manutencao !== undefined) {
      payload.data_manutencao = input.data_manutencao || null;
    }
    if (input.proxima_manutencao !== undefined) {
      payload.proxima_manutencao = input.proxima_manutencao || null;
    }
    if (input.responsavel_id !== undefined) {
      payload.responsavel_id = input.responsavel_id || null;
    }
    if (input.ativo !== undefined) payload.ativo = input.ativo;

    const { error } = await this.supabase
      .from("oficina_recursos")
      .update(payload as never)
      .eq("id", id)
      .eq("tenant_id", this.tenantId);
    if (error) throw new Error(error.message);
  }

  async setStatus(id: string, status: RecursoStatus): Promise<void> {
    const { error } = await this.supabase
      .from("oficina_recursos")
      .update({ status, updated_at: new Date().toISOString() } as never)
      .eq("id", id)
      .eq("tenant_id", this.tenantId);
    if (error) throw new Error(error.message);
  }

  /** Soft-delete se nunca usado; senão arquiva. */
  async removeOrArchive(id: string): Promise<"excluido" | "arquivado"> {
    const { data, error } = await this.supabase
      .from("oficina_recursos")
      .select("id, utilizado, ordem_servico_id")
      .eq("id", id)
      .eq("tenant_id", this.tenantId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Recurso não encontrado.");

    const row = data as { utilizado?: boolean; ordem_servico_id?: string | null };
    if (row.ordem_servico_id) {
      throw new Error("Libere a OS vinculada antes de remover o recurso.");
    }

    if (row.utilizado) {
      const { error: archErr } = await this.supabase
        .from("oficina_recursos")
        .update({
          arquivado_em: new Date().toISOString(),
          ativo: false,
          status: "bloqueado",
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", id)
        .eq("tenant_id", this.tenantId);
      if (archErr) throw new Error(archErr.message);
      return "arquivado";
    }

    const { error: delErr } = await this.supabase
      .from("oficina_recursos")
      .update({
        deleted_at: new Date().toISOString(),
        ativo: false,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", id)
      .eq("tenant_id", this.tenantId);
    if (delErr) throw new Error(delErr.message);
    return "excluido";
  }

  async vincularOs(
    ordemId: string,
    recursoId: string | null,
    modo: "ocupar" | "reservar" | "liberar",
    userId: string | null,
  ): Promise<void> {
    const { error } = await this.supabase.rpc("os_vincular_recurso_atomico" as never, {
      p_tenant_id: this.tenantId,
      p_ordem_id: ordemId,
      p_recurso_id: recursoId,
      p_modo: modo,
      p_created_by: userId,
    } as never);
    if (error) throw new Error(error.message);
  }
}

function emptyKpis() {
  return {
    total: 0,
    disponivel: 0,
    ocupado: 0,
    reservado: 0,
    manutencao: 0,
    bloqueado: 0,
    taxaOcupacao: 0,
  };
}

function calcKpis(recursos: OficinaRecurso[]) {
  const ativos = recursos.filter((r) => r.ativo && !r.arquivadoEm);
  const count = (s: string) => ativos.filter((r) => r.status === s).length;
  const total = ativos.length;
  const ocupados = count("ocupado") + count("reservado");
  return {
    total,
    disponivel: count("disponivel"),
    ocupado: count("ocupado"),
    reservado: count("reservado"),
    manutencao: count("manutencao"),
    bloqueado: count("bloqueado"),
    taxaOcupacao: total > 0 ? Number(((ocupados / total) * 100).toFixed(1)) : 0,
  };
}

export async function createRecursosOcupacaoService(tenantId: string) {
  const supabase = await createClient();
  return new RecursosOcupacaoService(supabase, tenantId);
}
