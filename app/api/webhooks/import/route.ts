import { NextResponse, type NextRequest } from "next/server";

import {
  assertTenantIsolation,
  createApiErrorResponse,
} from "@/lib/import-engine/connectors/api-contract";
import {
  enterpriseImportErrorFromApiCode,
  toSafeClientMessage,
} from "@/lib/import-engine/errors/enterprise-import-errors";
import { emitImportEvent } from "@/lib/import-engine/observability/import-events";
import { getConnectorDefinition } from "@/lib/import-engine/connectors/registry";
import {
  extractIdempotencyHeader,
  isDuplicateIdempotencyKey,
  registerIdempotencyKey,
  verifyWebhookSignature,
} from "@/lib/import-engine/connectors/webhook-security";
import { isWebhooksEnabled } from "@/lib/import-engine/enterprise-feature-flags";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type WebhookAuditLog = {
  event: "webhook_import_received";
  tenantId: string;
  connectorId: string;
  idempotencyKey: string;
  bodyBytes: number;
  outcome: "accepted" | "rejected" | "duplicate" | "disabled";
  reason?: string;
  timestamp: string;
};

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(key: string, now = Date.now()): boolean {
  const bucket = rateLimitMap.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= RATE_LIMIT;
}

function auditLog(entry: WebhookAuditLog): void {
  emitImportEvent(
    entry.outcome === "accepted"
      ? "import.webhook.received"
      : "import.webhook.rejected",
    {
      tenantId: entry.tenantId,
      connectorId: entry.connectorId,
      correlationId: entry.idempotencyKey || undefined,
      outcome: entry.outcome === "accepted" ? "success" : "failure",
      errorCode: entry.reason,
      fileBytes: entry.bodyBytes,
    },
  );
}

/**
 * Resolve tenant a partir da config autenticada do conector — NUNCA confiar
 * apenas no payload.tenantId.
 */
function resolveTenantFromConnector(connectorId: string): {
  tenantId: string;
  secret: string;
} | null {
  const def = getConnectorDefinition(connectorId);
  if (!def || def.status !== "connected") {
    return null;
  }
  const tenantId = process.env[`WEBHOOK_CONNECTOR_${connectorId.toUpperCase()}_TENANT`]?.trim();
  const secret = process.env[`WEBHOOK_CONNECTOR_${connectorId.toUpperCase()}_SECRET`]?.trim();
  if (!tenantId || !secret) return null;
  return { tenantId, secret };
}

export async function POST(request: NextRequest) {
  if (!isWebhooksEnabled()) {
    const err = createApiErrorResponse(
      "preparing",
      toSafeClientMessage(
        enterpriseImportErrorFromApiCode(
          "preparing",
          "Webhook de importação está em preparação (WEBHOOK_IMPORT_ENABLED).",
        ),
      ),
    );
    return NextResponse.json(err.body, { status: err.status });
  }

  const signature =
    request.headers.get("x-import-signature") ??
    request.headers.get("X-Import-Signature") ??
    "";
  const timestamp =
    request.headers.get("x-import-timestamp") ??
    request.headers.get("X-Import-Timestamp") ??
    "";
  const connectorId =
    request.headers.get("x-connector-id") ??
    request.headers.get("X-Connector-Id") ??
    "webhook";
  const idempotencyKey =
    extractIdempotencyHeader({
      "x-idempotency-key": request.headers.get("x-idempotency-key") ?? undefined,
      "X-Idempotency-Key": request.headers.get("X-Idempotency-Key") ?? undefined,
    }) ?? "";

  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`${connectorId}:${clientIp}`)) {
    const err = createApiErrorResponse("rate_limited", "Limite de requisições excedido.");
    return NextResponse.json(err.body, { status: err.status });
  }

  const auth = resolveTenantFromConnector(connectorId);
  if (!auth) {
    auditLog({
      event: "webhook_import_received",
      tenantId: "unknown",
      connectorId,
      idempotencyKey,
      bodyBytes: 0,
      outcome: "rejected",
      reason: "connector_not_configured",
      timestamp: new Date().toISOString(),
    });
    const err = createApiErrorResponse(
      "unauthorized",
      "Conector não autenticado ou em preparação.",
    );
    return NextResponse.json(err.body, { status: err.status });
  }

  const rawBody = await request.text();

  const verify = verifyWebhookSignature(
    auth.secret,
    rawBody,
    signature,
    timestamp,
  );
  if (!verify.valid) {
    auditLog({
      event: "webhook_import_received",
      tenantId: auth.tenantId,
      connectorId,
      idempotencyKey,
      bodyBytes: Buffer.byteLength(rawBody, "utf8"),
      outcome: "rejected",
      reason: verify.reason,
      timestamp: new Date().toISOString(),
    });
    const err = createApiErrorResponse("unauthorized", "Assinatura ou timestamp inválido.");
    return NextResponse.json(err.body, { status: err.status });
  }

  if (!idempotencyKey) {
    const err = createApiErrorResponse(
      "validation_error",
      "Header X-Idempotency-Key é obrigatório.",
    );
    return NextResponse.json(err.body, { status: err.status });
  }

  if (isDuplicateIdempotencyKey(idempotencyKey)) {
    auditLog({
      event: "webhook_import_received",
      tenantId: auth.tenantId,
      connectorId,
      idempotencyKey,
      bodyBytes: Buffer.byteLength(rawBody, "utf8"),
      outcome: "duplicate",
      timestamp: new Date().toISOString(),
    });
    const err = createApiErrorResponse("conflict", "Requisição duplicada (idempotency key).");
    return NextResponse.json(err.body, { status: err.status });
  }

  let payloadTenant: string | undefined;
  try {
    const parsed = JSON.parse(rawBody) as Record<string, unknown>;
    payloadTenant =
      typeof parsed.tenantId === "string"
        ? parsed.tenantId
        : typeof parsed.tenant_id === "string"
          ? parsed.tenant_id
          : undefined;
  } catch {
    /* corpo não-JSON — tenant só via conector */
  }

  const isolation = assertTenantIsolation(auth.tenantId, payloadTenant);
  if (!isolation.ok) {
    auditLog({
      event: "webhook_import_received",
      tenantId: auth.tenantId,
      connectorId,
      idempotencyKey,
      bodyBytes: Buffer.byteLength(rawBody, "utf8"),
      outcome: "rejected",
      reason: "tenant_mismatch",
      timestamp: new Date().toISOString(),
    });
    const err = createApiErrorResponse("forbidden", isolation.message);
    return NextResponse.json(err.body, { status: err.status });
  }

  registerIdempotencyKey(idempotencyKey);

  auditLog({
    event: "webhook_import_received",
    tenantId: auth.tenantId,
    connectorId,
    idempotencyKey,
    bodyBytes: Buffer.byteLength(rawBody, "utf8"),
    outcome: "accepted",
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json(
    {
      ok: true,
      status: "accepted",
      tenantId: auth.tenantId,
      message: "Webhook recebido — processamento assíncrono em preparação.",
    },
    { status: 202 },
  );
}
