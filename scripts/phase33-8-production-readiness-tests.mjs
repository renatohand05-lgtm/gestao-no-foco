#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

function loadConfig() {
  return import(
    pathToFileURL(join(root, "lib/billing/config.ts")).href + `?t=${Date.now()}`
  );
}

describe("33.8 files", () => {
  it("runbook e módulo de readiness existem", () => {
    assert.ok(existsSync(join(root, "docs/billing/ASAAS_PRODUCTION_READINESS.md")));
    assert.ok(existsSync(join(root, "lib/billing/production-readiness.ts")));
  });
});

describe("33.8 fail-closed real charges", () => {
  it("ausente/false/0/true/yes não autorizam cobrança real", async () => {
    const prev = { ...process.env };
    delete process.env.BILLING_REAL_CHARGES_ENABLED;
    const mod = await loadConfig();
    assert.equal(mod.isRealChargesAuthorized(), false);
    for (const v of ["false", "0", "true", "yes", "on", "TRUE", ""]) {
      process.env.BILLING_REAL_CHARGES_ENABLED = v;
      assert.equal(mod.isRealChargesAuthorized(), false, v);
    }
    process.env.BILLING_REAL_CHARGES_ENABLED = "1";
    assert.equal(mod.isRealChargesAuthorized(), true);
    process.env.BILLING_PROVIDER = "asaas";
    process.env.ASAAS_ENV = "sandbox";
    process.env.ASAAS_API_KEY = "sandbox-key";
    process.env.ASAAS_WEBHOOK_TOKEN = "sandbox-wh";
    process.env.BILLING_ASAAS_CHECKOUT_ENABLED = "0";
    assert.equal(mod.isAsaasCheckoutEnabled(), false, "kill switch");
    for (const k of Object.keys(process.env)) {
      if (!(k in prev)) delete process.env[k];
    }
    Object.assign(process.env, prev);
  });
});

describe("33.8 key/token isolation", () => {
  it("production não reutiliza key/token sandbox; iguais são rejeitados", async () => {
    const prev = { ...process.env };
    process.env.BILLING_PROVIDER = "asaas";
    process.env.ASAAS_ENV = "sandbox";
    process.env.ASAAS_API_KEY = "sandbox-key";
    process.env.ASAAS_WEBHOOK_TOKEN = "sandbox-wh";
    process.env.BILLING_ASAAS_CHECKOUT_ENABLED = "1";
    delete process.env.ASAAS_API_KEY_PRODUCTION;
    delete process.env.ASAAS_WEBHOOK_TOKEN_PRODUCTION;
    delete process.env.ASAAS_ALLOW_PRODUCTION;
    delete process.env.BILLING_REAL_CHARGES_ENABLED;
    delete process.env.ASAAS_API_BASE_URL;

    const mod = await loadConfig();
    assert.equal(mod.getAsaasApiKey(), "sandbox-key");
    assert.equal(mod.getAsaasWebhookToken(), "sandbox-wh");
    assert.equal(mod.isAsaasCheckoutEnabled(), true);

    process.env.ASAAS_ENV = "production";
    assert.equal(mod.getAsaasApiKey(), null);
    assert.equal(mod.getAsaasWebhookToken(), null);
    assert.equal(mod.isAsaasConfigured(), false);
    assert.equal(mod.isAsaasCheckoutEnabled(), false);

    process.env.ASAAS_API_KEY_PRODUCTION = "sandbox-key";
    process.env.ASAAS_WEBHOOK_TOKEN_PRODUCTION = "prod-wh-distinct";
    assert.throws(() => mod.assertAsaasKeyIsolation());
    assert.equal(mod.isAsaasCheckoutEnabled(), false);

    process.env.ASAAS_API_KEY_PRODUCTION = "prod-key-distinct";
    process.env.ASAAS_WEBHOOK_TOKEN_PRODUCTION = "sandbox-wh";
    assert.throws(() => mod.assertAsaasKeyIsolation());

    process.env.ASAAS_WEBHOOK_TOKEN_PRODUCTION = "prod-wh-distinct";
    mod.assertAsaasKeyIsolation();
    process.env.ASAAS_ALLOW_PRODUCTION = "1";
    process.env.BILLING_REAL_CHARGES_ENABLED = "1";
    assert.equal(mod.isAsaasCheckoutEnabled(), true);
    assert.equal(mod.getAsaasApiKey(), "prod-key-distinct");
    assert.equal(mod.getAsaasWebhookToken(), "prod-wh-distinct");

    for (const k of Object.keys(process.env)) {
      if (!(k in prev)) delete process.env[k];
    }
    Object.assign(process.env, prev);
  });
});

