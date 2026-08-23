#!/usr/bin/env node
/**
 * Hotfix — immediate email dispatch from OS SERVICE_READY (test + allowlist).
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

const ALLOW_EMAIL = "usuario@dominio.com";

function hotEnv(extra = {}) {
  return {
    COMMUNICATION_MODE: "test",
    COMMUNICATION_TEST_ALLOWLIST: ALLOW_EMAIL,
    EMAIL_ENABLED: "true",
    RESEND_API_KEY: "re_test",
    EMAIL_FROM: "Gestão no Foco <noreply@mail.gestaonofoco.com.br>",
    ...extra,
  };
}

describe("hotfix OS email dispatch", () => {
  it("A. SERVICE_READY email allowlisted → Resend + SENT", async () => {
    const { createResendEmailAdapter } = await load(
      "lib/retention/providers/email.ts",
    );
    const { mapSendToOutboxPatch } = await load("lib/retention/dispatch.ts");
    let called = false;
    const adapter = createResendEmailAdapter(hotEnv(), async (url, init) => {
      called = true;
      assert.match(String(url), /api\.resend\.com/);
      const body = JSON.parse(String(init?.body));
      assert.equal(body.from, "Gestão no Foco <noreply@mail.gestaonofoco.com.br>");
      assert.deepEqual(body.to, [ALLOW_EMAIL]);
      return new Response(JSON.stringify({ id: "re_hotfix_1" }), { status: 200 });
    });
    const result = await adapter.send({
      to: ALLOW_EMAIL,
      body: "Serviço pronto",
      tenantId: "t",
    });
    assert.equal(called, true);
    assert.equal(result.status, "sent");
    assert.equal(result.providerMessageId, "re_hotfix_1");
    assert.equal(mapSendToOutboxPatch(result).status, "sent");
  });

  it("B. fora da allowlist → BLOCKED, zero HTTP", async () => {
    const { shouldDispatchReal, blockedProviderSendResult } = await load(
      "lib/retention/dispatch.ts",
    );
    const env = hotEnv();
    assert.equal(
      shouldDispatchReal({ channel: "email", to: "outro@dominio.com", env }),
      false,
    );
    const blocked = blockedProviderSendResult({
      channel: "email",
      to: "outro@dominio.com",
      env,
    });
    assert.equal(blocked.status, "blocked");
    assert.equal(blocked.errorCode, "blocked_by_allowlist");
    assert.equal(blocked.simulated, true);
  });

  it("C. EMAIL_ENABLED=false → não envia", async () => {
    const { shouldDispatchReal } = await load("lib/retention/dispatch.ts");
    const env = hotEnv({ EMAIL_ENABLED: "false" });
    assert.equal(
      shouldDispatchReal({ channel: "email", to: ALLOW_EMAIL, env }),
      false,
    );
  });

  it("D. RESEND_API_KEY ausente → falha controlada", async () => {
    const { createResendEmailAdapter } = await load(
      "lib/retention/providers/email.ts",
    );
    let called = false;
    const adapter = createResendEmailAdapter(
      hotEnv({ RESEND_API_KEY: "" }),
      async () => {
        called = true;
        throw new Error("não chamar");
      },
    );
    const result = await adapter.send({
      to: ALLOW_EMAIL,
      body: "oi",
      tenantId: "t",
    });
    assert.equal(called, false);
    assert.equal(result.status, "failed");
    assert.equal(result.errorCode, "provider_not_configured");
  });

  it("E. EMAIL_FROM ausente → falha controlada", async () => {
    const { createResendEmailAdapter } = await load(
      "lib/retention/providers/email.ts",
    );
    const adapter = createResendEmailAdapter(hotEnv({ EMAIL_FROM: "" }), async () =>
      new Response(JSON.stringify({ id: "x" }), { status: 200 }),
    );
    const result = await adapter.send({
      to: ALLOW_EMAIL,
      body: "oi",
      tenantId: "t",
    });
    assert.equal(result.status, "failed");
    assert.equal(result.errorCode, "provider_not_configured");
  });

  it("F. Resend 4xx → FAILED sem crash", async () => {
    const { createResendEmailAdapter } = await load(
      "lib/retention/providers/email.ts",
    );
    const adapter = createResendEmailAdapter(hotEnv(), async () =>
      new Response("bad", { status: 422 }),
    );
    const result = await adapter.send({
      to: ALLOW_EMAIL,
      body: "oi",
      tenantId: "t",
    });
    assert.equal(result.status, "failed");
    assert.match(result.errorCode ?? "", /http_422/);
  });

  it("G. idempotência redispatch na mesma linha", () => {
    assert.match(read("lib/retention/outbox-service.ts"), /enqueueExistingRow/);
    assert.match(read("lib/retention/outbox-service.ts"), /findByIdempotencyKey/);
    assert.match(read("lib/retention/outbox-service.ts"), /retryDispatch\(existing\)/);
    const finalize = read("lib/retention/actions.ts");
    assert.doesNotMatch(
      finalize.slice(
        finalize.indexOf("export async function finalizeServiceReadyAction"),
        finalize.indexOf("export async function registerOsPickupAction"),
      ),
      /["']entregue["']/,
    );
  });

  it("EMAIL_FROM com display name aceito", async () => {
    const { resolveEmailFromAddress, emailFromConfigured } = await load(
      "lib/retention/providers/runtime.ts",
    );
    const raw = "Gestão no Foco <noreply@mail.gestaonofoco.com.br>";
    assert.equal(resolveEmailFromAddress(raw), "noreply@mail.gestaonofoco.com.br");
    assert.equal(
      emailFromConfigured({
        RESEND_API_KEY: "re_test",
        EMAIL_FROM: raw,
      }),
      true,
    );
  });

  it("finalize não depende de cron", () => {
    assert.match(read("lib/retention/outbox-service.ts"), /dispatchIfAllowed/);
    assert.doesNotMatch(read("lib/retention/process.ts"), /sendViaChannelProvider/);
    assert.match(read("app/api/cron/retention/route.ts"), /DISABLED/);
  });

  it("observabilidade estruturada sem secrets", () => {
    assert.match(read("lib/retention/observability.ts"), /logCommunicationDispatch/);
    assert.match(read("lib/retention/dispatch.ts"), /logCommunicationDispatch/);
    assert.doesNotMatch(read("lib/retention/observability.ts"), /RESEND_API_KEY/);
  });

  it("UI reflete status por canal", async () => {
    const { formatServiceReadyFinalizeNote } = await load(
      "lib/retention/service-ready.ts",
    );
    const sent = formatServiceReadyFinalizeNote({
      notify: true,
      channels: [{ channel: "email", status: "sent", note: "ok" }],
    });
    assert.match(sent, /E-mail enviado/);
    const blocked = formatServiceReadyFinalizeNote({
      notify: true,
      channels: [{ channel: "email", status: "blocked", note: "blocked" }],
    });
    assert.match(blocked, /bloqueado pelo modo de teste/);
  });
});
