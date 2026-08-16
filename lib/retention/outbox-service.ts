import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

import {
  decideDispatch,
  resolveCommMode,
  type CommChannel,
  type CommMode,
} from "./channels";
import { isMissingColumn, isMissingRelation } from "./schema-guard";
import type { OutboxRow } from "./types";

export type EnqueueOutboxInput = {
  clienteId: string;
  channel: CommChannel;
  templateCode: string;
  offsetKey: string;
  entityType: "retorno" | "agendamento" | "os";
  entityId: string;
  idempotencyKey: string;
  message: string;
  phone?: string | null;
  email?: string | null;
  optedIn: boolean;
  mode?: CommMode;
  userId?: string | null;
};

export class NotificationOutboxService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async listKeys(limit = 2000): Promise<string[]> {
    const { data, error } = await this.supabase
      .from("notification_outbox" as never)
      .select("idempotency_key")
      .eq("tenant_id", this.tenantId)
      .limit(limit);
    if (error) {
      if (isMissingRelation(error, "notification_outbox")) return [];
      throw new Error(error.message);
    }
    return (data ?? []).map((r) =>
      String((r as { idempotency_key: string }).idempotency_key),
    );
  }

  async listByTemplate(templateCode: string, limit = 200): Promise<OutboxRow[]> {
    const { data, error } = await this.supabase
      .from("notification_outbox" as never)
      .select(
        "id, tenant_id, cliente_id, channel, template_code, offset_key, entity_type, entity_id, status, mode, idempotency_key, rendered_preview, created_at",
      )
      .eq("tenant_id", this.tenantId)
      .eq("template_code", templateCode)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      if (isMissingRelation(error, "notification_outbox")) return [];
      throw new Error(error.message);
    }
    return (data ?? []) as OutboxRow[];
  }

  async listByEntity(
    entityType: string,
    entityId: string,
  ): Promise<OutboxRow[]> {
    const { data, error } = await this.supabase
      .from("notification_outbox" as never)
      .select(
        "id, tenant_id, cliente_id, channel, template_code, offset_key, entity_type, entity_id, status, mode, idempotency_key, rendered_preview",
      )
      .eq("tenant_id", this.tenantId)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      if (isMissingRelation(error, "notification_outbox")) return [];
      throw new Error(error.message);
    }
    return (data ?? []) as OutboxRow[];
  }

  async enqueue(input: EnqueueOutboxInput): Promise<{
    status: string;
    note: string;
    waLink?: string;
    duplicated: boolean;
  }> {
    const mode = input.mode ?? resolveCommMode(process.env.RETENTION_NOTIFY_MODE);
    const decision = decideDispatch({
      mode,
      channel: input.channel,
      optedIn: input.optedIn,
      phone: input.phone,
      email: input.email,
      message: input.message,
    });
    const status = decision.status;
    const payload = {
      tenant_id: this.tenantId,
      cliente_id: input.clienteId,
      channel: input.channel,
      template_code: input.templateCode,
      offset_key: input.offsetKey,
      entity_type: input.entityType,
      entity_id: input.entityId,
      status,
      mode,
      idempotency_key: input.idempotencyKey,
      payload_json: {
        note: decision.note,
        waLink: "waLink" in decision ? decision.waLink : null,
      },
      rendered_preview: input.message,
      created_by: input.userId ?? null,
      processed_at: new Date().toISOString(),
      error_message: decision.ok ? null : decision.note,
      queued_at: new Date().toISOString(),
      to_address:
        input.channel === "whatsapp"
          ? (input.phone ?? "").replace(/\D/g, "") || null
          : input.email ?? null,
      attempt_count: 0,
    };
    const { error } = await this.supabase
      .from("notification_outbox" as never)
      .insert(payload as never);
    if (error) {
      if (/duplicate|unique/i.test(error.message)) {
        return {
          status: "pending",
          note: "Já registrado (idempotência).",
          duplicated: true,
        };
      }
      if (isMissingRelation(error, "notification_outbox")) {
        throw new Error("Outbox pendente (migration 35.2).");
      }
      if (isMissingColumn(error)) {
        const lean = { ...payload };
        delete (lean as { queued_at?: unknown }).queued_at;
        delete (lean as { to_address?: unknown }).to_address;
        delete (lean as { attempt_count?: unknown }).attempt_count;
        const retry = await this.supabase
          .from("notification_outbox" as never)
          .insert(lean as never);
        if (!retry.error) {
          return {
            status,
            note: decision.note,
            waLink: "waLink" in decision ? decision.waLink : undefined,
            duplicated: false,
          };
        }
      }
      throw new Error(error.message);
    }
    return {
      status,
      note: decision.note,
      waLink: "waLink" in decision ? decision.waLink : undefined,
      duplicated: false,
    };
  }

  async countRecent(hours = 1): Promise<number> {
    const since = new Date(Date.now() - hours * 3600_000).toISOString();
    const { count, error } = await this.supabase
      .from("notification_outbox" as never)
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.tenantId)
      .gte("created_at", since)
      .not("status", "in", "(cancelled,dry_run)");
    if (error) {
      if (isMissingRelation(error, "notification_outbox")) return 0;
      throw new Error(error.message);
    }
    return count ?? 0;
  }

  async markProviderStatus(input: {
    providerMessageId: string;
    status: string;
  }): Promise<boolean> {
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = {
      status: input.status,
      processed_at: now,
    };
    if (input.status === "sent") patch.sent_at = now;
    if (input.status === "delivered") patch.delivered_at = now;
    if (input.status === "read") patch.read_at = now;
    if (input.status === "failed") patch.failed_at = now;
    const { error, data } = await this.supabase
      .from("notification_outbox" as never)
      .update(patch as never)
      .eq("tenant_id", this.tenantId)
      .eq("provider_message_id", input.providerMessageId)
      .select("id")
      .maybeSingle();
    if (error) {
      if (isMissingRelation(error, "notification_outbox")) return false;
      throw new Error(error.message);
    }
    return Boolean(data);
  }

  async findLatestByToAddress(address: string): Promise<OutboxRow | null> {
    const digits = address.replace(/\D/g, "");
    if (!digits) return null;
    const { data, error } = await this.supabase
      .from("notification_outbox" as never)
      .select(
        "id, tenant_id, cliente_id, channel, template_code, offset_key, entity_type, entity_id, status, mode, idempotency_key, rendered_preview, provider_message_id, to_address",
      )
      .eq("tenant_id", this.tenantId)
      .eq("to_address", digits)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      if (isMissingRelation(error, "notification_outbox")) return null;
      throw new Error(error.message);
    }
    return (data as OutboxRow | null) ?? null;
  }

  async findByProviderMessageId(providerMessageId: string): Promise<OutboxRow | null> {
    const { data, error } = await this.supabase
      .from("notification_outbox" as never)
      .select(
        "id, tenant_id, cliente_id, channel, template_code, offset_key, entity_type, entity_id, status, mode, idempotency_key, rendered_preview, provider_message_id",
      )
      .eq("tenant_id", this.tenantId)
      .eq("provider_message_id", providerMessageId)
      .maybeSingle();
    if (error) {
      if (isMissingRelation(error, "notification_outbox")) return null;
      throw new Error(error.message);
    }
    return (data as OutboxRow | null) ?? null;
  }
}

export async function createNotificationOutboxService(tenantId: string) {
  const supabase = await createClient();
  return new NotificationOutboxService(supabase, tenantId);
}
