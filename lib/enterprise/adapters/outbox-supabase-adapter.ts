/**
 * Sprint 21.6 RC5 — Outbox Supabase Adapter.
 *
 * Mutações de status/claim: SOMENTE via RPC SECURITY DEFINER.
 * RC5: RPCs outbox são SERVER-ONLY — client DEVE ser service_role (admin).
 * Nunca usar createClient() browser/anon/authenticated para claim/complete/fail.
 *
 * @see lib/supabase/admin.ts
 * @see supabase/migrations/20260808_enterprise_rpc_grants_rc5.sql
 */

import { EnterprisePersistenceError, toSafeEnterpriseError } from "../errors.ts";
import { mapKeysSnakeToCamel, nowIso } from "../mappers.ts";
import type { OutboxRepository } from "../repositories/contracts.ts";
import type { EnterpriseOutboxEvent } from "../types.ts";
import {
  enterpriseFrom,
  throwIfError,
  type EnterpriseSupabaseClient,
} from "./supabase-helpers.ts";

type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message?: string } | null }>;
};

function requireProcessorId(processorId: string | null | undefined): string {
  const id = processorId?.trim();
  if (!id) {
    throw new EnterprisePersistenceError(
      "processorId obrigatório para operações de lock da outbox.",
    );
  }
  return id;
}

function mapOutboxRow(data: unknown): EnterpriseOutboxEvent {
  return mapKeysSnakeToCamel<EnterpriseOutboxEvent>(
    data as Record<string, unknown>,
  );
}

export function createOutboxSupabaseAdapter(
  client: EnterpriseSupabaseClient,
): OutboxRepository {
  const rpcClient = client as unknown as RpcClient;

  return {
    async enqueue(input) {
      const now = nowIso();
      const { data, error } = await enterpriseFrom(client, "enterprise_outbox")
        .insert({
          tenant_id: input.tenantId,
          event_type: input.eventType,
          aggregate_type: input.aggregateType,
          aggregate_id: input.aggregateId,
          payload: input.payload ?? {},
          status: "pending",
          attempts: 0,
          max_attempts: input.maxAttempts ?? 5,
          correlation_id: input.correlationId ?? null,
          request_id: input.requestId ?? null,
          available_at: input.availableAt ?? now,
          locked_by: null,
          locked_at: null,
        })
        .select("*")
        .single();
      throwIfError(error, "outbox.enqueue");
      return mapOutboxRow(data);
    },

    async claimBatch(input) {
      const processorId = requireProcessorId(input.processorId);
      const { data, error } = await rpcClient.rpc(
        "enterprise_claim_outbox_batch",
        {
          p_tenant_id: input.tenantId,
          p_processor_id: processorId,
          p_limit: input.limit ?? 10,
          p_lock_ttl_seconds: input.lockTtlSeconds ?? 60,
        },
      );

      if (error) {
        throw toSafeEnterpriseError(
          new EnterprisePersistenceError(
            error.message ?? "enterprise_claim_outbox_batch failed",
          ),
          "Falha no claim atómico da outbox (RPC obrigatória).",
        );
      }

      if (data == null) return [];
      if (!Array.isArray(data)) {
        throw new EnterprisePersistenceError(
          "Resposta inválida de enterprise_claim_outbox_batch.",
        );
      }

      return data.map((r) => mapOutboxRow(r));
    },

    async markProcessing(input) {
      // Server-only: claim via RPC (não há UPDATE directo para members).
      const processorId = requireProcessorId(input.processorId);
      const claimed = await this.claimBatch({
        tenantId: input.tenantId,
        processorId,
        limit: 50,
        lockTtlSeconds: 60,
      });
      const hit = claimed.find((e) => e.id === input.id);
      if (hit) return hit;

      const { data, error } = await enterpriseFrom(client, "enterprise_outbox")
        .select("*")
        .eq("id", input.id)
        .eq("tenant_id", input.tenantId)
        .maybeSingle();
      throwIfError(error, "outbox.markProcessing.get");
      if (
        data &&
        data.status === "processing" &&
        data.locked_by === processorId
      ) {
        return mapOutboxRow(data);
      }
      throw new EnterprisePersistenceError(
        "Evento não disponível para este processor (use claimBatch).",
      );
    },

    async markCompleted(input) {
      const processorId = requireProcessorId(input.processorId);
      const { data, error } = await rpcClient.rpc(
        "enterprise_complete_outbox_event",
        {
          p_tenant_id: input.tenantId,
          p_event_id: input.id,
          p_processor_id: processorId,
        },
      );
      if (error) {
        throw toSafeEnterpriseError(
          new EnterprisePersistenceError(
            error.message ?? "enterprise_complete_outbox_event failed",
          ),
          "Falha ao completar outbox (RPC + lock ownership).",
        );
      }
      return mapOutboxRow(data);
    },

    async markFailed(input) {
      const processorId = requireProcessorId(input.processorId);
      const { data, error } = await rpcClient.rpc(
        "enterprise_fail_outbox_event",
        {
          p_tenant_id: input.tenantId,
          p_event_id: input.id,
          p_processor_id: processorId,
          p_error: input.error,
          p_retry: input.retry !== false,
        },
      );
      if (error) {
        throw toSafeEnterpriseError(
          new EnterprisePersistenceError(
            error.message ?? "enterprise_fail_outbox_event failed",
          ),
          "Falha ao marcar outbox failed (RPC + lock ownership).",
        );
      }
      return mapOutboxRow(data);
    },

    async releaseExpiredLocks(input) {
      const { data, error } = await rpcClient.rpc(
        "enterprise_release_outbox_locks",
        {
          p_tenant_id: input.tenantId,
          p_lock_ttl_seconds: input.lockTtlSeconds ?? 60,
        },
      );
      if (error) {
        throw toSafeEnterpriseError(
          new EnterprisePersistenceError(
            error.message ?? "enterprise_release_outbox_locks failed",
          ),
          "Falha ao liberar locks da outbox.",
        );
      }
      return typeof data === "number" ? data : Number(data ?? 0);
    },

    async countByStatus(tenantId, status) {
      const { count, error } = await enterpriseFrom(client, "enterprise_outbox")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", status);
      throwIfError(error, "outbox.countByStatus");
      return count ?? 0;
    },
  };
}
