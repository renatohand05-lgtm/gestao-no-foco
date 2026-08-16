import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isMissingRelation } from "./schema-guard";
import { inboundAffirmativeIntent, normalizeInboundAddress } from "./inbound";
import { createMetaCloudWhatsAppAdapter } from "./providers/whatsapp-meta";
import type { WebhookHandleResult } from "./providers/types";

export async function recordWebhookEvent(
  admin: SupabaseClient,
  input: {
    provider: string;
    eventId: string;
    eventType: string;
    tenantId?: string | null;
  },
): Promise<{ duplicated: boolean }> {
  const { error } = await admin.from("notification_webhook_events" as never).insert({
    provider: input.provider,
    event_id: input.eventId,
    event_type: input.eventType,
    tenant_id: input.tenantId ?? null,
    payload_summary: { kind: input.eventType },
  } as never);
  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      return { duplicated: true };
    }
    if (isMissingRelation(error, "notification_webhook_events")) {
      return { duplicated: false };
    }
    throw new Error(error.message);
  }
  return { duplicated: false };
}

export async function lookupOutboxByAddress(
  admin: SupabaseClient,
  address: string,
): Promise<{
  tenant_id: string;
  entity_type: string | null;
  entity_id: string | null;
  id: string;
} | null> {
  const to = normalizeInboundAddress(address);
  if (!to) return null;
  const { data, error } = await admin
    .from("notification_outbox" as never)
    .select("id, tenant_id, entity_type, entity_id")
    .eq("to_address", to)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    if (isMissingRelation(error, "notification_outbox")) return null;
    throw new Error(error.message);
  }
  if (!data) return null;
  const row = data as {
    id: string;
    tenant_id: string;
    entity_type: string | null;
    entity_id: string | null;
  };
  return row;
}

export async function lookupOutboxByProviderMessage(
  admin: SupabaseClient,
  providerMessageId: string,
): Promise<{ tenant_id: string; id: string } | null> {
  const { data, error } = await admin
    .from("notification_outbox" as never)
    .select("id, tenant_id")
    .eq("provider_message_id", providerMessageId)
    .limit(1)
    .maybeSingle();
  if (error) {
    if (isMissingRelation(error, "notification_outbox")) return null;
    throw new Error(error.message);
  }
  return (data as { tenant_id: string; id: string } | null) ?? null;
}

export async function processWhatsAppWebhook(input: {
  rawBody: string;
  headers: Record<string, string>;
  admin: SupabaseClient;
}): Promise<{ ok: boolean; duplicated?: boolean; note: string }> {
  const provider = createMetaCloudWhatsAppAdapter();
  const parsed: WebhookHandleResult = provider.handleWebhook
    ? await provider.handleWebhook(input.rawBody, input.headers)
    : { duplicated: false, eventId: "ignored", kind: "ignored" };
  if (parsed.kind === "ignored" && parsed.eventId === "invalid-signature") {
    return { ok: false, note: "Assinatura inválida." };
  }
  if (parsed.kind === "ignored") {
    return { ok: true, note: "Ignorado." };
  }

  let tenantId: string | null = null;
  if (parsed.kind === "status" && parsed.providerMessageId) {
    const row = await lookupOutboxByProviderMessage(input.admin, parsed.providerMessageId);
    tenantId = row?.tenant_id ?? null;
    if (row && parsed.mappedStatus) {
      const now = new Date().toISOString();
      const patch: Record<string, unknown> = {
        status: parsed.mappedStatus,
        processed_at: now,
      };
      if (parsed.mappedStatus === "sent") patch.sent_at = now;
      if (parsed.mappedStatus === "delivered") patch.delivered_at = now;
      if (parsed.mappedStatus === "read") patch.read_at = now;
      if (parsed.mappedStatus === "failed") patch.failed_at = now;
      await input.admin
        .from("notification_outbox" as never)
        .update(patch as never)
        .eq("tenant_id", row.tenant_id)
        .eq("id", row.id);
    }
  }

  if (parsed.kind === "inbound" && parsed.fromAddress) {
    const bound = await lookupOutboxByAddress(input.admin, parsed.fromAddress);
    tenantId = bound?.tenant_id ?? null;
    const intent = inboundAffirmativeIntent({
      text: parsed.inboundText ?? "",
      entityType: bound?.entity_type,
    });
    if (intent && bound?.entity_id && bound.entity_type === "retorno") {
      await input.admin
        .from("customer_returns" as never)
        .update({
          status: intent,
          responded_at: new Date().toISOString(),
        } as never)
        .eq("tenant_id", bound.tenant_id)
        .eq("id", bound.entity_id);
    }
  }

  const rec = await recordWebhookEvent(input.admin, {
    provider: "meta_cloud",
    eventId: parsed.eventId,
    eventType: parsed.kind,
    tenantId,
  });
  return {
    ok: true,
    duplicated: rec.duplicated,
    note: rec.duplicated ? "Duplicado." : parsed.kind,
  };
}
