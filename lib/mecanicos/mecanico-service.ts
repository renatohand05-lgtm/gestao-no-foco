import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  MecanicoDisponibilidade,
  MecanicoEspecialidade,
  MecanicoStatus,
  MecanicoVinculo,
} from "@/lib/mecanicos/constants";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type Mecanico = {
  id: string;
  tenant_id: string;
  profile_id: string | null;
  nome_completo: string;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  data_nascimento: string | null;
  endereco: string | null;
  foto_url: string | null;
  codigo_interno: string | null;
  funcao: string | null;
  nivel: string | null;
  especialidade: MecanicoEspecialidade;
  data_admissao: string | null;
  tipo_vinculo: MecanicoVinculo;
  unidade_id: string | null;
  centro_custo_id: string | null;
  supervisor_id: string | null;
  status: MecanicoStatus;
  disponibilidade: MecanicoDisponibilidade;
  horas_mensais_contratadas: number;
  jornada_diaria_horas: number;
  observacoes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MecanicoInput = {
  nome_completo: string;
  cpf?: string | null;
  telefone?: string | null;
  email?: string | null;
  data_nascimento?: string | null;
  endereco?: string | null;
  foto_url?: string | null;
  codigo_interno?: string | null;
  funcao?: string | null;
  nivel?: string | null;
  especialidade?: MecanicoEspecialidade;
  data_admissao?: string | null;
  tipo_vinculo?: MecanicoVinculo;
  unidade_id?: string | null;
  centro_custo_id?: string | null;
  supervisor_id?: string | null;
  profile_id?: string | null;
  status?: MecanicoStatus;
  disponibilidade?: MecanicoDisponibilidade;
  horas_mensais_contratadas?: number;
  jornada_diaria_horas?: number;
  observacoes?: string | null;
};

export type MecanicoAuditoria = {
  id: string;
  entidade_tipo: string;
  entidade_id: string;
  acao: string;
  valor_anterior: unknown;
  valor_novo: unknown;
  motivo: string | null;
  usuario_id: string | null;
  created_at: string;
};

function emptyToNull(v?: string | null): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t ? t : null;
}

