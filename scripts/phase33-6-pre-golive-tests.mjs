#!/usr/bin/env node
/**
 * Sprint 33.6 — pré-go-live: fail-closed production, preço server-side, webhook rank.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

describe("33.6 files", () => {
  for (const p of [
    "lib/billing/config.ts",
    "lib/billing/checkout-amount.ts",
    "lib/billing/status-guard.ts",
    "docs/billing/PRE_PRODUCTION_RUNBOOK.md",
  ]) {
    it(`exists ${p}`, () => assert.ok(existsSync(join(root, p))));
  }
});

describe("33.6 production fail-closed", () => {
  it("sandbox default; production URL blocked; real charges off", async () => {
    const prev = { ...process.env };
    process.env.ASAAS_ENV = "sandbox";
    delete process.env.ASAAS_ALLOW_PRODUCTION;
    delete process.env.ASAAS_API_BASE_URL;
    delete process.env.BILLING_REAL_CHARGES_ENABLED;
    process.env.BILLING_PROVIDER = "asaas";
    process.env.ASAAS_API_KEY = "sandbox-key";
    process.env.ASAAS_WEBHOOK_TOKEN = "sandbox-wh";
    process.env.BILLING_ASAAS_CHECKOUT_ENABLED = "1";
    const mod = await import(
      pathToFileURL(join(root, "lib/billing/config.ts")).href +
        `?t=${Date.now()}`
    );
    assert.equal(mod.getAsaasApiBaseUrl(), "https://api-sandbox.asaas.com");
    assert.equal(mod.isAsaasSandbox(), true);
    assert.equal(mod.isRealChargesAuthorized(), false);
    assert.equal(mod.isAsaasCheckoutEnabled(), true);

    process.env.ASAAS_ENV = "production";
    assert.throws(() => mod.getAsaasApiBaseUrl());
    assert.equal(mod.isAsaasCheckoutEnabled(), false);

    process.env.ASAAS_ALLOW_PRODUCTION = "1";
    assert.equal(mod.getAsaasApiBaseUrl(), "https://api.asaas.com");
    assert.equal(mod.isAsaasCheckoutEnabled(), false, "sem REAL_CHARGES");

    process.env.BILLING_REAL_CHARGES_ENABLED = "1";
    assert.equal(mod.isAsaasCheckoutEnabled(), true);

    process.env.ASAAS_ENV = "sandbox";
    delete process.env.ASAAS_ALLOW_PRODUCTION;
    process.env.ASAAS_API_BASE_URL = "https://api.asaas.com";
    assert.throws(() => mod.getAsaasApiBaseUrl());

    for (const k of Object.keys(process.env)) {
      if (!(k in prev)) delete process.env[k];
    }
    Object.assign(process.env, prev);
  });
});

describe("33.6 preço server-side", () => {
  it("R$ 19,90 só sandbox homologação; production exige plano", async () => {
    const prevEnv = process.env.ASAAS_ENV;
    process.env.ASAAS_ENV = "sandbox";
    const mod = await import(
      pathToFileURL(join(root, "lib/billing/checkout-amount.ts")).href +
        `?t=${Date.now()}`
    );
    const pilot = {
      id: "1",
      slug: "pilot",
      name: "Piloto",
      status: "active",
      amountCents: null,
      currency: null,
      billingInterval: null,
      entitlements: {},
      isPilot: true,
    };
    const sb = mod.resolveCheckoutAmount(pilot);
    assert.equal(sb.ok, true);
    assert.equal(sb.source, "sandbox_homologation");

    process.env.ASAAS_ENV = "production";
    const prod = mod.resolveCheckoutAmount(pilot);
    assert.equal(prod.ok, false);
    assert.equal(prod.code, "COMMERCIAL_PRICE_UNDEFINED");

    const priced = mod.resolveCheckoutAmount({ ...pilot, amountCents: 4990 });
    assert.equal(priced.ok, true);
    assert.equal(priced.valueReais, 49.9);
    assert.equal(priced.source, "plan");

    assert.equal(
      mod.isPlanSlugAuthorized({
        requestedSlug: "enterprise-secret",
        tenantPlanSlug: "pilot",
      }),
      false,
    );
    assert.equal(
      mod.isPlanSlugAuthorized({
        requestedSlug: "pilot",
        tenantPlanSlug: "pilot",
      }),
      true,
    );
    assert.equal(
      mod.rejectClientPriceFields({ amount: 1 }),
      "Preço não pode ser enviado pelo cliente.",
    );
    assert.equal(mod.rejectClientPriceFields({ billingType: "PIX" }), null);
    if (prevEnv === undefined) delete process.env.ASAAS_ENV;
    else process.env.ASAAS_ENV = prevEnv;
  });
});

describe("33.6 webhook não regride confirmed", () => {
  it("active não volta a trial; CONFIRMED não vira PENDING", async () => {
    const mod = await import(
      pathToFileURL(join(root, "lib/billing/status-guard.ts")).href +
        `?t=${Date.now()}`
    );
    assert.equal(mod.canApplySubscriptionStatus("active", "trial"), false);
    assert.equal(mod.canApplySubscriptionStatus("active", "past_due"), true);
    assert.equal(mod.canApplySubscriptionStatus("canceled", "active"), false);
    assert.equal(mod.canApplyPaymentStatus("CONFIRMED", "PENDING"), false);
    assert.equal(mod.canApplyPaymentStatus("PENDING", "CONFIRMED"), true);
    assert.equal(
      mod.resolveCommercialLifecycle({
        subscriptionStatus: "trial",
        checkoutCompleted: true,
      }),
      "pending",
    );
  });
});

describe("33.6 contracts", () => {
  it("actions rejeitam preço do cliente e plano não autorizado", () => {
    const actions = read("lib/billing/actions.ts");
    assert.match(actions, /PRICE_NOT_CLIENT_SETTABLE/);
    assert.match(actions, /PLAN_NOT_AUTHORIZED/);
    assert.match(actions, /resolveCheckoutAmount/);
    assert.match(actions, /REAL_CHARGES_BLOCKED|isRealChargesAuthorized/);
    assert.doesNotMatch(actions, /status:\s*["']active["']/);
  });

  it("webhook usa status-guard", () => {
    const wh = read("lib/billing/asaas/webhook.ts");
    assert.match(wh, /canApplySubscriptionStatus/);
    assert.match(wh, /canApplyPaymentStatus/);
    assert.match(wh, /status_regression_blocked/);
  });

  it("PCI: sem PAN/CVV persistidos", () => {
    const actions = read("lib/billing/actions.ts");
    assert.doesNotMatch(actions, /result_summary:[\s\S]{0,300}ccv/i);
    const ui = read("components/billing/billing-actions-panel.tsx");
    assert.doesNotMatch(ui, /localStorage\.|sessionStorage\./);
  });

  it("runbook pré-produção cobre checklist humano", () => {
    const doc = read("docs/billing/PRE_PRODUCTION_RUNBOOK.md");
    assert.match(doc, /BILLING_REAL_CHARGES_ENABLED/);
    assert.match(doc, /microtransação/i);
    assert.match(doc, /kill switch/i);
    assert.match(doc, /NÃO EXECUTAR/);
    assert.match(doc, /ASAAS_ENV=sandbox/);
  });

  it("mobile não alterado", () => {
    assert.ok(!read("lib/billing/config.ts").includes("apps/mobile"));
  });
});
