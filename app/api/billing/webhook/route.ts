import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import {
  getBillingWebhookSecret,
  getConfiguredBillingProvider,
  isBillingProviderConfigured,
} from "@/lib/billing/config";
import { logger } from "@/lib/observability/logger";
import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/billing/webhook
 * Provider-agnostic stub: exige secret; idempotente por (provider, event_id).
 * Nunca marca paid sem event_id + verificação.
 * Sem provedor configurado → 503 (não simula pagamento).
 */

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function verifySharedSecret(request: NextRequest, secret: string): boolean {
  const header =
    request.headers.get("x-billing-webhook-secret") ||
    request.headers.get("x-webhook-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  if (!header) return false;
  return safeEqual(header, secret);
}

function sanitizeSummary(body: unknown): Json {
  if (!body || typeof body !== "object") return { type: typeof body };
  const obj = body as Record<string, unknown>;
  const out: Record<string, string | number | boolean | null | string[]> = {};
  for (const key of [
    "id",
    "type",
    "event",
    "event_type",
    "status",
    "tenant_id",
    "customer_id",
    "subscription_id",
  ]) {
    const v = obj[key];
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null) {
      out[key] = v;
    }
  }
  out.keys = Object.keys(obj).slice(0, 20);
  return out;
}

export async function POST(request: NextRequest) {
  const requestId =
    request.headers.get("x-request-id") || crypto.randomUUID();

  if (!isBillingProviderConfigured()) {
    logger.warn("billing_webhook_provider_missing", { requestId });
    return NextResponse.json(
      {
        ok: false,
        code: "PROVIDER_NOT_CONFIGURED",
        message: "Provedor de billing não configurado. Webhook inativo.",
      },
      { status: 503, headers: { "x-request-id": requestId } },
    );
  }

  const secret = getBillingWebhookSecret();
  if (!secret) {
    return NextResponse.json(
      { ok: false, code: "WEBHOOK_SECRET_MISSING" },
      { status: 503, headers: { "x-request-id": requestId } },
    );
  }

  if (!verifySharedSecret(request, secret)) {
    logger.warn("billing_webhook_invalid_signature", { requestId });
    return NextResponse.json(
      { ok: false, code: "INVALID_SIGNATURE" },
      { status: 401, headers: { "x-request-id": requestId } },
    );
  }

  if (!isAdminClientAvailable()) {
    return NextResponse.json(
      { ok: false, code: "SERVICE_ROLE_MISSING" },
      { status: 503, headers: { "x-request-id": requestId } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: "INVALID_JSON" },
      { status: 400, headers: { "x-request-id": requestId } },
    );
  }

  const obj = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;
  const provider = getConfiguredBillingProvider();
  const eventIdRaw =
    (typeof obj.id === "string" && obj.id) ||
    (typeof obj.event_id === "string" && obj.event_id) ||
    null;

  if (!eventIdRaw) {
    return NextResponse.json(
      { ok: false, code: "EVENT_ID_REQUIRED" },
      { status: 400, headers: { "x-request-id": requestId } },
    );
  }

  const eventId = eventIdRaw.slice(0, 200);
  const eventType =
    (typeof obj.type === "string" && obj.type) ||
    (typeof obj.event_type === "string" && obj.event_type) ||
    null;
  const tenantId =
    typeof obj.tenant_id === "string" ? obj.tenant_id : null;

  const admin = createAdminClient();
  const { error } = await admin.from("billing_provider_events").insert({
    provider,
    event_id: eventId,
    tenant_id: tenantId,
    event_type: eventType,
    payload_summary: sanitizeSummary(body),
  });

  if (error) {
    if (error.code === "23505") {
      logger.info("billing_webhook_replay", {
        requestId,
        provider,
        eventIdHash: createHash("sha256").update(eventId).digest("hex").slice(0, 12),
      });
      return NextResponse.json(
        { ok: true, duplicate: true },
        { status: 200, headers: { "x-request-id": requestId } },
      );
    }
    logger.exception("billing_webhook_persist_failed", error, { requestId });
    return NextResponse.json(
      { ok: false, code: "PERSIST_FAILED" },
      { status: 500, headers: { "x-request-id": requestId } },
    );
  }

  // Status sync real (active/past_due) só após mapeamento de eventos do provedor escolhido.
  logger.info("billing_webhook_accepted", {
    requestId,
    provider,
    eventType,
    hasTenant: Boolean(tenantId),
  });

  return NextResponse.json(
    {
      ok: true,
      accepted: true,
      note: "Evento registrado. Mapeamento de status aguarda integração do provedor escolhido.",
    },
    { status: 200, headers: { "x-request-id": requestId } },
  );
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "billing-webhook",
    providerConfigured: isBillingProviderConfigured(),
    provider: getConfiguredBillingProvider(),
  });
}
