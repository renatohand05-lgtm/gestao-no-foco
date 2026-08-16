import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isMissingRelation } from "./schema-guard";
import { inboundAffirmativeIntent, normalizeInboundAddress } from "./inbound";
import { createMetaCloudWhatsAppAdapter } from "./providers/whatsapp-meta";
import type { WebhookHandleResult } from "./providers/types";
import { canAdvanceStatus } from "./pipeline";
import { logCommunication } from "./observability";

export function nextOutboxStatusFromWebhook(
  current: string,
  mapped: string,
): string | null {
  if (!canAdvanceStatus(current, mapped)) return null;
  return mapped;
}

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
): Promise<{
  tenant_id: string;
  id: string;
  status?: string;
  correlation_id?: string | null;
  to_address?: string | null;
} | null> {
  const { data, error } = await admin
    .from("notification_outbox" as never)
    .select("id, tenant_id, status, correlation_id, to_address")
    .eq("provider_message_id", providerMessageId)
    .limit(1)
    .maybeSingle();
  if (error) {
    if (isMissingRelation(error, "notification_outbox")) return null;
    throw new Error(error.message);
  }
  return (data as { tenant_id: string; id: string; status?: string; correlation_id?: string; to_address?: string | null } | null) ?? null;
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
    logCommunication({
      event: "webhook_received",
      status: "rejected",
      note: "invalid_signature",
    });
    return { ok: false, note: "Assinatura inválida." };
  }
  if (parsed.kind === "ignored") {
    return { ok: true, note: "Ignorado." };
  }

  const rec = await recordWebhookEvent(input.admin, {
    provider: "meta_cloud",
    eventId: parsed.eventId,
    eventType: parsed.kind,
    tenantId: null,
  });
  if (rec.duplicated) {
    logCommunication({
      event: "webhook_received",
      status: "duplicated",
      note: parsed.eventId,
    });
    return { ok: true, duplicated: true, note: "Duplicado." };
  }

  let tenantId: string | null = null;
  if (parsed.kind === "status" && parsed.providerMessageId) {
    const row = await lookupOutboxByProviderMessage(input.admin, parsed.providerMessageId);
    tenantId = row?.tenant_id ?? null;
    const mapped = parsed.mappedStatus;
    const next =
      row?.status && mapped
        ? nextOutboxStatusFromWebhook(row.status, mapped)
        : mapped ?? null;
    if (row && next) {
      const now = new Date().toISOString();
      const patch: Record<string, unknown> = {
        status: next,
        processed_at: now,
      };
      if (next === "sent") patch.sent_at = now;
      if (next === "delivered") patch.delivered_at = now;
      if (next === "read") patch.read_at = now;
      if (next === "failed") patch.failed_at = now;
      await input.admin
        .from("notification_outbox" as never)
        .update(patch as never)
        .eq("tenant_id", row.tenant_id)
        .eq("id", row.id);
      logCommunication({
        event:
          next === "delivered"
            ? "delivered"
            : next === "read"
              ? "read"
              : next === "failed"
                ? "failed"
                : "provider_accepted",
        tenantId: row.tenant_id,
        correlationId: row.correlation_id ?? undefined,
        status: next,
      });
    } else if (row && mapped && !next) {
      logCommunication({
        event: "webhook_received",
        tenantId: row.tenant_id,
        correlationId: row.correlation_id ?? undefined,
        status: "ignored_out_of_order",
        note: mapped,
      });
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

  logCommunication({
    event: "webhook_received",
    tenantId: tenantId ?? undefined,
    status: parsed.kind,
  });
  return {
    ok: true,
    duplicated: false,
    note: parsed.kind,
  };
}
