import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type PropostaItemInput = {
  descricao: string;
  quantidade: number;
  valorUnitario: number;
};

export type CreatePropostaInput = {
  oportunidadeId?: string | null;
  clienteId: string;
  titulo: string;
  itens: PropostaItemInput[];
  condicoesPagamento?: string | null;
  validadeDias?: number;
  observacoes?: string | null;
};

export type Proposta = {
  id: string;
  titulo: string;
  clienteId: string;
  clienteNome: string;
  oportunidadeId: string | null;
  itens: PropostaItemInput[];
  valorTotal: number;
  condicoesPagamento: string | null;
  validadeDias: number;
  status: "rascunho" | "enviada" | "aceita" | "recusada";
  storagePath: string | null;
  createdAt: string;
  sentAt: string | null;
};

export async function createProposta(
  supabase: SupabaseClient,
  tenantId: string,
  input: CreatePropostaInput,
  userId: string | null,
): Promise<string> {
  if (input.itens.length === 0) {
    throw new Error("A proposta precisa de pelo menos um item.");
  }

  const valorTotal = input.itens.reduce(
    (acc, i) => acc + i.quantidade * i.valorUnitario,
    0,
  );

  const { data, error } = await supabase
    .from("crm_propostas" as never)
    .insert({
      tenant_id: tenantId,
      oportunidade_id: input.oportunidadeId ?? null,
      cliente_id: input.clienteId,
      titulo: input.titulo,
      itens: input.itens,
      valor_total: valorTotal,
      condicoes_pagamento: input.condicoesPagamento ?? null,
      validade_dias: input.validadeDias ?? 15,
      observacoes: input.observacoes ?? null,
      created_by: userId,
    } as never)
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error(error?.message ?? "Falha ao criar a proposta.");
  }

  return data.id;
}

export async function listPropostas(
  supabase: SupabaseClient,
  tenantId: string,
  oportunidadeId?: string,
): Promise<Proposta[]> {
  let query = supabase
    .from("crm_propostas" as never)
    .select(
      "id, titulo, cliente_id, oportunidade_id, itens, valor_total, condicoes_pagamento, validade_dias, status, storage_path, created_at, sent_at, cliente:clientes(nome)",
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (oportunidadeId) {
    query = query.eq("oportunidade_id", oportunidadeId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (
    (data ?? []) as unknown as Array<{
      id: string;
      titulo: string;
      cliente_id: string;
      oportunidade_id: string | null;
      itens: PropostaItemInput[];
      valor_total: number;
      condicoes_pagamento: string | null;
      validade_dias: number;
      status: "rascunho" | "enviada" | "aceita" | "recusada";
      storage_path: string | null;
      created_at: string;
      sent_at: string | null;
      cliente: { nome: string } | null;
    }>
  ).map((r) => ({
    id: r.id,
    titulo: r.titulo,
    clienteId: r.cliente_id,
    clienteNome: r.cliente?.nome ?? "Cliente",
    oportunidadeId: r.oportunidade_id,
    itens: r.itens,
    valorTotal: r.valor_total,
    condicoesPagamento: r.condicoes_pagamento,
    validadeDias: r.validade_dias,
    status: r.status,
    storagePath: r.storage_path,
    createdAt: r.created_at,
    sentAt: r.sent_at,
  }));
}

export async function getPropostaWithCliente(
  supabase: SupabaseClient,
  tenantId: string,
  propostaId: string,
): Promise<{
  proposta: Omit<Proposta, "clienteNome">;
  cliente: { nome: string; documento: string | null; telefone: string | null; email: string | null };
} | null> {
  const { data, error } = await supabase
    .from("crm_propostas" as never)
    .select(
      "id, titulo, cliente_id, oportunidade_id, itens, valor_total, condicoes_pagamento, validade_dias, status, storage_path, created_at, sent_at, cliente:clientes(nome, documento, telefone, email)",
    )
    .eq("tenant_id", tenantId)
    .eq("id", propostaId)
    .maybeSingle<{
      id: string;
      titulo: string;
      cliente_id: string;
      oportunidade_id: string | null;
      itens: PropostaItemInput[];
      valor_total: number;
      condicoes_pagamento: string | null;
      validade_dias: number;
      status: "rascunho" | "enviada" | "aceita" | "recusada";
      storage_path: string | null;
      created_at: string;
      sent_at: string | null;
      cliente: {
        nome: string;
        documento: string | null;
        telefone: string | null;
        email: string | null;
      } | null;
    }>();

  if (error || !data) return null;

  return {
    proposta: {
      id: data.id,
      titulo: data.titulo,
      clienteId: data.cliente_id,
      oportunidadeId: data.oportunidade_id,
      itens: data.itens,
      valorTotal: data.valor_total,
      condicoesPagamento: data.condicoes_pagamento,
      validadeDias: data.validade_dias,
      status: data.status,
      storagePath: data.storage_path,
      createdAt: data.created_at,
      sentAt: data.sent_at,
    },
    cliente: {
      nome: data.cliente?.nome ?? "Cliente",
      documento: data.cliente?.documento ?? null,
      telefone: data.cliente?.telefone ?? null,
      email: data.cliente?.email ?? null,
    },
  };
}

export async function updatePropostaStatus(
  supabase: SupabaseClient,
  tenantId: string,
  propostaId: string,
  status: "enviada" | "aceita" | "recusada",
  storagePath?: string,
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (status === "enviada") patch.sent_at = new Date().toISOString();
  if (status === "aceita" || status === "recusada") {
    patch.decided_at = new Date().toISOString();
  }
  if (storagePath) patch.storage_path = storagePath;

  const { error } = await supabase
    .from("crm_propostas" as never)
    .update(patch as never)
    .eq("id", propostaId)
    .eq("tenant_id", tenantId);

  if (error) throw new Error(error.message);
}
