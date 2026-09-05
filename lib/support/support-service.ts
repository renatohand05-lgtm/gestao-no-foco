import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type SupportMessage = {
  id: string;
  ticketId: string;
  senderId: string;
  senderRole: "tenant_user" | "platform_owner";
  body: string;
  createdAt: string;
};

export type SupportTicketSummary = {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  status: "open" | "closed";
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  lastSenderRole: "tenant_user" | "platform_owner" | null;
  unreadForOwner: number;
};

type TicketRow = {
  id: string;
  tenant_id: string;
  status: "open" | "closed";
  created_at: string;
  updated_at: string;
  last_message_at: string;
  last_message_preview: string | null;
  last_sender_role: "tenant_user" | "platform_owner" | null;
};

type MessageRow = {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: "tenant_user" | "platform_owner";
  body: string;
  created_at: string;
};

function mapMessage(row: MessageRow): SupportMessage {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    senderId: row.sender_id,
    senderRole: row.sender_role,
    body: row.body,
    createdAt: row.created_at,
  };
}

/** Busca (ou cria) o ticket aberto do tenant — cada tenant só tem 1 conversa ativa por vez. */
export async function getOrCreateOpenTicket(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
): Promise<string> {
  const { data: existing } = await client
    .from("support_tickets" as never)
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("status", "open")
    .maybeSingle<{ id: string }>();

  if (existing) return existing.id;

  const { data: created, error } = await client
    .from("support_tickets" as never)
    .insert({ tenant_id: tenantId, opened_by: userId } as never)
    .select("id")
    .single<{ id: string }>();

  if (error || !created) {
    throw new Error(error?.message ?? "Não foi possível abrir o ticket.");
  }

  return created.id;
}

/** Conversa do lado do tenant: ticket aberto (se houver) + últimas mensagens. */
export async function getTenantConversation(
  client: SupabaseClient,
  tenantId: string,
): Promise<{ ticketId: string | null; messages: SupportMessage[] }> {
  const { data: ticket } = await client
    .from("support_tickets" as never)
    .select("id")
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (!ticket) return { ticketId: null, messages: [] };

  const { data: messages } = await client
    .from("support_messages" as never)
    .select("id, ticket_id, sender_id, sender_role, body, created_at")
    .eq("ticket_id", ticket.id)
    .order("created_at", { ascending: true })
    .limit(200);

  return {
    ticketId: ticket.id,
    messages: ((messages ?? []) as MessageRow[]).map(mapMessage),
  };
}

export async function sendTenantMessage(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
  body: string,
): Promise<void> {
  const ticketId = await getOrCreateOpenTicket(client, tenantId, userId);

  const { error } = await client.from("support_messages" as never).insert({
    ticket_id: ticketId,
    sender_id: userId,
    sender_role: "tenant_user",
    body,
    read_by_tenant: true,
    read_by_owner: false,
  } as never);

  if (error) throw new Error(error.message);
}

export async function markTenantRead(
  client: SupabaseClient,
  ticketId: string,
): Promise<void> {
  await client
    .from("support_messages" as never)
    .update({ read_by_tenant: true } as never)
    .eq("ticket_id", ticketId)
    .eq("read_by_tenant", false);
}

/** Lado do dono: todos os tickets, com nome da empresa e contagem de não lidas. */
export async function listTicketsForOwner(
  client: SupabaseClient,
): Promise<SupportTicketSummary[]> {
  const { data: tickets } = await client
    .from("support_tickets" as never)
    .select(
      "id, tenant_id, status, created_at, updated_at, last_message_at, last_message_preview, last_sender_role",
    )
    .order("last_message_at", { ascending: false })
    .limit(200);

  const rows = (tickets ?? []) as TicketRow[];
  if (!rows.length) return [];

  const tenantIds = [...new Set(rows.map((r) => r.tenant_id))];
  const { data: tenants } = await client
    .from("tenants")
    .select("id, name, slug")
    .in("id", tenantIds);
  const tenantById = new Map(
    ((tenants ?? []) as { id: string; name: string; slug: string }[]).map(
      (t) => [t.id, t],
    ),
  );

  const ticketIds = rows.map((r) => r.id);
  const { data: unreadRows } = await client
    .from("support_messages" as never)
    .select("ticket_id")
    .in("ticket_id", ticketIds)
    .eq("read_by_owner", false)
    .eq("sender_role", "tenant_user");

  const unreadCounts = new Map<string, number>();
  for (const row of (unreadRows ?? []) as { ticket_id: string }[]) {
    unreadCounts.set(row.ticket_id, (unreadCounts.get(row.ticket_id) ?? 0) + 1);
  }

  return rows.map((r) => {
    const tenant = tenantById.get(r.tenant_id);
    return {
      id: r.id,
      tenantId: r.tenant_id,
      tenantName: tenant?.name ?? "Empresa",
      tenantSlug: tenant?.slug ?? "",
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      lastMessageAt: r.last_message_at,
      lastMessagePreview: r.last_message_preview,
      lastSenderRole: r.last_sender_role,
      unreadForOwner: unreadCounts.get(r.id) ?? 0,
    };
  });
}

/** Total de mensagens não lidas pelo dono, em todos os tickets — pro sininho de notificação. */
export async function countUnreadForOwner(
  client: SupabaseClient,
): Promise<number> {
  const { count } = await client
    .from("support_messages" as never)
    .select("id", { count: "exact", head: true })
    .eq("read_by_owner", false)
    .eq("sender_role", "tenant_user");
  return count ?? 0;
}

export async function getTicketThread(
  client: SupabaseClient,
  ticketId: string,
): Promise<SupportMessage[]> {
  const { data } = await client
    .from("support_messages" as never)
    .select("id, ticket_id, sender_id, sender_role, body, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true })
    .limit(500);

  return ((data ?? []) as MessageRow[]).map(mapMessage);
}

export async function sendOwnerMessage(
  client: SupabaseClient,
  ticketId: string,
  userId: string,
  body: string,
): Promise<void> {
  const { error } = await client.from("support_messages" as never).insert({
    ticket_id: ticketId,
    sender_id: userId,
    sender_role: "platform_owner",
    body,
    read_by_tenant: false,
    read_by_owner: true,
  } as never);

  if (error) throw new Error(error.message);
}

export async function markOwnerRead(
  client: SupabaseClient,
  ticketId: string,
): Promise<void> {
  await client
    .from("support_messages" as never)
    .update({ read_by_owner: true } as never)
    .eq("ticket_id", ticketId)
    .eq("read_by_owner", false);
}

export async function closeTicket(
  client: SupabaseClient,
  ticketId: string,
): Promise<void> {
  await client
    .from("support_tickets" as never)
    .update({ status: "closed" } as never)
    .eq("id", ticketId);
}
