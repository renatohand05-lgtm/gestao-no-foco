import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type KitchenExecStatus = "pendente" | "em_execucao" | "concluido";

export type KitchenItem = {
  itemId: string;
  osId: string;
  osNumero: number;
  descricao: string;
  quantidade: number;
  execucaoStatus: KitchenExecStatus;
  aprovado: boolean;
  createdAt: string;
};

/** Status de OS considerados "fechados" — não aparecem mais na cozinha. */
const CLOSED_OS_STATUSES = ["entregue", "faturado", "cancelado"];

/**
 * Itens de comandas abertas, dos tipos servíveis (produto/combo — não
 * matéria-prima). Reaproveita ordem_servico_itens (mesma tabela da oficina),
 * só filtra e reagrupa pra visão de cozinha.
 */
export async function listKitchenItems(
  client: SupabaseClient,
  tenantId: string,
): Promise<KitchenItem[]> {
  const { data, error } = await client
    .from("ordem_servico_itens")
    .select(
      "id, ordem_servico_id, descricao, quantidade, execucao_status, aprovacao_status, tipo_item, created_at, ordens_servico!inner(id, numero, status, tenant_id, deleted_at)",
    )
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .in("tipo_item", ["produto", "combo"])
    .not("execucao_status", "eq", "cancelado")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  type Row = {
    id: string;
    ordem_servico_id: string;
    descricao: string;
    quantidade: number;
    execucao_status: string;
    aprovacao_status: string;
    created_at: string;
    ordens_servico: {
      id: string;
      numero: number;
      status: string;
      deleted_at: string | null;
    } | null;
  };

  return ((data ?? []) as unknown as Row[])
    .filter(
      (row) =>
        row.ordens_servico &&
        !row.ordens_servico.deleted_at &&
        !CLOSED_OS_STATUSES.includes(row.ordens_servico.status),
    )
    .map((row) => ({
      itemId: row.id,
      osId: row.ordem_servico_id,
      osNumero: row.ordens_servico!.numero,
      descricao: row.descricao,
      quantidade: Number(row.quantidade),
      execucaoStatus:
        row.execucao_status === "em_execucao" ||
        row.execucao_status === "concluido"
          ? (row.execucao_status as KitchenExecStatus)
          : "pendente",
      aprovado:
        row.aprovacao_status === "aprovado" ||
        row.aprovacao_status === "approved",
      createdAt: row.created_at,
    }));
}
