#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

function restoreEnv(prev) {
  for (const k of Object.keys(process.env)) {
    if (!(k in prev)) delete process.env[k];
  }
  Object.assign(process.env, prev);
}

describe("33.10 blocker + files", () => {
  it("blocker externo registrado e não escondido", async () => {
    assert.ok(existsSync(join(root, "docs/billing/ASAAS_PRODUCTION_API_KEY_BLOCKER.md")));
    assert.ok(existsSync(join(root, "docs/billing/CUTOVER_CHECKLIST.md")));
    const mod = await import(
      pathToFileURL(join(root, "lib/billing/external-blockers.ts")).href +
        `?t=${Date.now()}`
    );
    assert.equal(mod.ASAAS_PRODUCTION_API_KEY_BLOCKER.status, "blocked_externally");
    assert.equal(mod.isAsaasProductionApiKeyBlockedExternally(), true);
    assert.ok(mod.ASAAS_PRODUCTION_API_KEY_BLOCKER.blocks.includes("cutover"));
    assert.ok(mod.ASAAS_PRODUCTION_API_KEY_BLOCKER.doesNotBlock.includes("sandbox"));
  });
});

describe("33.10 webhook token isolation", () => {
  it("sandbox rejeita token production; production rejeita token sandbox", async () => {
    const prev = { ...process.env };
    process.env.ASAAS_ENV = "sandbox";
    process.env.ASAAS_WEBHOOK_TOKEN = "sandbox-wh-token-isolation";
    process.env.ASAAS_WEBHOOK_TOKEN_PRODUCTION = "prod-wh-token-isolation";
    const mod = await import(
      pathToFileURL(join(root, "lib/billing/webhook-auth.ts")).href +
        `?t=${Date.now()}`
    );
    assert.equal(
      mod.authenticateAsaasWebhookHeader("sandbox-wh-token-isolation").ok,
      true,
    );
    assert.equal(
      mod.authenticateAsaasWebhookHeader("prod-wh-token-isolation").reason,
      "wrong_environment",
    );
    process.env.ASAAS_ENV = "production";
    assert.equal(
      mod.authenticateAsaasWebhookHeader("prod-wh-token-isolation").ok,
      true,
    );
    assert.equal(
      mod.authenticateAsaasWebhookHeader("sandbox-wh-token-isolation").reason,
      "wrong_environment",
    );
    delete process.env.ASAAS_WEBHOOK_TOKEN_PRODUCTION;
    assert.equal(
      mod.authenticateAsaasWebhookHeader("prod-wh-token-isolation").reason,
      "missing_expected_token",
    );
    restoreEnv(prev);
  });
});

describe("33.10 idempotency + state machine", () => {
  it("duplicate, out-of-order e transições reais", async () => {
    const mod = await import(
      pathToFileURL(join(root, "lib/billing/status-guard.ts")).href +
        `?t=${Date.now()}`
    );
    assert.equal(
      mod.decideWebhookApply({
        alreadyPersisted: true,
        mapped: "active",
        current: "trial",
      }),
      "duplicate",
    );
    assert.equal(mod.canApplyPaymentStatus("PENDING", "CONFIRMED"), true);
    assert.equal(mod.canApplyPaymentStatus("CONFIRMED", "RECEIVED"), true);
    assert.equal(mod.canApplyPaymentStatus("PENDING", "OVERDUE"), true);
    assert.equal(mod.canApplyPaymentStatus("CONFIRMED", "REFUNDED"), true);
    assert.equal(mod.canApplyPaymentStatus("RECEIVED", "PENDING"), false);
    assert.equal(mod.canApplyPaymentStatus("CONFIRMED", "PENDING"), false);
    assert.equal(mod.canApplySubscriptionStatus("active", "trial"), false);
    assert.equal(mod.canApplySubscriptionStatus("canceled", "active"), false);
    assert.equal(
      mod.decideWebhookApply({
        alreadyPersisted: false,
        mapped: "trial",
        current: "active",
      }),
      "regression_blocked",
    );
    assert.equal(
      mod.decideWebhookApply({
        alreadyPersisted: false,
        mapped: "active",
        current: "trial",
      }),
      "apply",
    );
  });
});

