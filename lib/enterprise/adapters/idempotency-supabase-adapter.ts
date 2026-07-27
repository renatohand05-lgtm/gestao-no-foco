/**
 * Sprint 21.7 RC1 — Idempotency Supabase Adapter (RPC service_role).
 */

import { EnterpriseError, ENTERPRISE_ERROR_CODES } from "../errors.ts";
import { nowIso } from "../mappers.ts";
import type {
  IdempotencyCheckResult,
  IdempotencyRepository,
} from "../repositories/contracts.ts";
import type { IdempotencyRecord, JsonValue } from "../types.ts";
import type { EnterpriseSupabaseClient } from "./supabase-helpers.ts";

type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message?: string } | null }>;
};

type RpcIdempotencyResult = {
  status?: string;
  hit?: boolean;
  conflict?: boolean;
  response_snapshot?: Record<string, JsonValue> | null;
  record_id?: string;
};

function parseRpcResult(data: unknown): RpcIdempotencyResult {
  if (!data || typeof data !== "object") return {};
  return data as RpcIdempotencyResult;
}

export function createIdempotencySupabaseAdapter(
  client: EnterpriseSupabaseClient,
): IdempotencyRepository {
  const rpcClient = client as unknown as RpcClient;

  async function resolve(
    tenantId: string,
    idempotencyKey: string,
    operation: string,
    requestHash: string,
    responseSnapshot: Record<string, JsonValue> | null,
    ttlMinutes = 1440,
  ): Promise<RpcIdempotencyResult> {
    const { data, error } = await rpcClient.rpc("enterprise_resolve_idempotency", {
      p_tenant_id: tenantId,
      p_idempotency_key: idempotencyKey,
      p_operation: operation,
      p_request_hash: requestHash,
      p_response_snapshot: responseSnapshot,
      p_ttl_minutes: ttlMinutes,
    });
    if (error) {
      throw new EnterpriseError(
        error.message ?? "enterprise_resolve_idempotency failed",
        { code: ENTERPRISE_ERROR_CODES.IDEMPOTENCY_CONFLICT },
      );
    }
    return parseRpcResult(data);
  }

  return {
    async check(input): Promise<IdempotencyCheckResult> {
      const result = await resolve(
        input.tenantId,
        input.idempotencyKey,
        input.operation,
        input.requestHash,
        null,
      );

      if (result.conflict) {
        return {
          hit: true,
          conflict: true,
          record: null,
        };
      }

      if (result.hit && result.status === "replay" && result.response_snapshot) {
        return {
          hit: true,
          conflict: false,
          record: {
            id: result.record_id ?? "replay",
            tenantId: input.tenantId,
            idempotencyKey: input.idempotencyKey,
            operation: input.operation,
            requestHash: input.requestHash,
            responseSnapshot: result.response_snapshot,
            status: "completed",
            expiresAt: null,
            createdAt: nowIso(),
            updatedAt: nowIso(),
          },
        };
      }

      if (result.hit && result.status === "in_flight") {
        return { hit: true, conflict: false, record: null };
      }

      return { hit: false, conflict: false, record: null };
    },

    async store(input) {
      const ttlMinutes = input.expiresAt
        ? Math.max(
            1,
            Math.round(
              (new Date(input.expiresAt).getTime() -
                (input.now ? new Date(input.now).getTime() : Date.now())) /
                60_000,
            ),
          )
        : 1440;

      const result = await resolve(
        input.tenantId,
        input.idempotencyKey,
        input.operation,
        input.requestHash,
        input.responseSnapshot,
        ttlMinutes,
      );

      if (result.conflict) {
        throw new EnterpriseError("Conflito de idempotência.", {
          code: ENTERPRISE_ERROR_CODES.IDEMPOTENCY_CONFLICT,
        });
      }

      const row: IdempotencyRecord = {
        id: result.record_id ?? `idem_${Date.now()}`,
        tenantId: input.tenantId,
        idempotencyKey: input.idempotencyKey,
        operation: input.operation,
        requestHash: input.requestHash,
        responseSnapshot: input.responseSnapshot,
        status: "completed",
        expiresAt: input.expiresAt ?? null,
        createdAt: input.now ?? nowIso(),
        updatedAt: input.now ?? nowIso(),
      };
      return row;
    },

    async countConflicts(tenantId) {
      void tenantId;
      return 0;
    },
  };
}
