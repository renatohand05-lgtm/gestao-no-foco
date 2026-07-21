import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { ClienteTarefa } from "@/types/crm";
import type { CrmTarefaStatus, CrmTarefaTipo } from "@/lib/crm/constants";

function normalizeTarefa(row: ClienteTarefa): ClienteTarefa {
  return {
    ...row,
    checklist: Array.isArray(row.checklist) ? row.checklist : [],
  };
}

export class ClienteTarefaService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly tenantId: string,
  ) {}

  async listByCliente(clienteId: string): Promise<ClienteTarefa[]> {
    const { data, error } = await this.supabase
      .from("cliente_tarefas" as never)
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("cliente_id", clienteId)
      .is("deleted_at", null)
      .order("data_vencimento", { ascending: true, nullsFirst: false });

    if (error) {
      if (/cliente_tarefas|schema cache|does not exist/i.test(error.message)) {
        return [];
      }
      throw new Error(error.message);
    }
    return (data ?? []).map((row) => normalizeTarefa(row as ClienteTarefa));
  }

  async listAbertas(limit = 100): Promise<ClienteTarefa[]> {
    const { data, error } = await this.supabase
      .from("cliente_tarefas" as never)
      .select("*")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .in("status", ["pendente", "em_andamento"])
      .order("data_vencimento", { ascending: true, nullsFirst: false })
      .limit(limit);

    if (error) {
      if (/cliente_tarefas|schema cache|does not exist/i.test(error.message)) {
        return [];
      }
      throw new Error(error.message);
    }
    return (data ?? []).map((row) => normalizeTarefa(row as ClienteTarefa));
  }

  async create(
    input: {
      cliente_id: string;
      tipo: CrmTarefaTipo;
      titulo: string;
      descricao?: string | null;
      data_vencimento?: string | null;
      responsavel_id?: string | null;
      prioridade?: string;
    },
    userId: string | null,
  ): Promise<ClienteTarefa> {
    const { data, error } = await this.supabase
      .from("cliente_tarefas" as never)
      .insert({
        tenant_id: this.tenantId,
        cliente_id: input.cliente_id,
        tipo: input.tipo,
        titulo: input.titulo,
        descricao: input.descricao ?? null,
        data_vencimento: input.data_vencimento ?? null,
        responsavel_id: input.responsavel_id ?? null,
        prioridade: input.prioridade ?? "normal",
        created_by: userId,
      } as never)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return normalizeTarefa(data as ClienteTarefa);
  }

  async updateStatus(id: string, status: CrmTarefaStatus): Promise<void> {
    const patch: Record<string, unknown> = { status };
    if (status === "concluida") {
      patch.concluida_em = new Date().toISOString();
    }
    const { error } = await this.supabase
      .from("cliente_tarefas" as never)
      .update(patch as never)
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);
  }
}

export async function createClienteTarefaService(tenantId: string) {
  const supabase = await createClient();
  return new ClienteTarefaService(supabase, tenantId);
}
