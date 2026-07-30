/**
 * Sprint 24.1 / 24.2 — Contatos múltiplos do cliente (Supabase).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { ClienteContatoRow } from "@/types/crm-enterprise";

import {
  assertCrmTenantMatch,
  ensureSinglePrincipalContatos,
} from "./filter-engine.ts";

export type ContatoInput = {
  nome: string;
  cargo?: string | null;
  email?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  principal?: boolean;
  ativo?: boolean;
  observacoes?: string | null;
};

export class ClienteContatoService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async listByCliente(clienteId: string): Promise<ClienteContatoRow[]> {
    await this.assertClienteTenant(clienteId);
    const { data, error } = await this.supabase
      .from("cliente_contatos")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("cliente_id", clienteId)
      .is("deleted_at", null)
      .order("principal", { ascending: false })
      .order("nome", { ascending: true });

    if (error) {
      throw new Error(`Falha ao ler cliente_contatos: ${error.message}`);
    }
    return (data ?? []) as ClienteContatoRow[];
  }

  async create(
    clienteId: string,
    input: ContatoInput,
    userId: string | null,
  ): Promise<ClienteContatoRow> {
    await this.assertClienteTenant(clienteId);
    const nome = input.nome?.trim();
    if (!nome) throw new Error("Nome do contato é obrigatório.");

    if (input.principal) {
      await this.clearPrincipal(clienteId);
    }

    const { data, error } = await this.supabase
      .from("cliente_contatos")
      .insert({
        tenant_id: this.tenantId,
        cliente_id: clienteId,
        nome,
        cargo: input.cargo?.trim() || null,
        email: input.email?.trim() || null,
        telefone: input.telefone?.trim() || null,
        whatsapp: input.whatsapp?.trim() || null,
        principal: Boolean(input.principal),
        ativo: input.ativo ?? true,
        observacoes: input.observacoes?.trim() || null,
        created_by: userId,
        updated_by: userId,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const row = data as ClienteContatoRow;
    assertCrmTenantMatch(this.tenantId, row.tenant_id, "contato.create");
    return row;
  }

  async update(
    contatoId: string,
    input: Partial<ContatoInput>,
    userId: string | null,
  ): Promise<ClienteContatoRow> {
    const current = await this.getById(contatoId);
    if (input.principal) {
      await this.clearPrincipal(current.cliente_id, contatoId);
    }

    const { data, error } = await this.supabase
      .from("cliente_contatos")
      .update({
        ...(input.nome != null ? { nome: input.nome.trim() } : {}),
        ...(input.cargo !== undefined ? { cargo: input.cargo?.trim() || null } : {}),
        ...(input.email !== undefined ? { email: input.email?.trim() || null } : {}),
        ...(input.telefone !== undefined
          ? { telefone: input.telefone?.trim() || null }
          : {}),
        ...(input.whatsapp !== undefined
          ? { whatsapp: input.whatsapp?.trim() || null }
          : {}),
        ...(input.principal !== undefined ? { principal: input.principal } : {}),
        ...(input.ativo !== undefined ? { ativo: input.ativo } : {}),
        ...(input.observacoes !== undefined
          ? { observacoes: input.observacoes?.trim() || null }
          : {}),
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", contatoId)
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data as ClienteContatoRow;
  }

  async softDelete(contatoId: string, userId: string | null): Promise<void> {
    const { error } = await this.supabase
      .from("cliente_contatos")
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: userId,
        principal: false,
      })
      .eq("id", contatoId)
      .eq("tenant_id", this.tenantId);
    if (error) throw new Error(error.message);
  }

  validatePrincipalRule(contatos: ClienteContatoRow[]) {
    return ensureSinglePrincipalContatos(contatos);
  }

  private async getById(id: string): Promise<ClienteContatoRow> {
    const { data, error } = await this.supabase
      .from("cliente_contatos")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Contato não encontrado.");
    const row = data as ClienteContatoRow;
    assertCrmTenantMatch(this.tenantId, row.tenant_id, "contato.get");
    return row;
  }

  private async clearPrincipal(clienteId: string, exceptId?: string) {
    let q = this.supabase
      .from("cliente_contatos")
      .update({ principal: false })
      .eq("tenant_id", this.tenantId)
      .eq("cliente_id", clienteId)
      .is("deleted_at", null);
    if (exceptId) q = q.neq("id", exceptId);
    const { error } = await q;
    if (error) throw new Error(error.message);
  }

  private async assertClienteTenant(clienteId: string) {
    const { data, error } = await this.supabase
      .from("clientes")
      .select("id, tenant_id")
      .eq("id", clienteId)
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Cliente não encontrado neste tenant.");
  }
}

export async function createClienteContatoService(tenantId: string) {
  const supabase = await createClient();
  return new ClienteContatoService(supabase, tenantId);
}