describe("33.8 readiness audit", () => {
  it("estado atual: microtransação real NO-GO", async () => {
    const prev = { ...process.env };
    process.env.ASAAS_ENV = "sandbox";
    delete process.env.ASAAS_ALLOW_PRODUCTION;
    delete process.env.BILLING_REAL_CHARGES_ENABLED;
    delete process.env.BILLING_ENFORCEMENT;
    const mod = await import(
      pathToFileURL(join(root, "lib/billing/production-readiness.ts")).href +
        `?t=${Date.now()}`
    );
    const audit = mod.auditProductionReadiness();
    assert.equal(audit.sandboxMode, true);
    assert.equal(audit.realChargesAuthorized, false);
    assert.equal(audit.readyForRealMicrotransaction, false);
    assert.equal(audit.enforcementEnabled, false);
    for (const k of Object.keys(process.env)) {
      if (!(k in prev)) delete process.env[k];
    }
    Object.assign(process.env, prev);
  });
});

describe("33.8 status + PCI + isolation contracts", () => {
  it("PENDING não promove active; CONFIRMED/RECEIVED/OVERDUE/REFUNDED mapeados", async () => {
    const map = await import(
      pathToFileURL(join(root, "lib/billing/asaas/status-map.ts")).href +
        `?t=${Date.now()}`
    );
    const guard = await import(
      pathToFileURL(join(root, "lib/billing/status-guard.ts")).href +
        `?t=${Date.now()}`
    );
    assert.equal(map.mapAsaasEventToInternalStatus({ event: "PAYMENT_UPDATED" }), "ignore");
    assert.equal(
      map.mapAsaasEventToInternalStatus({ event: "PAYMENT_AWAITING_RISK_ANALYSIS" }),
      "ignore",
    );
    assert.equal(map.mapAsaasEventToInternalStatus({ event: "PAYMENT_CONFIRMED" }), "active");
    assert.equal(map.mapAsaasEventToInternalStatus({ event: "PAYMENT_RECEIVED" }), "active");
    assert.equal(map.mapAsaasEventToInternalStatus({ event: "PAYMENT_OVERDUE" }), "past_due");
    assert.equal(map.mapAsaasEventToInternalStatus({ event: "PAYMENT_REFUNDED" }), "canceled");
    assert.equal(map.mapAsaasEventToInternalStatus({ event: "PAYMENT_CHARGEBACK_REQUESTED" }), "unknown");
    assert.equal(guard.canApplyPaymentStatus("RECEIVED", "PENDING"), false);
    assert.equal(guard.canApplyPaymentStatus("PENDING", "OVERDUE"), true);
  });

  it("pilot bloqueado em production; catálogo não usa 19,90", async () => {
    const prev = process.env.ASAAS_ENV;
    process.env.ASAAS_ENV = "production";
    const amount = await import(
      pathToFileURL(join(root, "lib/billing/checkout-amount.ts")).href +
        `?t=${Date.now()}`
    );
    const catalog = await import(
      pathToFileURL(join(root, "lib/billing/catalog.ts")).href +
        `?t=${Date.now()}`
    );
    const result = amount.resolveCheckoutAmount({
      id: "1",
      slug: "pilot",
      name: "Piloto",
      status: "active",
      amountCents: 1990,
      currency: "BRL",
      billingInterval: "month",
      entitlements: {},
      isPilot: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PILOT_NOT_IN_PRODUCTION");
    assert.equal(catalog.SANDBOX_HOMOLOGATION_AMOUNT_CENTS, 1990);
    assert.equal(catalog.resolveTrustedAmountCents("essential"), 27990);
    if (prev === undefined) delete process.env.ASAAS_ENV;
    else process.env.ASAAS_ENV = prev;
  });

  it("PCI, webhook token, tenant_id, kill switch, sem secrets nos docs", () => {
    const tokenize = read("lib/billing/asaas/tokenize.ts");
    assert.match(tokenize, /Nunca loga número\/CVV/);
    const actions = read("lib/billing/actions.ts");
    assert.match(actions, /Nunca persiste PAN\/CVV/);
    assert.match(actions, /REAL_CHARGES_BLOCKED/);
    assert.doesNotMatch(actions, /status:\s*["']active["']/);
    const route = read("app/api/billing/webhook/route.ts");
    assert.match(route, /timingSafeEqual/);
    assert.match(route, /asaas-access-token/);
    const repo = read("lib/billing/repository.ts");
    assert.match(repo, /\.eq\("tenant_id"/);
    const cfg = read("lib/billing/config.ts");
    assert.match(cfg, /BILLING_ASAAS_CHECKOUT_ENABLED !== ["']1["']/);
    assert.match(cfg, /ASAAS_API_KEY_PRODUCTION/);
    assert.match(cfg, /ASAAS_WEBHOOK_TOKEN_PRODUCTION/);
    assert.doesNotMatch(cfg, /NEXT_PUBLIC_ASAAS/);
    const doc = read("docs/billing/ASAAS_PRODUCTION_READINESS.md");
    assert.match(doc, /NÃO EXECUTAR/);
    assert.match(doc, /279,90/);
    assert.match(doc, /19,90/);
    assert.match(doc, /kill switch/i);
    assert.doesNotMatch(doc, /\$aact_/);
    assert.doesNotMatch(doc, /access_token["']\s*:/);
    assert.ok(!read("lib/billing/config.ts").includes("apps/mobile"));
  });
});
