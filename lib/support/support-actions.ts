"use server";

import { revalidatePath } from "next/cache";

import { requireTenant } from "@/lib/tenants";
import { isPlatformPartner } from "@/lib/platform/platform-access-service";
import { createClient } from "@/lib/supabase/server";
import {
  closeTicket,
  countUnreadForOwner,
  getTenantConversation,
  getTicketThread,
  listTicketsForOwner,
  markOwnerRead,
  markTenantRead,
  sendOwnerMessage,
  sendTenantMessage,
  type SupportMessage,
  type SupportTicketSummary,
} from "@/lib/support/support-service";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

async function requireOwner() {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: partnerRow } = await client
    .from("platform_partners" as never)
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle<{ role: string }>();

  if (!partnerRow || partnerRow.role !== "owner") {
    throw new Error("Acesso restrito ao dono da plataforma.");
  }

  return { client, userId: user.id };
}

// ---------- Lado do tenant ----------

export async function fetchTenantConversation(
  tenantSlug: string,
): Promise<ActionResult<{ ticketId: string | null; messages: SupportMessage[] }>> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const client = await createClient();
    const data = await getTenantConversation(client, tenant.id);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao carregar conversa.",
    };
  }
}

export async function submitTenantMessage(
  tenantSlug: string,
  body: string,
): Promise<ActionResult<null>> {
  try {
    if (!body.trim()) throw new Error("Escreva uma mensagem antes de enviar.");
    const tenant = await requireTenant(tenantSlug);
    const client = await createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) throw new Error("Não autenticado.");

    await sendTenantMessage(client, tenant.id, user.id, body.trim());
    revalidatePath(`/${tenantSlug}`, "layout");
    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao enviar mensagem.",
    };
  }
}

export async function markTenantConversationRead(
  tenantSlug: string,
  ticketId: string,
): Promise<ActionResult<null>> {
  try {
    await requireTenant(tenantSlug);
    const client = await createClient();
    await markTenantRead(client, ticketId);
    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao marcar como lida.",
    };
  }
}

// ---------- Lado do dono da plataforma ----------

export async function fetchOwnerTickets(): Promise<
  ActionResult<SupportTicketSummary[]>
> {
  try {
    const { client } = await requireOwner();
    const data = await listTicketsForOwner(client);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao carregar tickets.",
    };
  }
}

export async function fetchUnreadSupportCount(): Promise<ActionResult<number>> {
  try {
    const isPartner = await isPlatformPartner();
    if (!isPartner) return { success: true, data: 0 };
    const { client } = await requireOwner();
    const data = await countUnreadForOwner(client);
    return { success: true, data };
  } catch {
    return { success: true, data: 0 };
  }
}

export async function fetchTicketThread(
  ticketId: string,
): Promise<ActionResult<SupportMessage[]>> {
  try {
    const { client } = await requireOwner();
    const data = await getTicketThread(client, ticketId);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao carregar conversa.",
    };
  }
}

export async function submitOwnerMessage(
  ticketId: string,
  body: string,
): Promise<ActionResult<null>> {
  try {
    if (!body.trim()) throw new Error("Escreva uma mensagem antes de enviar.");
    const { client, userId } = await requireOwner();
    await sendOwnerMessage(client, ticketId, userId, body.trim());
    revalidatePath("/master/suporte");
    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao enviar mensagem.",
    };
  }
}

export async function markOwnerTicketRead(
  ticketId: string,
): Promise<ActionResult<null>> {
  try {
    const { client } = await requireOwner();
    await markOwnerRead(client, ticketId);
    revalidatePath("/master/suporte");
    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao marcar como lida.",
    };
  }
}

export async function closeOwnerTicket(ticketId: string): Promise<ActionResult<null>> {
  try {
    const { client } = await requireOwner();
    await closeTicket(client, ticketId);
    revalidatePath("/master/suporte");
    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao encerrar ticket.",
    };
  }
}
