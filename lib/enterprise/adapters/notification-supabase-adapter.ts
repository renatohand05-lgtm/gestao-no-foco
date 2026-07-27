/**
 * Sprint 21.6 — Notification Supabase Adapter.
 */

import { mapKeysCamelToSnake, mapKeysSnakeToCamel, nowIso } from "../mappers.ts";
import type {
  NotificationRepository,
  PersistedDeliveryAttempt,
  PersistedNotification,
  PersistedNotificationRecipient,
} from "../repositories/contracts.ts";
import {
  enterpriseFrom,
  throwIfError,
  type EnterpriseSupabaseClient,
} from "./supabase-helpers.ts";

export function createNotificationSupabaseAdapter(
  client: EnterpriseSupabaseClient,
): NotificationRepository {
  return {
    async create(n) {
      const now = nowIso();
      const row = mapKeysCamelToSnake({
        ...n,
        createdAt: n.createdAt ?? now,
        updatedAt: n.updatedAt ?? now,
      });
      const { data, error } = await enterpriseFrom(client, "notifications")
        .insert(row)
        .select("*")
        .single();
      throwIfError(error, "notification.create");
      return mapKeysSnakeToCamel<PersistedNotification>(data);
    },
    async getById(tenantId, id) {
      const { data, error } = await enterpriseFrom(client, "notifications")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .maybeSingle();
      throwIfError(error, "notification.getById");
      return data ? mapKeysSnakeToCamel<PersistedNotification>(data) : null;
    },
    async listForUser(tenantId, userId) {
      const { data: recipients, error: rErr } = await enterpriseFrom(
        client,
        "notification_recipients",
      )
        .select("notification_id")
        .eq("tenant_id", tenantId)
        .eq("recipient_id", userId);
      throwIfError(rErr, "notification.listForUser.recipients");
      const ids = (recipients ?? []).map(
        (r: { notification_id: string }) => r.notification_id,
      );
      if (!ids.length) return [];
      const { data, error } = await enterpriseFrom(client, "notifications")
        .select("*")
        .eq("tenant_id", tenantId)
        .in("id", ids)
        .order("created_at", { ascending: false });
      throwIfError(error, "notification.listForUser");
      return (data ?? []).map((r: Record<string, unknown>) =>
        mapKeysSnakeToCamel<PersistedNotification>(r),
      );
    },
    async listUnread(tenantId, userId) {
      const { data: recipients, error: rErr } = await enterpriseFrom(
        client,
        "notification_recipients",
      )
        .select("notification_id")
        .eq("tenant_id", tenantId)
        .eq("recipient_id", userId)
        .is("read_at", null);
      throwIfError(rErr, "notification.listUnread.recipients");
      const ids = (recipients ?? []).map(
        (r: { notification_id: string }) => r.notification_id,
      );
      if (!ids.length) return [];
      const { data, error } = await enterpriseFrom(client, "notifications")
        .select("*")
        .eq("tenant_id", tenantId)
        .in("id", ids);
      throwIfError(error, "notification.listUnread");
      return (data ?? []).map((r: Record<string, unknown>) =>
        mapKeysSnakeToCamel<PersistedNotification>(r),
      );
    },
    async markAsRead(tenantId, notificationId, userId, now) {
      const ts = now ?? nowIso();
      const { data, error } = await enterpriseFrom(
        client,
        "notification_recipients",
      )
        .update({ read_at: ts, status: "read", updated_at: ts })
        .eq("tenant_id", tenantId)
        .eq("notification_id", notificationId)
        .eq("recipient_id", userId)
        .select("*")
        .maybeSingle();
      throwIfError(error, "notification.markAsRead");
      return data
        ? mapKeysSnakeToCamel<PersistedNotificationRecipient>(data)
        : null;
    },
    async saveRecipients(recipients) {
      if (!recipients.length) return [];
      const rows = recipients.map((r) => mapKeysCamelToSnake(r));
      const { data, error } = await enterpriseFrom(
        client,
        "notification_recipients",
      )
        .insert(rows)
        .select("*");
      throwIfError(error, "notification.saveRecipients");
      return (data ?? []).map((r: Record<string, unknown>) =>
        mapKeysSnakeToCamel<PersistedNotificationRecipient>(r),
      );
    },
    async saveDeliveryAttempt(attempt) {
      const row = mapKeysCamelToSnake({
        ...attempt,
        createdAt: nowIso(),
      });
      const { data, error } = await enterpriseFrom(
        client,
        "notification_delivery_attempts",
      )
        .insert(row)
        .select("*")
        .single();
      throwIfError(error, "notification.saveDeliveryAttempt");
      return mapKeysSnakeToCamel<PersistedDeliveryAttempt>(data);
    },
    async findDuplicate(tenantId, deduplicationKey) {
      const { data, error } = await enterpriseFrom(client, "notifications")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("deduplication_key", deduplicationKey)
        .maybeSingle();
      throwIfError(error, "notification.findDuplicate");
      return data ? mapKeysSnakeToCamel<PersistedNotification>(data) : null;
    },
  };
}
