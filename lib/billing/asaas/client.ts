import "server-only";

import {
  getAsaasApiBaseUrl,
  getAsaasApiKey,
  isAsaasConfigured,
} from "@/lib/billing/config";
import { logger } from "@/lib/observability/logger";

export class AsaasApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code = "ASAAS_API_ERROR") {
    super(message);
    this.name = "AsaasApiError";
    this.status = status;
    this.code = code;
  }
}

type AsaasRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  body?: unknown;
  /** Correlation for logs (no secrets). */
  requestId?: string;
};

export async function asaasRequest<T>(opts: AsaasRequestOptions): Promise<T> {
  if (!isAsaasConfigured()) {
    throw new AsaasApiError(
      "Asaas não configurado (ASAAS_API_KEY / ASAAS_WEBHOOK_TOKEN / BILLING_PROVIDER).",
      503,
      "ASAAS_NOT_CONFIGURED",
    );
  }
  const apiKey = getAsaasApiKey();
  if (!apiKey) {
    throw new AsaasApiError("ASAAS_API_KEY ausente", 503, "ASAAS_KEY_MISSING");
  }

  const base = getAsaasApiBaseUrl();
  const url = `${base}${opts.path.startsWith("/") ? opts.path : `/${opts.path}`}`;
  const method = opts.method ?? "GET";

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      access_token: apiKey,
      "User-Agent": "GestaoNoFoco/33.4",
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }

  if (!res.ok) {
    const errObj = json as { errors?: Array<{ description?: string; code?: string }> } | null;
    const desc =
      errObj?.errors?.[0]?.description ||
      `Asaas HTTP ${res.status}`;
    logger.warn("billing.asaas.api_error", {
      requestId: opts.requestId,
      path: opts.path,
      status: res.status,
      code: errObj?.errors?.[0]?.code ?? null,
    });
    throw new AsaasApiError(desc, res.status, errObj?.errors?.[0]?.code || "ASAAS_HTTP");
  }

  return json as T;
}

/** Máscara documento para logs (nunca CPF/CNPJ completo). */
export function maskDocument(doc: string): string {
  const d = doc.replace(/\D/g, "");
  if (d.length < 5) return "***";
  return `${d.slice(0, 3)}***${d.slice(-2)}`;
}
