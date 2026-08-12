#!/usr/bin/env node
/**
 * Sprint 33.4 — Asaas adapter contracts (no live API calls without credentials).
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

describe("33.4 Asaas files present", () => {
  for (const p of [
    "lib/billing/asaas/client.ts",
    "lib/billing/asaas/customers.ts",
    "lib/billing/asaas/subscriptions.ts",
    "lib/billing/asaas/status-map.ts",
    "lib/billing/asaas/webhook.ts",
    "docs/billing/ASAAS_SANDBOX.md",
  ]) {
    it(`exists ${p}`, () => assert.ok(existsSync(join(root, p))));
  }
});

describe("33.4 status mapping", () => {
  it("não promove desconhecido para active", async () => {
    const mod = await import(
      pathToFileURL(join(root, "lib/billing/asaas/status-map.ts")).href +
        `?t=${Date.now()}`
    );
    assert.equal(
      mod.mapAsaasEventToInternalStatus({ event: "PAYMENT_RECEIVED" }),
      "active",
    );
    assert.equal(
      mod.mapAsaasEventToInternalStatus({ event: "PAYMENT_OVERDUE" }),
      "past_due",
    );
    assert.equal(
      mod.mapAsaasEventToInternalStatus({ event: "PAYMENT_REFUNDED" }),
      "canceled",
    );
    assert.equal(
      mod.mapAsaasEventToInternalStatus({ event: "SUBSCRIPTION_CREATED" }),
      "ignore",
    );
    assert.equal(
      mod.mapAsaasEventToInternalStatus({ event: "FOO_BAR_UNKNOWN" }),
      "unknown",
    );
  });
});

describe("33.4 config sandbox safety", () => {
  it("asaas sem secrets = não configurado", async () => {
    const prev = {
      BILLING_PROVIDER: process.env.BILLING_PROVIDER,
      ASAAS_API_KEY: process.env.ASAAS_API_KEY,
      ASAAS_WEBHOOK_TOKEN: process.env.ASAAS_WEBHOOK_TOKEN,
      BILLING_ASAAS_CHECKOUT_ENABLED: process.env.BILLING_ASAAS_CHECKOUT_ENABLED,
    };
    process.env.BILLING_PROVIDER = "asaas";
    delete process.env.ASAAS_API_KEY;
    delete process.env.ASAAS_WEBHOOK_TOKEN;
    process.env.BILLING_ASAAS_CHECKOUT_ENABLED = "0";
    const mod = await import(
      pathToFileURL(join(root, "lib/billing/config.ts")).href +
        `?t=${Date.now()}`
    );
    assert.equal(mod.isAsaasConfigured(), false);
    assert.equal(mod.isAsaasCheckoutEnabled(), false);
    assert.ok(mod.listMissingAsaasCredentials().includes("ASAAS_API_KEY (sandbox)"));
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("production URL bloqueada sem allow", async () => {
    const prev = {
      ASAAS_ENV: process.env.ASAAS_ENV,
      ASAAS_ALLOW_PRODUCTION: process.env.ASAAS_ALLOW_PRODUCTION,
      ASAAS_API_BASE_URL: process.env.ASAAS_API_BASE_URL,
    };
    process.env.ASAAS_ENV = "sandbox";
    delete process.env.ASAAS_ALLOW_PRODUCTION;
    delete process.env.ASAAS_API_BASE_URL;
    const mod = await import(
      pathToFileURL(join(root, "lib/billing/config.ts")).href +
        `?t=${Date.now() + 1}`
    );
    assert.equal(mod.getAsaasApiBaseUrl(), "https://api-sandbox.asaas.com");
    process.env.ASAAS_ENV = "production";
    assert.throws(() => mod.getAsaasApiBaseUrl());
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });
});

describe("33.4 webhook + actions contracts", () => {
  it("webhook valida asaas-access-token e processa eventos reais", () => {
    const wh = read("app/api/billing/webhook/route.ts");
    assert.match(wh, /asaas-access-token/);
    assert.match(wh, /processAsaasWebhook/);
    assert.match(wh, /billing\.webhook\.rejected/);
    const proc = read("lib/billing/asaas/webhook.ts");
    const map = read("lib/billing/asaas/status-map.ts");
    assert.match(map, /PAYMENT_RECEIVED/);
    assert.match(map, /PAYMENT_OVERDUE/);
    assert.match(proc, /SUBSCRIPTION_MISMATCH|CUSTOMER_MISMATCH/);
    assert.match(proc, /23505/);
  });

  it("checkout não marca active; cartão bloqueado sem tokenização", () => {
    const actions = read("lib/billing/actions.ts");
    assert.match(actions, /CREDIT_CARD/);
    assert.match(actions, /BILLING_CARD_NOT_SUPPORTED/);
    assert.match(actions, /status interno não foi marcado active/);
    assert.match(actions, /ensureAsaasCustomer/);
    assert.match(actions, /ensureAsaasSubscription/);
    assert.match(actions, /cancelSubscriptionAction/);
    assert.doesNotMatch(actions, /status:\s*["']active["']/);
  });

  it("customer usa externalReference=tenant_id", () => {
    const src = read("lib/billing/asaas/customers.ts");
    assert.match(src, /externalReference/);
    assert.match(src, /maskDocument/);
  });

  it("UI sandbox + PIX/BOLETO + cancel", () => {
    const ui = read("components/billing/billing-actions-panel.tsx");
    assert.match(ui, /AMBIENTE DE TESTE \/ SANDBOX/);
    assert.match(ui, /PIX/);
    assert.match(ui, /BOLETO/);
    assert.match(ui, /cancelSubscriptionAction/);
    const page = read("app/(app)/[tenant]/configuracoes/assinatura/page.tsx");
    assert.match(page, /isSandbox/);
  });

  it("mobile não alterado", () => {
    assert.ok(!read("lib/billing/asaas/client.ts").includes("apps/mobile"));
  });
});

describe("33.4 entitlements still require RBAC", () => {
  it("finalAccessAllowed", async () => {
    const mod = await import(
      pathToFileURL(join(root, "lib/billing/entitlements.ts")).href +
        `?t=${Date.now()}`
    );
    assert.equal(
      mod.finalAccessAllowed({ entitlementAllowed: true, rbacAllowed: false }),
      false,
    );
    assert.equal(
      mod.finalAccessAllowed({ entitlementAllowed: true, rbacAllowed: true }),
      true,
    );
  });
});
