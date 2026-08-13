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

function restoreEnv(prev) {
  for (const k of Object.keys(process.env)) {
    if (!(k in prev)) delete process.env[k];
  }
  Object.assign(process.env, prev);
}

describe("33.9 files", () => {
  it("runbook de provisionamento existe", () => {
    assert.ok(
      existsSync(join(root, "docs/billing/ASAAS_PRODUCTION_PROVISIONING.md")),
    );
  });
});

describe("33.9 dual-gate fail-closed", () => {
  it("ASAAS_ENV=production sozinho não cobra; REAL_CHARGES sozinho não vai a production", async () => {
    const prev = { ...process.env };
    process.env.BILLING_PROVIDER = "asaas";
    process.env.ASAAS_API_KEY = "sandbox-key";
    process.env.ASAAS_WEBHOOK_TOKEN = "sandbox-wh";
    process.env.BILLING_ASAAS_CHECKOUT_ENABLED = "1";
    delete process.env.ASAAS_ALLOW_PRODUCTION;
    delete process.env.BILLING_REAL_CHARGES_ENABLED;
    delete process.env.ASAAS_API_BASE_URL;
    delete process.env.ASAAS_API_KEY_PRODUCTION;
    delete process.env.ASAAS_WEBHOOK_TOKEN_PRODUCTION;

    const mod = await loadConfig();

    process.env.ASAAS_ENV = "production";
    assert.equal(mod.isRealProductionChargeAllowed(), false);
    assert.equal(mod.isAsaasCheckoutEnabled(), false);
    assert.equal(mod.getAsaasApiKey(), null);
    assert.equal(mod.isAsaasConfigured(), false);

    process.env.ASAAS_ENV = "sandbox";
    process.env.BILLING_REAL_CHARGES_ENABLED = "1";
    process.env.ASAAS_ALLOW_PRODUCTION = "1";
    assert.equal(mod.getAsaasApiBaseUrl(), "https://api-sandbox.asaas.com");
    assert.equal(mod.isRealProductionChargeAllowed(), false);
    assert.equal(mod.isAsaasCheckoutEnabled(), true);
    assert.equal(mod.getAsaasApiKey(), "sandbox-key");

    restoreEnv(prev);
  });

  it("slots production não sobrescrevem sandbox; credencial ausente fail-closed", async () => {
    const prev = { ...process.env };
    process.env.BILLING_PROVIDER = "asaas";
    process.env.ASAAS_ENV = "sandbox";
    process.env.ASAAS_API_KEY = "sandbox-key";
    process.env.ASAAS_WEBHOOK_TOKEN = "sandbox-wh";
    process.env.ASAAS_API_KEY_PRODUCTION = "prod-key-distinct";
    process.env.ASAAS_WEBHOOK_TOKEN_PRODUCTION = "prod-wh-distinct";
    process.env.BILLING_ASAAS_CHECKOUT_ENABLED = "1";
    delete process.env.BILLING_REAL_CHARGES_ENABLED;
    delete process.env.ASAAS_ALLOW_PRODUCTION;
    delete process.env.ASAAS_API_BASE_URL;

    const mod = await loadConfig();
    assert.equal(mod.getAsaasApiKey(), "sandbox-key");
    assert.equal(mod.getAsaasWebhookToken(), "sandbox-wh");
    assert.equal(mod.hasProductionCredentialSlots().apiKey, true);
    assert.equal(mod.hasProductionCredentialSlots().webhookToken, true);
    assert.equal(mod.isRealProductionChargeAllowed(), false);

    process.env.ASAAS_ENV = "production";
    delete process.env.ASAAS_API_KEY_PRODUCTION;
    assert.equal(mod.getAsaasApiKey(), null);
    assert.equal(mod.isAsaasConfigured(), false);
    assert.equal(mod.isRealProductionChargeAllowed(), false);

    restoreEnv(prev);
  });

  it("combinação completa é necessária para cobrança real", async () => {
    const prev = { ...process.env };
    process.env.BILLING_PROVIDER = "asaas";
    process.env.ASAAS_ENV = "production";
    process.env.ASAAS_API_KEY = "sandbox-key";
    process.env.ASAAS_WEBHOOK_TOKEN = "sandbox-wh";
    process.env.ASAAS_API_KEY_PRODUCTION = "prod-key-distinct";
    process.env.ASAAS_WEBHOOK_TOKEN_PRODUCTION = "prod-wh-distinct";
    process.env.BILLING_ASAAS_CHECKOUT_ENABLED = "1";
    process.env.ASAAS_ALLOW_PRODUCTION = "1";
    delete process.env.BILLING_REAL_CHARGES_ENABLED;
    delete process.env.ASAAS_API_BASE_URL;

    const mod = await loadConfig();
    assert.equal(mod.isRealProductionChargeAllowed(), false, "sem REAL_CHARGES");

    process.env.BILLING_REAL_CHARGES_ENABLED = "1";
    delete process.env.ASAAS_ALLOW_PRODUCTION;
    assert.equal(mod.isRealProductionChargeAllowed(), false, "sem ALLOW");

    process.env.ASAAS_ALLOW_PRODUCTION = "1";
    process.env.BILLING_ASAAS_CHECKOUT_ENABLED = "0";
    assert.equal(mod.isRealProductionChargeAllowed(), false, "kill switch");

    process.env.BILLING_ASAAS_CHECKOUT_ENABLED = "1";
    assert.equal(mod.isRealProductionChargeAllowed(), true);
    assert.equal(mod.getAsaasApiBaseUrl(), "https://api.asaas.com");

    restoreEnv(prev);
  });
});

