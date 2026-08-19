#!/usr/bin/env node
/**
 * Sprint 35.3.1 — real provider E2E in COMMUNICATION_MODE=test.
 * Não afirma SENT/DELIVERED real. Não ativa live nem cron.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const load = (rel) =>
  import(pathToFileURL(join(root, rel)).href + `?t=${Date.now()}`);

const ALLOW_PHONE = "+5511912345678";
const ALLOW_EMAIL = "usuario@dominio.com";

function hotEnv(extra = {}) {
  return {
    COMMUNICATION_MODE: "test",
    COMMUNICATION_TEST_ALLOWLIST: `${ALLOW_PHONE},${ALLOW_EMAIL}`,
    WHATSAPP_ENABLED: "true",
    WHATSAPP_ACCESS_TOKEN: "tok",
    WHATSAPP_PHONE_NUMBER_ID: "123",
    EMAIL_ENABLED: "true",
    RESEND_API_KEY: "re_test",
    EMAIL_FROM: "loja@dominio.com",
    ...extra,
  };
}

describe("35.3.1 segurança", () => {
  it("D. live não ativado; cron production off; billing intacto", () => {
    const env = read(".env.example");
    assert.match(env, /COMMUNICATION_MODE=test/);
    assert.doesNotMatch(env, /COMMUNICATION_MODE=live/);
    assert.match(read("app/api/cron/retention/route.ts"), /production: "DISABLED"/);
    assert.doesNotMatch(read("lib/retention/process.ts"), /sendViaChannelProvider/);
    assert.doesNotMatch(read("lib/retention/budget-notify.ts"), /\.faturar\(/);
    assert.doesNotMatch(read("lib/retention/budget-notify.ts"), /asaas/i);
  });
});

describe("35.3.1 allowlist e modos", () => {
  it("normaliza telefone + e-mail na allowlist", async () => {
    const { isTestAllowlisted } = await load("lib/retention/test-mode.ts");
    const env = hotEnv();
    assert.equal(isTestAllowlisted({ phone: ALLOW_PHONE, env }), true);
    assert.equal(isTestAllowlisted({ phone: "11912345678", env }), true);
    assert.equal(isTestAllowlisted({ email: "Usuario@Dominio.com", env }), true);
    assert.equal(isTestAllowlisted({ phone: "11900000000", env }), false);
    assert.equal(isTestAllowlisted({ email: "outro@dominio.com", env }), false);
  });

  it("A. test + allowlist = request permitido", async () => {
    const { shouldDispatchReal, mapSendToOutboxPatch } = await load(
      "lib/retention/dispatch.ts",
    );
    const { createMetaCloudWhatsAppAdapter } = await load(
      "lib/retention/providers/whatsapp-meta.ts",
    );
    const env = hotEnv();
    assert.equal(
      shouldDispatchReal({ channel: "whatsapp", to: ALLOW_PHONE, env }),
      true,
    );
    assert.equal(
      shouldDispatchReal({ channel: "email", to: ALLOW_EMAIL, env }),
      true,
    );
    const adapter = createMetaCloudWhatsAppAdapter(env, async (url) => {
      assert.match(String(url), /graph\.facebook\.com/);
      return new Response(JSON.stringify({ messages: [{ id: "wamid.TEST" }] }), {
        status: 200,
      });
    });
    const result = await adapter.send({
      to: ALLOW_PHONE,
      body: "olá",
      tenantId: "t",
    });
    assert.equal(result.status, "sent");
    assert.equal(result.providerMessageId, "wamid.TEST");
    assert.notEqual(result.status, "delivered");
    assert.equal(mapSendToOutboxPatch(result).status, "sent");
    assert.match(read("lib/retention/dispatch.ts"), /if \(!shouldDispatchReal/);
  });

  it("B. test fora allowlist = zero request", async () => {
    const { shouldDispatchReal, blockedProviderSendResult } = await load(
      "lib/retention/dispatch.ts",
    );
    const env = hotEnv();
    assert.equal(
      shouldDispatchReal({ channel: "whatsapp", to: "11900000000", env }),
      false,
    );
    assert.equal(
      shouldDispatchReal({ channel: "email", to: "outro@dominio.com", env }),
      false,
    );
    const blocked = blockedProviderSendResult({
      channel: "whatsapp",
      to: "11900000000",
      env,
    });
    assert.equal(blocked.status, "blocked");
    assert.equal(blocked.errorCode, "blocked_by_allowlist");
    assert.equal(blocked.simulated, true);
    const dispatch = read("lib/retention/dispatch.ts");
    const guard = dispatch.slice(
      dispatch.indexOf("if (!shouldDispatchReal"),
      dispatch.indexOf("const provider = createChannelProvider"),
    );
    assert.match(guard, /blockedProviderSendResult/);
    assert.doesNotMatch(guard, /createChannelProvider/);
  });

  it("C. disabled = zero request", async () => {
    const { shouldDispatchReal, blockedProviderSendResult } = await load(
      "lib/retention/dispatch.ts",
    );
    const env = hotEnv({ COMMUNICATION_MODE: "disabled" });
    assert.equal(
      shouldDispatchReal({ channel: "whatsapp", to: ALLOW_PHONE, env }),
      false,
    );
    const blocked = blockedProviderSendResult({
      channel: "whatsapp",
      to: ALLOW_PHONE,
      env,
    });
    assert.equal(blocked.status, "cancelled");
    assert.equal(blocked.simulated, true);
  });

  it("env ausente nunca assume live", async () => {
    const { resolveCommunicationMode } = await load("lib/retention/test-mode.ts");
    assert.equal(resolveCommunicationMode({}), "test");
    assert.equal(resolveCommunicationMode({ COMMUNICATION_MODE: "" }), "test");
    assert.equal(
      resolveCommunicationMode({ COMMUNICATION_MODE: "dry_run" }),
      "test",
    );
  });
});

describe("35.3.1 providers", () => {
  it("E. WhatsApp missing token = provider_not_configured, zero HTTP", async () => {
    const { createMetaCloudWhatsAppAdapter } = await load(
      "lib/retention/providers/whatsapp-meta.ts",
    );
    let calls = 0;
    const adapter = createMetaCloudWhatsAppAdapter(
      hotEnv({ WHATSAPP_ACCESS_TOKEN: "" }),
      async () => {
        calls += 1;
        throw new Error("não chamar");
      },
    );
    const result = await adapter.send({
      to: ALLOW_PHONE,
      body: "olá",
      tenantId: "t",
    });
    assert.equal(calls, 0);
    assert.equal(result.status, "failed");
    assert.equal(result.errorCode, "provider_not_configured");
  });

  it("F. email missing key = provider_not_configured, zero HTTP", async () => {
    const { createResendEmailAdapter } = await load(
      "lib/retention/providers/email.ts",
    );
    let calls = 0;
    const adapter = createResendEmailAdapter(
      hotEnv({ RESEND_API_KEY: "" }),
      async () => {
        calls += 1;
        throw new Error("não chamar");
      },
    );
    const result = await adapter.send({
      to: ALLOW_EMAIL,
      body: "olá",
      tenantId: "t",
    });
    assert.equal(calls, 0);
    assert.equal(result.status, "failed");
    assert.equal(result.errorCode, "provider_not_configured");
  });

  it("G. provider 2xx = sent, não delivered", async () => {
    const { createMetaCloudWhatsAppAdapter } = await load(
      "lib/retention/providers/whatsapp-meta.ts",
    );
    const { createResendEmailAdapter } = await load(
      "lib/retention/providers/email.ts",
    );
    const { mapSendToOutboxPatch } = await load("lib/retention/dispatch.ts");
    const wa = createMetaCloudWhatsAppAdapter(hotEnv(), async () =>
      new Response(JSON.stringify({ messages: [{ id: "wamid.OK" }] }), {
        status: 201,
      }),
    );
    const email = createResendEmailAdapter(hotEnv(), async () =>
      new Response(JSON.stringify({ id: "re_123" }), { status: 200 }),
    );
    const waRes = await wa.send({ to: ALLOW_PHONE, body: "oi", tenantId: "t" });
    const emRes = await email.send({
      to: ALLOW_EMAIL,
      body: "oi",
      tenantId: "t",
    });
    assert.equal(waRes.status, "sent");
    assert.equal(emRes.status, "sent");
    assert.equal(mapSendToOutboxPatch(waRes).status, "sent");
    assert.equal(mapSendToOutboxPatch(emRes).status, "sent");
    assert.equal(
      mapSendToOutboxPatch({
        simulated: false,
        status: "delivered",
        provider: "meta_cloud",
        providerMessageId: "wamid.OK",
      }).status,
      "sent",
    );
  });

  it("kill switch ON sem WHATSAPP_PROVIDER usa meta_cloud; dry_run explícito vence", async () => {
    const { effectiveWhatsAppMode, effectiveEmailMode } = await load(
      "lib/retention/providers/runtime.ts",
    );
    assert.equal(effectiveWhatsAppMode({ WHATSAPP_ENABLED: "true" }), "meta_cloud");
    assert.equal(
      effectiveWhatsAppMode({
        WHATSAPP_ENABLED: "true",
        WHATSAPP_PROVIDER: "dry_run",
      }),
      "dry_run",
    );
    assert.equal(
      effectiveWhatsAppMode({
        WHATSAPP_PROVIDER: "meta_cloud",
        WHATSAPP_ENABLED: "false",
      }),
      "dry_run",
    );
    assert.equal(effectiveEmailMode({ EMAIL_ENABLED: "true" }), "provider");
    assert.equal(
      effectiveEmailMode({ EMAIL_ENABLED: "true", EMAIL_PROVIDER: "dry_run" }),
      "dry_run",
    );
  });
});

describe("35.3.1 webhook", () => {
  it("H. webhook delivered = delivered; nunca recua", async () => {
    const { parseMetaWebhook } = await load(
      "lib/retention/providers/whatsapp-meta.ts",
    );
    const { canAdvanceStatus } = await load("lib/retention/pipeline.ts");
    const parsed = parseMetaWebhook(
      JSON.stringify({
        entry: [
          {
            changes: [
              {
                value: {
                  statuses: [{ id: "wamid.1", status: "delivered" }],
                },
              },
            ],
          },
        ],
      }),
    );
    assert.equal(parsed.mappedStatus, "delivered");
    assert.equal(parsed.providerMessageId, "wamid.1");
    assert.equal(canAdvanceStatus("sent", "delivered"), true);
    assert.equal(canAdvanceStatus("delivered", "sent"), false);
    assert.equal(canAdvanceStatus("read", "delivered"), false);
    assert.equal(canAdvanceStatus("delivered", "read"), true);
    const failed = parseMetaWebhook(
      JSON.stringify({
        entry: [
          {
            changes: [
              { value: { statuses: [{ id: "wamid.1", status: "failed" }] } },
            ],
          },
        ],
      }),
    );
    assert.equal(failed.mappedStatus, "failed");
  });

  it("I. webhook duplicate = idempotente", async () => {
    const { parseMetaWebhook } = await load(
      "lib/retention/providers/whatsapp-meta.ts",
    );
    const { canAdvanceStatus } = await load("lib/retention/pipeline.ts");
    const body = JSON.stringify({
      entry: [
        {
          changes: [
            { value: { statuses: [{ id: "wamid.1", status: "delivered" }] } },
          ],
        },
      ],
    });
    const a = parseMetaWebhook(body);
    const b = parseMetaWebhook(body);
    assert.equal(a.eventId, b.eventId);
    assert.equal(canAdvanceStatus("delivered", "delivered"), false);
    assert.match(read("lib/retention/webhook.ts"), /recordWebhookEvent/);
    assert.match(read("lib/retention/webhook.ts"), /duplicated/);
    assert.match(read("app/api/webhooks/whatsapp/route.ts"), /hub.verify_token/);
    assert.match(read("app/api/webhooks/whatsapp/route.ts"), /processWhatsAppWebhook/);
  });
});

describe("35.3.1 retry e isolamento", () => {
  it("J. retry failed = permitido", async () => {
    const { canManualResend } = await load("lib/retention/resend.ts");
    assert.equal(
      canManualResend({
        actorTenantId: "t",
        rowTenantId: "t",
        status: "failed",
        optedIn: true,
        hasDestination: true,
      }).ok,
      true,
    );
  });

  it("K. retry delivered = bloqueado", async () => {
    const { canManualResend } = await load("lib/retention/resend.ts");
    assert.equal(
      canManualResend({
        actorTenantId: "t",
        rowTenantId: "t",
        status: "delivered",
        optedIn: true,
        hasDestination: true,
      }).ok,
      false,
    );
    assert.equal(
      canManualResend({
        actorTenantId: "t",
        rowTenantId: "t",
        status: "sent",
        optedIn: true,
        hasDestination: true,
      }).ok,
      false,
    );
  });

  it("L. cross-tenant = bloqueado", async () => {
    const { canManualResend } = await load("lib/retention/resend.ts");
    const res = canManualResend({
      actorTenantId: "a",
      rowTenantId: "b",
      status: "failed",
      optedIn: true,
      hasDestination: true,
    });
    assert.equal(res.ok, false);
    assert.match(res.note, /outro tenant/i);
    assert.match(read("lib/retention/outbox-service.ts"), /\.eq\("tenant_id"/);
    assert.match(read("lib/retention/actions.ts"), /crm\.notificacoes\.enviar/);
  });
});

describe("35.3.1 eventos P0", () => {
  it("M. SERVICE_READY não entrega OS", () => {
    const finalize = read("lib/retention/actions.ts");
    const slice = finalize.slice(
      finalize.indexOf("export async function finalizeServiceReadyAction"),
      finalize.indexOf("export async function registerOsPickupAction"),
    );
    assert.match(slice, /templateCode: "SERVICE_READY"/);
    assert.match(slice, /marcarAguardandoRetirada/);
    assert.doesNotMatch(slice, /["']entregue["']/);
  });

  it("N. BUDGET_PUBLISHED não fatura", () => {
    assert.match(
      read("lib/retention/budget-notify.ts"),
      /templateCode: "BUDGET_PUBLISHED"/,
    );
    assert.doesNotMatch(read("lib/retention/budget-notify.ts"), /\.faturar\(/);
    assert.doesNotMatch(read("lib/retention/budget-notify.ts"), /baixa.*estoque/i);
    assert.match(
      read("lib/ordens/inspecao-actions.ts"),
      /enqueueBudgetPublishedAfterPublish/,
    );
  });

  it("eventos P0 e automações default OFF", () => {
    assert.match(
      read("lib/agenda/actions.ts"),
      /templateCode: "AGENDAMENTO_CRIADO"/,
    );
    assert.match(
      read("lib/agenda/actions.ts"),
      /templateCode: "AGENDAMENTO_CONFIRMADO"/,
    );
    const sql = read(
      "supabase/migrations/20260919_phase35_3_pilot_communication.sql",
    ).replace(/--.*$/gm, "");
    assert.match(sql, /default false/);
    assert.doesNotMatch(sql, /\bDELETE FROM\b/);
  });
});

describe("35.3.1 UX e secrets", () => {
  it("central mascara destinatário e não expõe token", () => {
    const center = read("components/retention/communication-center.tsx");
    assert.match(center, /maskAddress/);
    assert.match(center, /provider_message_id/);
    assert.match(center, /Bloqueado pelo modo de teste/);
    assert.match(center, /Tentar novamente/);
    assert.doesNotMatch(center, /WHATSAPP_ACCESS_TOKEN/);
    assert.doesNotMatch(center, /RESEND_API_KEY/);
    assert.match(
      read("components/ordens/os-workspace.tsx"),
      /WhatsApp cadastrado/,
    );
    assert.match(read("app/api/webhooks/whatsapp/route.ts"), /verifyToken/);
  });
});
