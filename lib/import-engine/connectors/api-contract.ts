/**
 * Sprint 22.8 — Contrato API de importação: auth, tenant, rate-limit, erros.
 */
export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation_error"
  | "rate_limited"
  | "preparing"
  | "conflict"
  | "internal_error";

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
  };
};

export type ApiAuthScope = "import:read" | "import:write" | "import:admin";

export type ApiTenantContext = {
  tenantId: string;
  tenantSlug: string;
  scopes: ApiAuthScope[];
};

export type ApiRateLimitState = {
  remaining: number;
  resetAt: number;
};

export const API_VERSION = "v1";

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

export function createApiErrorResponse(
  code: ApiErrorCode,
  message: string,
  options: {
    status?: number;
    details?: Record<string, unknown>;
    requestId?: string;
  } = {},
): { status: number; body: ApiErrorBody } {
  const statusMap: Record<ApiErrorCode, number> = {
    unauthorized: 401,
    forbidden: 403,
    not_found: 404,
    validation_error: 422,
    rate_limited: 429,
    preparing: 503,
    conflict: 409,
    internal_error: 500,
  };

  return {
    status: options.status ?? statusMap[code] ?? 500,
    body: {
      error: {
        code,
        message,
        details: options.details,
        requestId: options.requestId,
      },
    },
  };
}

export function validateApiAuthConfigured(): boolean {
  const key = process.env.IMPORT_API_KEY?.trim();
  return Boolean(key && key.length >= 16);
}

export function extractBearerToken(authHeader: string | null | undefined): string | null {
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

export function verifyApiBearerToken(token: string | null): boolean {
  if (!token) return false;
  const expected = process.env.IMPORT_API_KEY?.trim();
  if (!expected) return false;
  return token === expected;
}

/** Rate limit simples in-memory por tenant+IP. */
export function checkApiRateLimit(
  bucketKey: string,
  limit = 60,
  windowMs = 60_000,
  now = Date.now(),
): ApiRateLimitState {
  const bucket = rateLimitBuckets.get(bucketKey);
  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { remaining: limit - 1, resetAt: now + windowMs };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { remaining: 0, resetAt: bucket.resetAt };
  }
  return { remaining: limit - bucket.count, resetAt: bucket.resetAt };
}

export function resetApiRateLimits(): void {
  rateLimitBuckets.clear();
}

export function assertTenantIsolation(
  authenticatedTenantId: string,
  requestedTenantId: string | null | undefined,
): { ok: true } | { ok: false; message: string } {
  if (!requestedTenantId) {
    return { ok: true };
  }
  if (authenticatedTenantId !== requestedTenantId) {
    return {
      ok: false,
      message: "Tenant do payload não corresponde ao tenant autenticado.",
    };
  }
  return { ok: true };
}

export function buildPreparingResponse(feature: string): { status: number; body: ApiErrorBody } {
  return createApiErrorResponse(
    "preparing",
    `${feature} está em preparação — habilite a feature flag correspondente quando disponível.`,
  );
}