export class MecanicoService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async list(filters?: {
    status?: MecanicoStatus | "all";
    especialidade?: string;
    search?: string;
    incluirArquivados?: boolean;
  }): Promise<Mecanico[]> {
    let query = this.supabase
      .from("mecanicos" as never)
      .select("*")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .order("nome_completo");

    if (!filters?.incluirArquivados) {
      query = query.neq("status", "arquivado");
    }
    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }
    if (filters?.especialidade) {
      query = query.eq("especialidade", filters.especialidade);
    }
    if (filters?.search?.trim()) {
      const s = `%${filters.search.trim()}%`;
      query = query.or(
        `nome_completo.ilike.${s},codigo_interno.ilike.${s},cpf.ilike.${s}`,
      );
    }

    const { data, error } = await query;
    if (error) {
      if (/relation.*does not exist|Could not find/i.test(error.message)) {
        return [];
      }
      throw new Error(error.message);
    }
    return (data ?? []) as unknown as Mecanico[];
  }

  async listDisponiveis(): Promise<Mecanico[]> {
    const all = await this.list({ status: "ativo" });
    return all.filter(
      (m) =>
        !["afastado", "ferias", "inativo"].includes(m.disponibilidade) &&
        m.status === "ativo",
    );
  }

  async getById(id: string): Promise<Mecanico | null> {
    const { data, error } = await this.supabase
      .from("mecanicos" as never)
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as unknown as Mecanico | null;
  }

  async create(input: MecanicoInput): Promise<Mecanico> {
    const { data, error } = await this.supabase
      .from("mecanicos" as never)
      .insert({
        tenant_id: this.tenantId,
        nome_completo: input.nome_completo.trim(),
        cpf: emptyToNull(input.cpf),
        telefone: emptyToNull(input.telefone),
        email: emptyToNull(input.email),
        data_nascimento: emptyToNull(input.data_nascimento),
        endereco: emptyToNull(input.endereco),
        foto_url: emptyToNull(input.foto_url),
        codigo_interno: emptyToNull(input.codigo_interno),
        funcao: emptyToNull(input.funcao),
        nivel: emptyToNull(input.nivel),
        especialidade: input.especialidade ?? "mecanica_geral",
        data_admissao: emptyToNull(input.data_admissao),
        tipo_vinculo: input.tipo_vinculo ?? "clt",
        unidade_id: emptyToNull(input.unidade_id),
        centro_custo_id: emptyToNull(input.centro_custo_id),
        supervisor_id: emptyToNull(input.supervisor_id),
        profile_id: emptyToNull(input.profile_id),
        status: input.status ?? "ativo",
        disponibilidade: input.disponibilidade ?? "disponivel",
        horas_mensais_contratadas: input.horas_mensais_contratadas ?? 176,
        jornada_diaria_horas: input.jornada_diaria_horas ?? 8,
        observacoes: emptyToNull(input.observacoes),
      } as never)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const row = data as unknown as Mecanico;
    await this.audit("mecanico", row.id, "criar", null, row);
    return row;
  }

  async update(id: string, input: Partial<MecanicoInput>): Promise<Mecanico> {
    const before = await this.getById(id);
    if (!before) throw new Error("Mecânico não encontrado.");

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.nome_completo != null) {
      payload.nome_completo = input.nome_completo.trim();
    }
    if (input.cpf !== undefined) payload.cpf = emptyToNull(input.cpf);
    if (input.telefone !== undefined) {
      payload.telefone = emptyToNull(input.telefone);
    }
    if (input.email !== undefined) payload.email = emptyToNull(input.email);
    if (input.data_nascimento !== undefined) {
      payload.data_nascimento = emptyToNull(input.data_nascimento);
    }
    if (input.endereco !== undefined) {
      payload.endereco = emptyToNull(input.endereco);
    }
    if (input.foto_url !== undefined) {
      payload.foto_url = emptyToNull(input.foto_url);
    }
    if (input.codigo_interno !== undefined) {
      payload.codigo_interno = emptyToNull(input.codigo_interno);
    }
    if (input.funcao !== undefined) payload.funcao = emptyToNull(input.funcao);
    if (input.nivel !== undefined) payload.nivel = emptyToNull(input.nivel);
    if (input.especialidade != null) payload.especialidade = input.especialidade;
    if (input.data_admissao !== undefined) {
      payload.data_admissao = emptyToNull(input.data_admissao);
    }
    if (input.tipo_vinculo != null) payload.tipo_vinculo = input.tipo_vinculo;
    if (input.unidade_id !== undefined) {
      payload.unidade_id = emptyToNull(input.unidade_id);
    }
    if (input.centro_custo_id !== undefined) {
      payload.centro_custo_id = emptyToNull(input.centro_custo_id);
    }
    if (input.supervisor_id !== undefined) {
      payload.supervisor_id = emptyToNull(input.supervisor_id);
    }
    if (input.profile_id !== undefined) {
      payload.profile_id = emptyToNull(input.profile_id);
    }
    if (input.status != null) payload.status = input.status;
    if (input.disponibilidade != null) {
      payload.disponibilidade = input.disponibilidade;
    }
    if (input.horas_mensais_contratadas != null) {
      payload.horas_mensais_contratadas = input.horas_mensais_contratadas;
    }
    if (input.jornada_diaria_horas != null) {
      payload.jornada_diaria_horas = input.jornada_diaria_horas;
    }
    if (input.observacoes !== undefined) {
      payload.observacoes = emptyToNull(input.observacoes);
    }

    const { data, error } = await this.supabase
      .from("mecanicos" as never)
      .update(payload as never)
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const row = data as unknown as Mecanico;
    const acao =
      before.tipo_vinculo !== row.tipo_vinculo
        ? "alteracao_vinculo"
        : before.centro_custo_id !== row.centro_custo_id
          ? "mudanca_centro_custo"
          : "alterar";
    await this.audit("mecanico", id, acao, before, row);
    return row;
  }

  async setStatus(
    id: string,
    status: MecanicoStatus,
    motivo?: string,
  ): Promise<Mecanico> {
    return this.update(id, { status }).then(async (row) => {
      await this.audit(
        "mecanico",
        id,
        status === "arquivado"
          ? "arquivar"
          : status === "inativo"
            ? "inativar"
            : "restaurar",
        null,
        { status },
        motivo,
      );
      return row;
    });
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("mecanicos" as never)
      .update({
        deleted_at: new Date().toISOString(),
        status: "arquivado",
      } as never)
      .eq("tenant_id", this.tenantId)
      .eq("id", id);
    if (error) throw new Error(error.message);
    await this.audit("mecanico", id, "excluir", null, null);
  }

  async listAuditoria(entidadeId: string): Promise<MecanicoAuditoria[]> {
    const { data, error } = await this.supabase
      .from("mecanico_auditoria" as never)
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("entidade_id", entidadeId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      if (/relation.*does not exist|Could not find/i.test(error.message)) {
        return [];
      }
      throw new Error(error.message);
    }
    return (data ?? []) as unknown as MecanicoAuditoria[];
  }

  async audit(
    entidadeTipo: string,
    entidadeId: string,
    acao: string,
    anterior: unknown,
    novo: unknown,
    motivo?: string,
  ): Promise<void> {
    await this.supabase.from("mecanico_auditoria" as never).insert({
      tenant_id: this.tenantId,
      entidade_tipo: entidadeTipo,
      entidade_id: entidadeId,
      acao,
      valor_anterior: anterior,
      valor_novo: novo,
      motivo: motivo ?? null,
    } as never);
  }
}

export async function createMecanicoService(tenantId: string) {
  const supabase = await createClient();
  return new MecanicoService(supabase, tenantId);
}