describe("33.10 observability + health + catalog", () => {
  it("eventos canônicos e logger redige secrets", () => {
    const obs = read("lib/billing/observability.ts");
    for (const ev of [
      "checkout_requested",
      "checkout_created",
      "provider_customer_created",
      "provider_subscription_created",
      "provider_payment_created",
      "webhook_received",
      "webhook_authenticated",
      "webhook_rejected",
      "webhook_duplicate",
      "billing_state_changed",
      "provider_error",
      "billing_guard_blocked",
      "kill_switch_triggered",
    ]) {
      assert.match(obs, new RegExp(ev));
    }
    const log = read("lib/observability/logger.ts");
    assert.match(log, /pan\|cvv\|ccv/);
    const client = read("lib/billing/asaas/client.ts");
    assert.match(client, /x-request-id/);
  });

  it("operational status sem valores de secret; production não usa 1990", async () => {
    const prev = { ...process.env };
    process.env.ASAAS_ENV = "sandbox";
    delete process.env.BILLING_REAL_CHARGES_ENABLED;
    const ops = await import(
      pathToFileURL(join(root, "lib/billing/operational-status.ts")).href +
        `?t=${Date.now()}`
    );
    const status = ops.getBillingOperationalStatus();
    assert.equal(status.sandbox, true);
    assert.equal(status.realChargesEnabled, false);
    assert.equal(status.productionChargeAllowed, false);
    assert.equal(status.productionApiKeyBlockedExternally, true);
    assert.equal(typeof status.productionApiKeyPresent, "boolean");
    const amount = await import(
      pathToFileURL(join(root, "lib/billing/checkout-amount.ts")).href +
        `?t=${Date.now()}`
    );
    process.env.ASAAS_ENV = "production";
    const pilot = amount.resolveCheckoutAmount({
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
    assert.equal(pilot.ok, false);
    const catalog = await import(
      pathToFileURL(join(root, "lib/billing/catalog.ts")).href +
        `?t=${Date.now()}`
    );
    assert.notEqual(catalog.resolveTrustedAmountCents("essential"), 1990);
    assert.equal(catalog.resolveTrustedAmountCents("essential"), 27990);
    restoreEnv(prev);
  });
});

describe("33.10 contracts + security scan", () => {
  it("docs cutover/blocker/suporte; RBAC; sem secrets no git tracked", () => {
    const cut = read("docs/billing/CUTOVER_CHECKLIST.md");
    assert.match(cut, /NÃO EXECUTAR/);
    assert.match(cut, /BILLING_ASAAS_CHECKOUT_ENABLED=0/);
    assert.match(cut, /27990/);
    const blocker = read("docs/billing/ASAAS_PRODUCTION_API_KEY_BLOCKER.md");
    assert.match(blocker, /BLOCKED EXTERNALLY/);
    assert.match(blocker, /Não usar chave sandbox/);
    const support = read("docs/billing/SUPPORT_RUNBOOK.md");
    assert.match(support, /ASAAS_PRODUCTION_API_KEY_BLOCKER/);
    const auth = read("lib/billing/auth.ts");
    assert.match(auth, /canManageBilling/);
    assert.match(auth, /owner/);
    assert.match(auth, /SESSION_MISSING/);
    const actions = read("lib/billing/actions.ts");
    assert.match(actions, /PERMISSION_DENIED/);
    assert.match(actions, /requireBillingPageAuth/);
    const tracked = execFileSync(
      "git",
      ["ls-files", ".env", ".env.local", ".env.production"],
      { cwd: root, encoding: "utf8" },
    ).trim();
    assert.equal(tracked, "");
    const cfg = read("lib/billing/config.ts");
    assert.doesNotMatch(cfg, /NEXT_PUBLIC_ASAAS/);
    assert.doesNotMatch(read(".env.example"), /\$aact_/);
  });
});
