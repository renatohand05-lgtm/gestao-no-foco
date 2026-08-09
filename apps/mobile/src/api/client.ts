import { logger } from "@/observability/logger";
import {
  API_HEADERS,
  DEFAULT_REQUEST_TIMEOUT_MS,
  MAX_GET_RETRIES,
  type ApiErrorBody,
  type ApiFailure,
  type ApiResult,
  type ApiSuccess,
} from "@gof/api-contracts";
import { createRequestId, sleep } from "@gof/utils";
import Constants from "expo-constants";
import { getApiBaseResolution, getApiBaseUrl } from "@/env/validate";

export type ClientContext = {
  tenantId?: string | null;
  branchId?: string | null;
  accessToken?: string | null;
};

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  signal?: AbortSignal;
  context?: ClientContext;
  /** Safe retry for idempotent GET only */
  retry?: boolean;
};

function normalizeError(
  status: number,
  body: unknown,
  requestId: string,
): ApiErrorBody {
  if (body && typeof body === "object" && "message" in body) {
    const b = body as { code?: string; message?: string };
    return {
      code: (b.code as ApiErrorBody["code"]) ?? "UNKNOWN",
      message: b.message ?? "Erro desconhecido",
      requestId,
    };
  }
  const code: ApiErrorBody["code"] =
    status === 401
      ? "UNAUTHORIZED"
      : status === 403
        ? "FORBIDDEN"
        : status === 404
          ? "NOT_FOUND"
          : status >= 500
            ? "SERVER_ERROR"
            : "UNKNOWN";
  return { code, message: `HTTP ${status}`, requestId };
}

function buildUrl(path: string): string {
  const base = getApiBaseUrl();
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function clientVersion(): string {
  return Constants.expoConfig?.version ?? "1.0.0";
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  const method = options.method ?? "GET";
  const requestId = createRequestId();
  const timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const ctx = options.context ?? {};
  const maxAttempts =
    method === "GET" && options.retry !== false ? MAX_GET_RETRIES + 1 : 1;
  const apiBase = getApiBaseResolution();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const signal = options.signal
      ? AbortSignal.any([options.signal, controller.signal])
      : controller.signal;

    const headers: Record<string, string> = {
      Accept: "application/json",
      [API_HEADERS.requestId]: requestId,
      [API_HEADERS.clientVersion]: clientVersion(),
      ...options.headers,
    };

    if (ctx.tenantId) headers[API_HEADERS.tenant] = ctx.tenantId;
    if (ctx.branchId) headers[API_HEADERS.branch] = ctx.branchId;
    if (ctx.accessToken) headers.Authorization = `Bearer ${ctx.accessToken}`;

    const init: RequestInit = { method, headers, signal };
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const url = buildUrl(path);
    logger.info("api.request", {
      method,
      path,
      requestId,
      attempt,
      apiBaseCode: apiBase.code,
      apiHost: (() => {
        try {
          return new URL(apiBase.url).host;
        } catch {
          return "invalid";
        }
      })(),
    });

    try {
      const response = await fetch(url, init);
      clearTimeout(timeout);
      const text = await response.text();
      let parsed: unknown = null;
      if (text) {
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = text;
        }
      }

      if (!response.ok) {
        const failure: ApiFailure = {
          ok: false,
          status: response.status,
          error: normalizeError(response.status, parsed, requestId),
        };
        if (method === "GET" && attempt < maxAttempts) {
          await sleep(300 * attempt);
          continue;
        }
        logger.warn("api.error", {
          path,
          status: failure.status,
          code: failure.error.code,
          requestId,
          apiBaseCode: apiBase.code,
        });
        return failure;
      }

      const success: ApiSuccess<T> = {
        ok: true,
        status: response.status,
        requestId,
        data: parsed as T,
      };
      logger.debug("api.success", { path, requestId, status: response.status });
      return success;
    } catch (err) {
      clearTimeout(timeout);
      const isAbort = err instanceof Error && err.name === "AbortError";
      const failure: ApiFailure = {
        ok: false,
        status: 0,
        error: {
          code: isAbort ? "TIMEOUT" : "NETWORK_ERROR",
          message: isAbort ? "Tempo esgotado" : "Falha de rede",
          requestId,
        },
      };
      if (method === "GET" && attempt < maxAttempts) {
        await sleep(300 * attempt);
        continue;
      }
      logger.warn("api.network", {
        path,
        code: failure.error.code,
        requestId,
        apiBaseCode: apiBase.code,
      });
      return failure;
    }
  }

  return {
    ok: false,
    status: 0,
    error: { code: "UNKNOWN", message: "Falha inesperada", requestId },
  };
}
