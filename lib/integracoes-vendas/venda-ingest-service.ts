import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type ExternalVendaItemInput = {
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  desconto?: number;
};

export type ExternalVendaInput = {
  /** ID de cliente já cadastrado no Gestão no Foco, se conhecido. */
  cliente_id?: string;
  /** Se cliente_id não vier, cria (ou reaproveita) um cliente com esses dados. */
  cliente_nome?: string;
  cliente_documento?: string;
  cliente_telefone?: string;
  data_venda?: string;
  forma_pagamento?: string;
  observacoes?: string;
  /** Identificador da venda no sistema de origem — vira parte da idempotência. */
  id_externo: string;
  itens: ExternalVendaItemInput[];
};

export type IngestOutcome =
  | { ok: true; vendaId: string; vendaNumero: number }
  | { ok: false; error: string };

function validatePayload(payload: unknown): ExternalVendaInput | { error: string } {
  if (!payload || typeof payload !== "object") {
    return { error: "Corpo da requisição precisa ser um objeto JSON." };
  }
  const p = payload as Record<string, unknown>;

  if (typeof p.id_externo !== "string" || !p.id_externo.trim()) {
    return { error: "Campo 'id_externo' é obrigatório." };
  }
  if (!p.cliente_id && !p.cliente_nome) {
    return { error: "Informe 'cliente_id' ou 'cliente_nome'." };
  }
  if (!Array.isArray(p.itens) || p.itens.length === 0) {
    return { error: "Campo 'itens' precisa ser uma lista não vazia." };
  }

  const itens: ExternalVendaItemInput[] = [];
  for (const raw of p.itens) {
    if (!raw || typeof raw !== "object") {
      return { error: "Cada item precisa ser um objeto." };
    }
    const item = raw as Record<string, unknown>;
    const descricao = typeof item.descricao === "string" ? item.descricao.trim() : "";
    const quantidade = Number(item.quantidade);
    const valorUnitario = Number(item.valor_unitario);
    const desconto = item.desconto != null ? Number(item.desconto) : 0;

    if (!descricao) return { error: "Item sem 'descricao'." };
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      return { error: `Item '${descricao}': 'quantidade' precisa ser > 0.` };
    }
    if (!Number.isFinite(valorUnitario) || valorUnitario < 0) {
      return { error: `Item '${descricao}': 'valor_unitario' inválido.` };
    }
    if (!Number.isFinite(desconto) || desconto < 0) {
      return { error: `Item '${descricao}': 'desconto' inválido.` };
    }

    itens.push({ descricao, quantidade, valor_unitario: valorUnitario, desconto });
  }

  return {
    cliente_id: typeof p.cliente_id === "string" ? p.cliente_id : undefined,
    cliente_nome: typeof p.cliente_nome === "string" ? p.cliente_nome : undefined,
    cliente_documento:
      typeof p.cliente_documento === "string" ? p.cliente_documento : undefined,
    cliente_telefone:
      typeof p.cliente_telefone === "string" ? p.cliente_telefone : undefined,
    data_venda: typeof p.data_venda === "string" ? p.data_venda : undefined,
    forma_pagamento: typeof p.forma_pagamento === "string" ? p.forma_pagamento : undefined,
    observacoes: typeof p.observacoes === "string" ? p.observacoes : undefined,
    id_externo: p.id_externo,
    itens,
  };
}

async function resolveClienteId(
  supabase: SupabaseClient,
  tenantId: string,
  input: ExternalVendaInput,
): Promise<string> {
  if (input.cliente_id) {
    const { data, error } = await supabase
      .from("clientes")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("id", input.cliente_id)
      .is("deleted_at", null)
      .maybeSingle<{ id: string }>();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("cliente_id informado não pertence a esta empresa.");
    return data.id;
  }

  // Reaproveita cliente existente pelo documento, se informado.
  if (input.cliente_documento) {
    const { data } = await supabase
      .from("clientes")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("documento", input.cliente_documento)
      .is("deleted_at", null)
      .maybeSingle<{ id: string }>();
    if (data) return data.id;
  }

  const { data: created, error } = await supabase
    .from("clientes")
    .insert({
      tenant_id: tenantId,
      nome: input.cliente_nome,
      documento: input.cliente_documento ?? null,
      telefone: input.cliente_telefone ?? null,
      tipo_pessoa: "pf",
      origem: "integracao_externa",
      ativo: true,
    } as never)
    .select("id")
    .single<{ id: string }>();

  if (error || !created) {
    throw new Error(error?.message ?? "Falha ao criar o cliente.");
  }
  return created.id;
}

/**
 * Cria a venda a partir de um payload externo. Sempre entra como
 * "em_andamento" — nunca fatura sozinha, nunca mexe no financeiro sem
 * revisão humana antes.
 */
export async function ingestExternalVenda(
  supabase: SupabaseClient,
  tenantId: string,
  rawPayload: unknown,
): Promise<IngestOutcome> {
  const validated = validatePayload(rawPayload);
  if ("error" in validated) {
    return { ok: false, error: validated.error };
  }

  try {
    const clienteId = await resolveClienteId(supabase, tenantId, validated);

    const subtotal = validated.itens.reduce(
      (acc, i) => acc + i.quantidade * i.valor_unitario,
      0,
    );
    const descontoTotal = validated.itens.reduce((acc, i) => acc + (i.desconto ?? 0), 0);
    const total = Math.max(subtotal - descontoTotal, 0);

    const { data: venda, error: vendaError } = await supabase
      .from("vendas")
      .insert({
        tenant_id: tenantId,
        cliente_id: clienteId,
        data_venda: validated.data_venda ?? new Date().toISOString().slice(0, 10),
        status: "em_andamento",
        subtotal,
        desconto_total: descontoTotal,
        total,
        forma_pagamento: validated.forma_pagamento ?? null,
        observacoes:
          validated.observacoes ??
          `Importado via integração externa (ref: ${validated.id_externo})`,
        canal_venda: "outro",
      } as never)
      .select("id, numero")
      .single<{ id: string; numero: number }>();

    if (vendaError || !venda) {
      throw new Error(vendaError?.message ?? "Falha ao criar a venda.");
    }

    const itensPayload = validated.itens.map((item, index) => ({
      tenant_id: tenantId,
      venda_id: venda.id,
      produto_id: null,
      descricao: item.descricao,
      tipo_item: "servico" as const,
      quantidade: item.quantidade,
      preco_unitario: item.valor_unitario,
      desconto: item.desconto ?? 0,
      total: Math.max(
        item.quantidade * item.valor_unitario - (item.desconto ?? 0),
        0,
      ),
      ordem: index,
    }));

    const { error: itensError } = await supabase
      .from("venda_itens")
      .insert(itensPayload as never);

    if (itensError) {
      // reverte a venda pra não deixar cabeçalho órfão sem itens
      await supabase.from("vendas").delete().eq("id", venda.id);
      throw new Error(itensError.message);
    }

    return { ok: true, vendaId: venda.id, vendaNumero: venda.numero };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha ao processar a venda.",
    };
  }
}
