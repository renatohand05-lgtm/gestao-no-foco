import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type DeliveryStatus = "em_execucao" | "pronto_para_entrega";

export type DeliveryOrder = {
  osId: string;
  osNumero: number;
  status: DeliveryStatus;
  valorTotal: number;
  clienteNome: string;
  clienteTelefone: string | null;
  endereco: string;
};

function formatEndereco(row: {
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
}): string {
  const parts: string[] = [];
  if (row.rua) {
    parts.push(row.numero ? `${row.rua}, ${row.numero}` : row.rua);
  }
  if (row.complemento) parts.push(row.complemento);
  if (row.bairro) parts.push(row.bairro);
  const cidadeUf = [row.cidade, row.estado].filter(Boolean).join("/");
  if (cidadeUf) parts.push(cidadeUf);
  return parts.length > 0 ? parts.join(" — ") : "Endereço não cadastrado no cliente";
}

/**
 * Comandas de delivery ativas (em preparo ou prontas pra sair) — reaproveita
 * ordens_servico (origem_atendimento = 'delivery') e o cadastro de clientes
 * pro endereço, sem coluna nova no banco.
 */
export async function listDeliveryOrders(
  client: SupabaseClient,
  tenantId: string,
): Promise<DeliveryOrder[]> {
  const { data, error } = await client
    .from("ordens_servico")
    .select(
      "id, numero, status, valor_total, cliente_id, clientes:cliente_id(nome, telefone, whatsapp, rua, numero, complemento, bairro, cidade, estado)",
    )
    .eq("tenant_id", tenantId)
    .eq("origem_atendimento", "delivery")
    .is("deleted_at", null)
    .in("status", ["em_execucao", "pronto_para_entrega"])
    .order("numero", { ascending: true });
  if (error) throw new Error(error.message);

  type Row = {
    id: string;
    numero: number;
    status: string;
    valor_total: number;
    clientes: {
      nome: string;
      telefone: string | null;
      whatsapp: string | null;
      rua: string | null;
      numero: string | null;
      complemento: string | null;
      bairro: string | null;
      cidade: string | null;
      estado: string | null;
    } | null;
  };

  return ((data ?? []) as unknown as Row[]).map((row) => ({
    osId: row.id,
    osNumero: row.numero,
    status: row.status as DeliveryStatus,
    valorTotal: Number(row.valor_total ?? 0),
    clienteNome: row.clientes?.nome ?? "Cliente balcão",
    clienteTelefone: row.clientes?.whatsapp || row.clientes?.telefone || null,
    endereco: row.clientes
      ? formatEndereco(row.clientes)
      : "Endereço não cadastrado no cliente",
  }));
}
