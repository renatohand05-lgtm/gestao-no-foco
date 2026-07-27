/**
 * Sprint 21.6 — Idempotência persistente (não confiar só em memória).
 */

import { assertEnterpriseContext } from "./context.ts";
import { stableHash } from "./correlation.ts";
import {
  EnterpriseIdempotencyError,
  EnterpriseError,
  ENTERPRISE_ERROR_CODES,
} from "./errors.ts";
import type { EnterpriseContext, JsonValue } from "./types.ts";
import type { IdempotencyRepository } from "./repositories/idempotency-repository.ts";

export type ExecuteIdempotentInput<T> = {
  context: EnterpriseContext;
  idempotencyKey: string;
  operation: string;
  request: unknown;
  run: () => Promise<T> | T;
  serializeResult?: (result: T) => Record<string, JsonValue>;
  now?: string;
  ttlMinutes?: number;
};

export async function checkIdempotencyKey(
  repo: IdempotencyRepository,
  input: {
    tenantId: string;
    idempotencyKey: string;
    operation: string;
    requestHash: string;
    now?: string;
  },
) {
  return repo.check(input);
}

export async function storeIdempotentResult(
  repo: IdempotencyRepository,
  input: {
    tenantId: string;
    idempotencyKey: string;
    operation: string;
    requestHash: string;
    responseSnapshot: Record<string, JsonValue>;
    expiresAt?: string | null;
    now?: string;
  },
) {
  return repo.store(input);
}

export async function executeIdempotent<T>(
  repo: IdempotencyRepository,
  input: ExecuteIdempotentInput<T>,
): Promise<{ result: T; replayed: boolean }> {
  assertEnterpriseContext(input.context);
  const key = input.idempotencyKey?.trim();
  if (!key) {
    throw new EnterpriseError("idempotencyKey obrigatória.", {
      code: ENTERPRISE_ERROR_CODES.IDEMPOTENCY_CONFLICT,
    });
  }

  const requestHash = stableHash(input.request);
  const checked = await checkIdempotencyKey(repo, {
    tenantId: input.context.tenantId,
    idempotencyKey: key,
    operation: input.operation,
    requestHash,
    now: input.now,
  });

  if (checked.conflict) {
    throw new EnterpriseIdempotencyError(
      "Mesma chave de idempotência com payload diferente.",
    );
  }

  if (checked.hit && checked.record?.responseSnapshot) {
    return {
      result: checked.record.responseSnapshot as T,
      replayed: true,
    };
  }

  const result = await input.run();
  const snapshot =
    input.serializeResult?.(result) ??
    (typeof result === "object" && result !== null
      ? (JSON.parse(JSON.stringify(result)) as Record<string, JsonValue>)
      : { value: result as JsonValue });

  const ttl = input.ttlMinutes ?? 24 * 60;
  const expiresAt = new Date(
    (input.now ? new Date(input.now).getTime() : Date.now()) + ttl * 60_000,
  ).toISOString();

  await storeIdempotentResult(repo, {
    tenantId: input.context.tenantId,
    idempotencyKey: key,
    operation: input.operation,
    requestHash,
    responseSnapshot: snapshot,
    expiresAt,
    now: input.now,
  });

  return { result, replayed: false };
}
