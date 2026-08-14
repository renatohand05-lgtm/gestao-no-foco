import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isBeneficiarioCadastroTipo,
  type BeneficiarioCadastroTipo,
} from "@/lib/financeiro/beneficiario-types";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type FinanceiroBeneficiario = {
  id: string;
  tenant_id: string;
  nome: string;
  tipo: BeneficiarioCadastroTipo;
  documento: string | null;
  telefone: string | null;
  email: string | null;
  observacoes: string | null;
  ativo: boolean;
};

export type FinanceiroBeneficiarioInput = {
  nome: string;
  tipo: BeneficiarioCadastroTipo;
  documento?: string | null;
  telefone?: string | null;
  email?: string | null;
  observacoes?: string | null;
};

export type BeneficiarioOption = {
  id: string;
  nome: string;
  tipo: BeneficiarioCadastroTipo;
  documento: string | null;
};

export type EquipePayeeOption = {
  profileId: string;
  nome: string;
  email: string | null;
  role: string;
};

export type MecanicoPayeeOption = {
  id: string;
  nome: string;
  documento: string | null;
  centroCustoId: string | null;
};

function emptyToNull(v?: string | null): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t.length ? t : null;
}

export class FinanceiroBeneficiarioService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async listAtivos(tipo?: BeneficiarioCadastroTipo): Promise<BeneficiarioOption[]> {
    let query = this.supabase
      .from("financeiro_beneficiarios" as never)
      .select("id, nome, tipo, documento")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (tipo) query = query.eq("tipo", tipo);

    const { data, error } = await query;
    if (error) {
      if (/relation.*does not exist|Could not find the table/i.test(error.message)) {
        return [];
      }
      throw new Error(error.message);
    }
    return ((data ?? []) as BeneficiarioOption[]).filter((row) =>
      isBeneficiarioCadastroTipo(row.tipo),
    );
  }

  async create(input: FinanceiroBeneficiarioInput): Promise<BeneficiarioOption> {
    if (!isBeneficiarioCadastroTipo(input.tipo)) {
      throw new Error("Tipo de beneficiário inválido.");
    }
    const nome = input.nome.trim();
    if (nome.length < 2) {
      throw new Error("Informe o nome do beneficiário.");
    }

    const { data, error } = await this.supabase
      .from("financeiro_beneficiarios" as never)
      .insert({
        tenant_id: this.tenantId,
        nome,
        tipo: input.tipo,
        documento: emptyToNull(input.documento),
        telefone: emptyToNull(input.telefone),
        email: emptyToNull(input.email),
        observacoes: emptyToNull(input.observacoes),
        ativo: true,
      } as never)
      .select("id, nome, tipo, documento")
      .single();

    if (error) throw new Error(error.message);
    return data as BeneficiarioOption;
  }

  async listMecanicosAtivos(): Promise<MecanicoPayeeOption[]> {
    const { data, error } = await this.supabase
      .from("mecanicos" as never)
      .select("id, nome_completo, cpf, centro_custo_id, status")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("status", "ativo")
      .order("nome_completo", { ascending: true })
      .limit(300);

    if (error) {
      if (/relation.*does not exist|Could not find/i.test(error.message)) {
        return [];
      }
      throw new Error(error.message);
    }

    return ((data ?? []) as Array<{
      id: string;
      nome_completo: string;
      cpf: string | null;
      centro_custo_id: string | null;
    }>).map((m) => ({
      id: m.id,
      nome: m.nome_completo,
      documento: m.cpf,
      centroCustoId: m.centro_custo_id,
    }));
  }

  async listEquipeAtiva(): Promise<EquipePayeeOption[]> {
    const { data: members, error } = await this.supabase
      .from("tenant_members")
      .select("user_id, role, status, deactivated_at")
      .eq("tenant_id", this.tenantId)
      .limit(300);

    if (error) {
      // Sem permissão ampla de listar peers — não quebra o form
      return [];
    }

    const active = (members ?? []).filter((m) => {
      const status = (m as { status?: string | null }).status;
      const deactivated = (m as { deactivated_at?: string | null }).deactivated_at;
      if (deactivated) return false;
      return status == null || status === "active";
    }) as Array<{ user_id: string; role: string }>;

    if (active.length === 0) return [];

    const ids = active.map((m) => m.user_id);
    const { data: profiles, error: pErr } = await this.supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids);

    if (pErr) return [];

    const roleByUser = new Map(active.map((m) => [m.user_id, m.role]));
    return ((profiles ?? []) as Array<{
      id: string;
      full_name: string | null;
      email: string;
    }>)
      .map((p) => ({
        profileId: p.id,
        nome: (p.full_name ?? p.email ?? "Membro").trim(),
        email: p.email ?? null,
        role: roleByUser.get(p.id) ?? "member",
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }
}

export async function createFinanceiroBeneficiarioService(tenantId: string) {
  const supabase = await createClient();
  return new FinanceiroBeneficiarioService(supabase, tenantId);
}