describe("33.9 contracts", () => {
  it("actions usam combinação de gates; webhook timing-safe; catálogo comercial", () => {
    const actions = read("lib/billing/actions.ts");
    assert.match(actions, /isRealProductionChargeAllowed/);
    assert.match(actions, /REAL_CHARGES_BLOCKED/);
    const route = read("app/api/billing/webhook/route.ts");
    assert.match(route, /timingSafeEqual/);
    assert.match(route, /asaas-access-token/);
    const cfg = read("lib/billing/config.ts");
    assert.match(cfg, /ASAAS_API_KEY_PRODUCTION/);
    assert.doesNotMatch(cfg, /NEXT_PUBLIC_ASAAS/);
    const catalog = read("lib/billing/catalog.ts");
    assert.match(catalog, /27990/);
    assert.match(catalog, /47990/);
    assert.match(catalog, /74990/);
    assert.match(catalog, /349990/);
    assert.match(catalog, /SANDBOX_HOMOLOGATION_AMOUNT_CENTS = 1990/);
  });

  it("runbook: procedimentos, rollback, sem secrets, 19,90 só sandbox", () => {
    const doc = read("docs/billing/ASAAS_PRODUCTION_PROVISIONING.md");
    assert.match(doc, /Integrações/);
    assert.match(doc, /Chaves de API/);
    assert.match(doc, /Criar Webhook/);
    assert.match(doc, /ASAAS_API_KEY_PRODUCTION/);
    assert.match(doc, /não alterar/i);
    assert.match(doc, /BILLING_REAL_CHARGES_ENABLED/);
    assert.match(doc, /kill switch/i);
    assert.match(doc, /27990/);
    assert.match(doc, /19,90/);
    assert.match(doc, /sandbox\.asaas\.com/);
    assert.doesNotMatch(doc, /\$aact_prod_[A-Za-z0-9]/);
    assert.doesNotMatch(doc, /whsec_/);
    assert.ok(!doc.includes("apps/mobile"));
  });

  it("audit atual: cobrança real NO-GO", async () => {
    const prev = { ...process.env };
    process.env.ASAAS_ENV = "sandbox";
    delete process.env.BILLING_REAL_CHARGES_ENABLED;
    delete process.env.ASAAS_ALLOW_PRODUCTION;
    const mod = await import(
      pathToFileURL(join(root, "lib/billing/production-readiness.ts")).href +
        `?t=${Date.now()}`
    );
    const audit = mod.auditProductionReadiness();
    assert.equal(audit.sandboxMode, true);
    assert.equal(audit.productionChargeAllowed, false);
    assert.equal(audit.readyForRealMicrotransaction, false);
    restoreEnv(prev);
  });
});
