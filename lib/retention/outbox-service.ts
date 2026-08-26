import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

import {
  decideDispatch,
  resolveCommMode,
  type CommChannel,
  type CommMode,
} from "./channels";
import { persistOutboxStatus } from "./pipeline";
import { originFromTemplate } from "./origin";
import { correlationId, logCommunication, logCommunicationDispatch, maskAddress } from "./observability";
import { classifyFailure } from "./failures";
import { isMissingColumn, isMissingRelation } from "./schema-guard";
import {
  blockedProviderSendResult,
  mapSendToOutboxPatch,
  sendViaChannelProvider,
  shouldDispatchReal,
} from "./dispatch";
import {
  isTestAllowlisted,
  resolveCommunicationMode,
} from "./test-mode";
import type { OutboxRow } from "./types";

const OPTIONAL_ENQUEUE_FIELDS = [
  "queued_at",
  "to_address",
  "attempt_count",
  "origin_kind",
  "correlation_id",
  "failure_kind",
  "next_retry_at",
  "resend_count",
  "error_code",
] as const;

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
  originKind?: string;
  correlationId?: string;
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
        "id, tenant_id, cliente_id, channel, template_code, offset_key, entity_type, entity_id, status, mode, idempotency_key, rendered_preview, origin_kind, created_at, error_code, error_message, failure_kind, attempt_count, sent_at, delivered_at, failed_at, provider, provider_message_id, to_address",
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

  async findByIdempotencyKey(idempotencyKey: string): Promise<OutboxRow | null> {
    const { data, error } = await this.supabase
      .from("notification_outbox" as never)
      .select(
        "id, tenant_id, cliente_id, channel, template_code, offset_key, entity_type, entity_id, status, mode, idempotency_key, rendered_preview, error_message, error_code, attempt_count, failure_kind, origin_kind, correlation_id, created_at, created_by, to_address, provider, provider_message_id, payload_json, resend_count, next_retry_at, last_attempt_at",
      )
      .eq("tenant_id", this.tenantId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (error) {
      if (isMissingRelation(error, "notification_outbox")) return null;
      throw new Error(error.message);
    }
    return (data as OutboxRow | null) ?? null;
  }

  private async enqueueExistingRow(
    existing: OutboxRow,
    input: EnqueueOutboxInput,
  ): Promise<{ status: string; note: string; waLink?: string; duplicated: boolean }> {
    if (["sent", "delivered", "read"].includes(existing.status)) {
      return {
        status: existing.status,
        note: "Já registrado (idempotência).",
        duplicated: true,
      };
    }
    logCommunicationDispatch({
      event: input.templateCode,
      tenantId: this.tenantId,
      correlationId: existing.correlation_id ?? input.correlationId,
      channel: input.channel,
      mode: resolveCommunicationMode(),
      dispatch: "started",
      note: "redispatch idempotent row",
    });
    const retried = await this.retryDispatch(existing);
    return {
      status: retried.status,
      note: retried.note,
      duplicated: true,
    };
  }

  async enqueue(input: EnqueueOutboxInput): Promise<{
    status: string;
    note: string;
    waLink?: string;
    duplicated: boolean;
  }> {
    const existing = await this.findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      return this.enqueueExistingRow(existing, input);
    }

    const mode = input.mode ?? resolveCommMode(process.env.RETENTION_NOTIFY_MODE);
    const decision = decideDispatch({
      mode,
      channel: input.channel,
      optedIn: input.optedIn,
      phone: input.phone,
      email: input.email,
      message: input.message,
    });
    let status = persistOutboxStatus({
      decisionStatus: decision.status,
      optedIn: input.optedIn,
      mode,
      note: decision.note,
    });
    let failureKind: string | null = !decision.ok
      ? classifyFailure({ message: decision.note })
      : null;
    const toAddress =
      input.channel === "whatsapp"
        ? (input.phone ?? "").replace(/\D/g, "") || null
        : input.email ?? null;
    const canSendNow =
      decision.ok &&
      Boolean(toAddress) &&
      mode === "provider" &&
      shouldDispatchReal({
        channel: input.channel,
        to: toAddress ?? undefined,
      });
        if (input.channel === "email") {
      const raw = process.env.EMAIL_ENABLED ?? null;
      // eslint-disable-next-line no-console
      console.log(
        "[DIAG_EMAIL_ENABLED]",
        JSON.stringify({
          present: raw !== null,
          length: raw?.length ?? null,
          codes: raw ? Array.from(raw).map((c) => c.charCodeAt(0)) : null,
          decisionOk: decision.ok,
          modeVar: mode,
          toAddressPresent: Boolean(toAddress),
          canSendNow,
        }),
      );
    }
    let note = decision.note;
    let errorCode: string | null = null;
    if (mode === "provider" && decision.ok && !canSendNow) {
      if (
        resolveCommunicationMode() === "test" &&
        !isTestAllowlisted({
          phone: input.phone,
          email: input.email,
        })
      ) {
        status = "blocked";
        note = "Bloqueado pelo modo de teste.";
        errorCode = "blocked_by_allowlist";
        failureKind = "blocked_by_allowlist";
      } else {
        status = "suppressed";
        note = "Envio real bloqueado (kill switch ou provider).";
      }
    }
    if (canSendNow) status = "queued";
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
        note,
        waLink: "waLink" in decision ? decision.waLink : null,
        cta: input.templateCode.startsWith("RETORNO")
          ? { type: "schedule_return" }
          : null,
      },
      rendered_preview: input.message,
      created_by: input.userId ?? null,
      processed_at: new Date().toISOString(),
      error_message: decision.ok && status !== "suppressed" && status !== "blocked" ? null : note,
      error_code: errorCode,
      queued_at: new Date().toISOString(),
      to_address: toAddress,
      attempt_count: 0,
      origin_kind: input.originKind ?? originFromTemplate(input.templateCode),
      correlation_id: input.correlationId ?? correlationId(),
      failure_kind: failureKind,
    };
    const { data, error } = await this.supabase
      .from("notification_outbox" as never)
      .insert(payload as never)
      .select("id")
      .maybeSingle();
    if (error) {
      if (/duplicate|unique/i.test(error.message)) {
        const dup = await this.findByIdempotencyKey(input.idempotencyKey);
        if (dup) return this.enqueueExistingRow(dup, input);
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
        const lean = { ...payload } as Record<string, unknown>;
        for (const field of OPTIONAL_ENQUEUE_FIELDS) delete lean[field];
        const retry = await this.supabase
          .from("notification_outbox" as never)
          .insert(lean as never)
          .select("id")
          .maybeSingle();
        if (!retry.error) {
          const dispatched = await this.dispatchIfAllowed({
            id: (retry.data as { id?: string } | null)?.id ?? null,
            canSendNow,
            to: toAddress,
            channel: input.channel,
            body: input.message,
            templateCode: input.templateCode,
            correlationId: payload.correlation_id as string,
          });
          return {
            status: dispatched.status ?? status,
            note: dispatched.note ?? note,
            waLink: "waLink" in decision ? decision.waLink : undefined,
            duplicated: false,
          };
        }
      }
      throw new Error(error.message);
    }
    logCommunication({
      event: "queued",
      tenantId: this.tenantId,
      correlationId: payload.correlation_id,
      channel: input.channel,
      status,
      note: maskAddress(payload.to_address as string | null),
    });
    const dispatched = await this.dispatchIfAllowed({
      id: (data as { id?: string } | null)?.id ?? null,
      canSendNow,
      to: toAddress,
      channel: input.channel,
      body: input.message,
      templateCode: input.templateCode,
      correlationId: payload.correlation_id as string,
    });
    return {
      status: dispatched.status ?? status,
      note: dispatched.note ?? note,
      waLink: "waLink" in decision ? decision.waLink : undefined,
      duplicated: false,
    };
  }

  private async dispatchIfAllowed(input: {
    id: string | null;
    canSendNow: boolean;
    to: string | null;
    channel: CommChannel;
    body: string;
    attemptCount?: number;
    templateCode?: string;
    correlationId?: string;
  }): Promise<{ status?: string; note?: string }> {
    if (!input.canSendNow || !input.id || !input.to) {
      if (input.templateCode && input.id) {
        logCommunicationDispatch({
          event: input.templateCode,
          tenantId: this.tenantId,
          correlationId: input.correlationId,
          channel: input.channel,
          mode: resolveCommunicationMode(),
          dispatch: "skipped",
          note: "dispatch preconditions failed",
        });
      }
      return {};
    }
    const result = await sendViaChannelProvider({
      channel: input.channel,
      to: input.to,
      body: input.body,
      tenantId: this.tenantId,
      event: input.templateCode,
      correlationId: input.correlationId,
    });
    const patch = mapSendToOutboxPatch(result);
    const failureKind =
      result.errorCode === "blocked_by_allowlist"
        ? "blocked_by_allowlist"
        : result.status === "failed"
          ? classifyFailure({ errorCode: result.errorCode, message: result.message })
          : null;
    await this.patchSameRow(input.id, {
      status: patch.status,
      provider: patch.provider,
      provider_message_id: patch.providerMessageId,
      error_code: patch.errorCode,
      sent_at: patch.sentAt,
      failed_at: patch.failedAt,
      processed_at: new Date().toISOString(),
      last_attempt_at: new Date().toISOString(),
      attempt_count: input.attemptCount ?? 1,
      failure_kind: failureKind,
      error_message:
        result.status === "failed" || result.status === "blocked"
          ? result.message
          : null,
    });
    return { status: result.status, note: result.message };
  }

  async retryDispatch(row: OutboxRow): Promise<{ status: string; note: string }> {
    if (row.status === "delivered" || row.status === "read" || row.status === "sent") {
      return { status: row.status, note: "Mensagem já enviada — não duplicar." };
    }
    const channel = row.channel as CommChannel;
    const to = row.to_address ?? null;
    if (!to) {
      return { status: "failed", note: "Destino ausente." };
    }
    const canSendNow = shouldDispatchReal({ channel, to });
    if (!canSendNow) {
      const blocked = blockedProviderSendResult({ channel, to });
      await this.patchSameRow(row.id, {
        status: blocked.status,
        error_code: blocked.errorCode ?? null,
        error_message: blocked.message,
        failure_kind:
          blocked.errorCode === "blocked_by_allowlist"
            ? "blocked_by_allowlist"
            : "permanent",
        last_attempt_at: new Date().toISOString(),
        processed_at: new Date().toISOString(),
      });
      return { status: blocked.status, note: blocked.message };
    }
    const result = await this.dispatchIfAllowed({
      id: row.id,
      canSendNow: true,
      to,
      channel,
      body: row.rendered_preview ?? "",
      attemptCount: (row.attempt_count ?? 0) + 1,
      templateCode: row.template_code,
      correlationId: row.correlation_id ?? undefined,
    });
    return {
      status: result.status ?? row.status,
      note: result.note ?? "",
    };
  }

  async countRecent(hours = 1): Promise<number> {
    const since = new Date(Date.now() - hours * 3600_000).toISOString();
    const { count, error } = await this.supabase
      .from("notification_outbox" as never)
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.tenantId)
      .gte("created_at", since)
      .not("status", "in", "(cancelled,dry_run,suppressed)");
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

  async getById(id: string): Promise<OutboxRow | null> {
    const { data, error } = await this.supabase
      .from("notification_outbox" as never)
      .select(
        "id, tenant_id, cliente_id, channel, template_code, offset_key, entity_type, entity_id, status, mode, idempotency_key, rendered_preview, error_message, error_code, attempt_count, failure_kind, origin_kind, correlation_id, created_at, created_by, to_address, provider_message_id, payload_json, resend_count, next_retry_at, last_attempt_at",
      )
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .maybeSingle();
    if (error) {
      if (isMissingRelation(error, "notification_outbox")) return null;
      throw new Error(error.message);
    }
    return (data as OutboxRow | null) ?? null;
  }

  async listByCliente(clienteId: string, limit = 50): Promise<OutboxRow[]> {
    const { data, error } = await this.supabase
      .from("notification_outbox" as never)
      .select(
        "id, tenant_id, cliente_id, channel, template_code, offset_key, entity_type, entity_id, status, mode, idempotency_key, rendered_preview, origin_kind, created_at, created_by, failure_kind, error_message",
      )
      .eq("tenant_id", this.tenantId)
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      if (isMissingRelation(error, "notification_outbox")) return [];
      throw new Error(error.message);
    }
    return (data ?? []) as OutboxRow[];
  }

  async listCenter(filters: {
    from?: string;
    to?: string;
    clienteId?: string;
    channel?: string;
    status?: string;
    origin?: string;
    createdBy?: string;
    limit?: number;
  }): Promise<OutboxRow[]> {
    let q = this.supabase
      .from("notification_outbox" as never)
      .select(
        "id, tenant_id, cliente_id, channel, template_code, offset_key, entity_type, entity_id, status, mode, idempotency_key, rendered_preview, origin_kind, created_at, created_by, failure_kind, error_code, attempt_count, next_retry_at, to_address, provider, provider_message_id",
      )
      .eq("tenant_id", this.tenantId)
      .order("created_at", { ascending: false })
      .limit(filters.limit ?? 80);
    if (filters.from) q = q.gte("created_at", filters.from);
    if (filters.to) q = q.lte("created_at", filters.to);
    if (filters.clienteId) q = q.eq("cliente_id", filters.clienteId);
    if (filters.channel) q = q.eq("channel", filters.channel);
    if (filters.status) q = q.eq("status", filters.status);
    if (filters.origin) q = q.eq("origin_kind", filters.origin);
    if (filters.createdBy) q = q.eq("created_by", filters.createdBy);
    const { data, error } = await q;
    if (error) {
      if (isMissingRelation(error, "notification_outbox")) return [];
      throw new Error(error.message);
    }
    return (data ?? []) as OutboxRow[];
  }

  async patchSameRow(
    id: string,
    patch: Record<string, unknown>,
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from("notification_outbox" as never)
      .update(patch as never)
      .eq("tenant_id", this.tenantId)
      .eq("id", id);
    if (error) {
      if (isMissingRelation(error, "notification_outbox")) return false;
      throw new Error(error.message);
    }
    return true;
  }

  async auditResend(id: string, userId: string | null): Promise<boolean> {
    const row = await this.getById(id);
    if (!row) return false;
    const now = new Date().toISOString();
    const prev =
      row.payload_json && typeof row.payload_json === "object"
        ? row.payload_json
        : {};
    return this.patchSameRow(id, {
      last_attempt_at: now,
      resend_count: (row.resend_count ?? 0) + 1,
      payload_json: {
        ...prev,
        last_resend_at: now,
        last_resend_by: userId,
      },
    });
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
