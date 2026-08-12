import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { processAsaasWebhook } from "@/lib/billing/asaas/webhook";
import type { AsaasWebhookPayload } from "@/lib/billing/asaas/types";
import {
  getAsaasWebhookToken,
  getBillingWebhookSecret,
  getConfiguredBillingProvider,
  isAsaasConfigured,
  isAsaasSandbox,
  isBillingProviderConfigured,
} from "@/lib/billing/config";
import { logger } from "@/lib/observability/logger";
import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function verifyAsaasToken(request: NextRequest, token: string): boolean {
  const header =
    request.headers.get("asaas-access-token") ||
    request.headers.get("x-billing-webhook-secret") ||
    request.headers.get("x-webhook-secret") ||
    "";
  if (!header) return false;
  return safeEqual(header, token);
}

function sanitizeGeneric(body: unknown): Json {
  if (!body || typeof body !== "object") return { type: typeof body };
  const obj = body as Record<string, unknown>;
  const out: Record<string, string | number | boolean | null | string[]> = {};
  for (const key of ["id", "event", "type", "event_type", "status"]) {
    const v = obj[key];
    if (
      typeof v === "string" ||
      typeof v === "number" ||
      typeof v === "boolean" ||
      v === null
    ) {
      out[key] = v;
    }
  }
  out.keys = Object.keys(obj).slice(0, 20);
  return out;
}

export async function POST(request: NextRequest) {
  const requestId =
    request.headers.get("x-request-id") || crypto.randomUUID();
  const provider = getConfiguredBillingProvider();

  if (!isBillingProviderConfigured()) {
    logger.warn("billing.webhook.rejected", {
      requestId,
      reason: "PROVIDER_NOT_CONFIGURED",
    });
    return NextResponse.json(
      {
        ok: false,
        code: "PROVIDER_NOT_CONFIGURED",
        message: "Provedor de billing não configurado. Webhook inativo.",
      },
      { status: 503, headers: { "x-request-id": requestId } },
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
    logger.warn("billing.webhook.rejected", {
      requestId,
      reason: "INVALID_JSON",
    });
    return NextResponse.json(
      { ok: false, code: "INVALID_JSON" },
      { status: 400, headers: { "x-request-id": requestId } },
    );
  }

  // —— Asaas path ——
  if (provider === "asaas" && isAsaasConfigured()) {
    const token = getAsaasWebhookToken();
    if (!token || !verifyAsaasToken(request, token)) {
      logger.warn("billing.webhook.rejected", {
        requestId,
        reason: "INVALID_SIGNATURE",
      });
      return NextResponse.json(
        { ok: false, code: "INVALID_SIGNATURE" },
        { status: 401, headers: { "x-request-id": requestId } },
      );
    }

    const admin = createAdminClient();
    try {
      const result = await processAsaasWebhook({
        admin,
        payload: body as AsaasWebhookPayload,
        requestId,
      });
      if (!result.ok) {
        const status =
          result.code === "EVENT_ID_REQUIRED" ||
          result.code === "EVENT_TYPE_REQUIRED"
            ? 400
            : result.code === "SUBSCRIPTION_MISMATCH" ||
                result.code === "CUSTOMER_MISMATCH"
              ? 409
              : 400;
        return NextResponse.json(result, {
          status,
          headers: { "x-request-id": requestId },
        });
      }
      return NextResponse.json(
        { ...result, sandbox: isAsaasSandbox() },
        { status: 200, headers: { "x-request-id": requestId } },
      );
    } catch (err) {
      logger.exception("billing.webhook.persist_failed", err, { requestId });
      return NextResponse.json(
        { ok: false, code: "PERSIST_FAILED" },
        { status: 500, headers: { "x-request-id": requestId } },
      );
    }
  }

  // —— Generic stub (non-asaas) ——
  const secret = getBillingWebhookSecret();
  if (!secret) {
    return NextResponse.json(
      { ok: false, code: "WEBHOOK_SECRET_MISSING" },
      { status: 503, headers: { "x-request-id": requestId } },
    );
  }
  const header =
    request.headers.get("x-billing-webhook-secret") ||
    request.headers.get("asaas-access-token") ||
    "";
  if (!header || !safeEqual(header, secret)) {
    logger.warn("billing.webhook.rejected", {
      requestId,
      reason: "INVALID_SIGNATURE",
    });
    return NextResponse.json(
      { ok: false, code: "INVALID_SIGNATURE" },
      { status: 401, headers: { "x-request-id": requestId } },
    );
  }

  const obj = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;
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

  const admin = createAdminClient();
  const { error } = await admin.from("billing_provider_events").insert({
    provider,
    event_id: eventIdRaw.slice(0, 200),
    tenant_id: typeof obj.tenant_id === "string" ? obj.tenant_id : null,
    event_type:
      (typeof obj.event === "string" && obj.event) ||
      (typeof obj.type === "string" && obj.type) ||
      null,
    payload_summary: sanitizeGeneric(body),
  });

  if (error?.code === "23505") {
    logger.info("billing.webhook.duplicate", {
      requestId,
      eventIdHash: createHash("sha256")
        .update(eventIdRaw)
        .digest("hex")
        .slice(0, 12),
    });
    return NextResponse.json(
      { ok: true, duplicate: true },
      { status: 200, headers: { "x-request-id": requestId } },
    );
  }
  if (error) {
    logger.exception("billing.webhook.persist_failed", error, { requestId });
    return NextResponse.json(
      { ok: false, code: "PERSIST_FAILED" },
      { status: 500, headers: { "x-request-id": requestId } },
    );
  }

  logger.info("billing.webhook.received", { requestId, provider });
  return NextResponse.json(
    { ok: true, accepted: true },
    { status: 200, headers: { "x-request-id": requestId } },
  );
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "billing-webhook",
    providerConfigured: isBillingProviderConfigured(),
    provider: getConfiguredBillingProvider(),
    asaasConfigured: isAsaasConfigured(),
    sandbox: getConfiguredBillingProvider() === "asaas" ? isAsaasSandbox() : null,
  });
}
