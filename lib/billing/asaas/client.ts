import "server-only";

import {
  assertAsaasConfigConsistent,
  getAsaasApiBaseUrl,
  getAsaasApiKey,
  isAsaasConfigured,
} from "@/lib/billing/config";
import { BILLING_EVENTS, logBilling } from "@/lib/billing/observability";
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

  try {
    assertAsaasConfigConsistent();
  } catch (err) {
    throw new AsaasApiError(
      err instanceof Error ? err.message : "Configuração Asaas inconsistente.",
      503,
      "ASAAS_CONFIG_INCONSISTENT",
    );
  }

  const base = getAsaasApiBaseUrl();
  const url = `${base}${opts.path.startsWith("/") ? opts.path : `/${opts.path}`}`;
  const method = opts.method ?? "GET";

  // Nunca logar body bruto (pode conter PAN/CVV em tokenize/creditCard).
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      access_token: apiKey,
      "User-Agent": "GestaoNoFoco/33.10",
      ...(opts.requestId ? { "x-request-id": opts.requestId } : {}),
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
    // Sanitiza: sem eco de payload de cartão
    const safeDesc = /cart[aã]o|credit.?card|cvv|ccv|pan/i.test(desc)
      ? "Falha no processamento do cartão pelo provedor."
      : desc;
    logger.warn("billing.asaas.api_error", {
      requestId: opts.requestId,
      path: opts.path.replace(/cus_[A-Za-z0-9]+/g, "cus_***"),
      status: res.status,
      code: errObj?.errors?.[0]?.code ?? null,
    });
    logBilling(
      BILLING_EVENTS.providerError,
      {
        requestId: opts.requestId,
        operation: "asaas_request",
        providerStatus: String(res.status),
        reason: errObj?.errors?.[0]?.code || "ASAAS_HTTP",
      },
      "warn",
    );
    throw new AsaasApiError(
      safeDesc,
      res.status,
      errObj?.errors?.[0]?.code || "ASAAS_HTTP",
    );
  }

  return json as T;
}

/** Máscara documento para logs (nunca CPF/CNPJ completo). */
export function maskDocument(doc: string): string {
  const d = doc.replace(/\D/g, "");
  if (d.length < 5) return "***";
  return `${d.slice(0, 3)}***${d.slice(-2)}`;
}
