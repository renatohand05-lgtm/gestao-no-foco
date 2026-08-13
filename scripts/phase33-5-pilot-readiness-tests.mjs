#!/usr/bin/env node
/**
 * Sprint 33.5 — prontidão piloto (contratos + inventário + status UI).
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

describe("33.5 inventory files", () => {
  for (const p of [
    "lib/billing/config.ts",
    "lib/billing/actions.ts",
    "lib/billing/auth.ts",
    "lib/billing/repository.ts",
    "lib/billing/entitlements.ts",
    "lib/billing/asaas/webhook.ts",
    "lib/billing/asaas/status-map.ts",
    "lib/billing/asaas/tokenize.ts",
    "lib/billing/payment-hint.ts",
    "lib/billing/enrich-payment-hint.ts",
    "app/api/billing/webhook/route.ts",
    "docs/billing/SUPPORT_RUNBOOK.md",
    "docs/billing/PRODUCTION_ACTIVATION_RUNBOOK.md",
    "docs/billing/PILOT_BILLING_RUNBOOK.md",
  ]) {
    it(`exists ${p}`, () => assert.ok(existsSync(join(root, p))));
  }
});

describe("33.5 status UI + mapping", () => {
  it("status vazio não fabrica confirmado", async () => {
    const mod = await import(
      pathToFileURL(join(root, "lib/billing/payment-hint.ts")).href +
        `?t=${Date.now()}`
    );
    assert.match(
      mod.formatProviderPaymentStatus(null),
      /Aguardando confirmação do provedor/,
    );
    assert.match(
      mod.formatProviderPaymentStatus("PENDING"),
      /Pendente \(PENDING\)/,
    );
    assert.match(
      mod.formatProviderPaymentStatus("RECEIVED"),
      /Recebido \(RECEIVED\)/,
    );
  });

  it("máquina de estados não promove unknown → active", async () => {
    const mod = await import(
      pathToFileURL(join(root, "lib/billing/asaas/status-map.ts")).href +
        `?t=${Date.now()}`
    );
    assert.equal(
      mod.mapAsaasEventToInternalStatus({ event: "PAYMENT_RECEIVED" }),
      "active",
    );
    assert.equal(
      mod.mapAsaasEventToInternalStatus({ event: "PAYMENT_CONFIRMED" }),
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
      mod.mapAsaasEventToInternalStatus({ event: "PAYMENT_CREATED" }),
      "ignore",
    );
    assert.equal(
      mod.mapAsaasEventToInternalStatus({ event: "SUBSCRIPTION_CREATED" }),
      "ignore",
    );
    assert.equal(
      mod.mapAsaasEventToInternalStatus({ event: "WEIRD_EVENT" }),
      "unknown",
    );
  });
});

describe("33.5 webhook + security contracts", () => {
  it("webhook auth + mismatch + sync status checkout", () => {
    const route = read("app/api/billing/webhook/route.ts");
    assert.match(route, /asaas-access-token/);
    assert.match(route, /INVALID_SIGNATURE/);
    const wh = read("lib/billing/asaas/webhook.ts");
    assert.match(wh, /23505/);
    assert.match(wh, /SUBSCRIPTION_MISMATCH/);
    assert.match(wh, /CUSTOMER_MISMATCH/);
    assert.match(wh, /syncLatestCheckoutPaymentStatus/);
    assert.match(wh, /billing\.webhook\.duplicate/);
  });

  it("checkout não marca active; kill switch; enforcement off default", () => {
    const actions = read("lib/billing/actions.ts");
    assert.doesNotMatch(actions, /status:\s*["']active["']/);
    assert.match(actions, /BILLING_ASAAS_CHECKOUT_ENABLED/);
    const cfg = read("lib/billing/config.ts");
    assert.match(cfg, /BILLING_ENFORCEMENT === ["']1["']/);
    assert.match(cfg, /isAsaasCheckoutEnabled/);
    const ent = read("lib/billing/entitlements.ts");
    assert.match(ent, /isBillingEnforcementEnabled/);
  });

  it("RBAC server-side OWNER manage", () => {
    const auth = read("lib/billing/auth.ts");
    assert.match(auth, /canManageBilling/);
    assert.match(auth, /role === ["']owner["']/);
    assert.match(auth, /PERMISSION_DENIED/);
    const actions = read("lib/billing/actions.ts");
    assert.match(actions, /auth\.canManage/);
  });

  it("cartão sem PAN/CVV persistidos ou em storage", () => {
    const actions = read("lib/billing/actions.ts");
    assert.match(actions, /tokenizeAsaasCreditCard/);
    assert.match(actions, /cardMeta/);
    assert.doesNotMatch(actions, /result_summary:[\s\S]{0,300}ccv/i);
    const ui = read("components/billing/billing-actions-panel.tsx");
    assert.doesNotMatch(ui, /localStorage\.|sessionStorage\./);
    const tok = read("lib/billing/asaas/tokenize.ts");
    assert.doesNotMatch(
      tok,
      /logger\.(info|warn|error|exception)\([\s\S]{0,80}ccv/i,
    );
  });

  it("production activation runbook não executa e documenta rollback", () => {
    const act = read("docs/billing/PRODUCTION_ACTIVATION_RUNBOOK.md");
    assert.match(act, /NÃO EXECUTAR/);
    assert.match(act, /ASAAS_ALLOW_PRODUCTION/);
    assert.match(act, /Rollback/);
    assert.match(act, /BILLING_ASAAS_CHECKOUT_ENABLED=0/);
    const support = read("docs/billing/SUPPORT_RUNBOOK.md");
    assert.match(support, /## A\. Checkout não abriu/);
    assert.match(support, /## F\. Webhook falhou/);
    assert.match(support, /## J\. Tenant incorreto/);
    const pilot = read("docs/billing/PILOT_BILLING_RUNBOOK.md");
    assert.match(pilot, /Kill switch/);
    assert.match(pilot, /Enforcement/);
  });

  it("mobile não alterado", () => {
    assert.ok(!read("lib/billing/actions.ts").includes("apps/mobile"));
  });
});

describe("33.5 asaas failure handling contracts", () => {
  it("client sanitiza erros de cartão e não loga body", () => {
    const client = read("lib/billing/asaas/client.ts");
    assert.match(client, /Nunca logar body bruto/);
    assert.match(client, /safeDesc/);
    assert.match(client, /Falha no processamento do cartão/);
  });

  it("production URL bloqueada sem allow", async () => {
    const prev = {
      ASAAS_ENV: process.env.ASAAS_ENV,
      ASAAS_ALLOW_PRODUCTION: process.env.ASAAS_ALLOW_PRODUCTION,
      ASAAS_API_BASE_URL: process.env.ASAAS_API_BASE_URL,
    };
    process.env.ASAAS_ENV = "production";
    delete process.env.ASAAS_ALLOW_PRODUCTION;
    delete process.env.ASAAS_API_BASE_URL;
    const mod = await import(
      pathToFileURL(join(root, "lib/billing/config.ts")).href +
        `?t=${Date.now()}`
    );
    assert.throws(() => mod.getAsaasApiBaseUrl());
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });
});
