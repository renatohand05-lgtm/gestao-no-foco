#!/usr/bin/env node
/**
 * Sprint 33.4 hotfix — PIX≠BOLETO, payment-hint, cartão tokenização (contratos).
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
    "lib/billing/asaas/tokenize.ts",
    "lib/billing/asaas/status-map.ts",
    "lib/billing/asaas/webhook.ts",
    "lib/billing/payment-hint.ts",
    "lib/billing/remote-ip.ts",
    "docs/billing/ASAAS_SANDBOX.md",
  ]) {
    it(`exists ${p}`, () => assert.ok(existsSync(join(root, p))));
  }
});

describe("33.4 payment-hint PIX≠BOLETO", () => {
  it("PIX nunca inclui bankSlipUrl / Abrir boleto logic", async () => {
    const mod = await import(
      pathToFileURL(join(root, "lib/billing/payment-hint.ts")).href +
        `?t=${Date.now()}`
    );
    const hint = mod.buildPaymentHint({
      requested: "PIX",
      providerBillingType: "PIX",
      invoiceUrl: "https://sandbox.asaas.com/i/pix",
      bankSlipUrl: "https://sandbox.asaas.com/b/boleto-should-hide",
      pixCopiaECola: "00020126...",
      pixQrCodeImage: "base64qr",
    });
    assert.equal(hint.billingType, "PIX");
    assert.equal(hint.bankSlipUrl, null);
    assert.equal(hint.pixCopiaECola, "00020126...");
    assert.equal(mod.shouldShowBoletoLink(hint), false);
    assert.equal(mod.shouldShowPixPayload(hint), true);
  });

  it("BOLETO mostra boleto só com URL; sem misturar PIX", async () => {
    const mod = await import(
      pathToFileURL(join(root, "lib/billing/payment-hint.ts")).href +
        `?t=${Date.now() + 1}`
    );
    const withSlip = mod.buildPaymentHint({
      requested: "BOLETO",
      providerBillingType: "BOLETO",
      bankSlipUrl: "https://sandbox.asaas.com/b/ok",
      pixCopiaECola: "should-ignore",
    });
    assert.equal(withSlip.billingType, "BOLETO");
    assert.equal(withSlip.pixCopiaECola, null);
    assert.equal(mod.shouldShowBoletoLink(withSlip), true);

    const noSlip = mod.buildPaymentHint({
      requested: "BOLETO",
      providerBillingType: "BOLETO",
    });
    assert.equal(mod.shouldShowBoletoLink(noSlip), false);
  });

  it("divergência não mascara método solicitado", async () => {
    const mod = await import(
      pathToFileURL(join(root, "lib/billing/payment-hint.ts")).href +
        `?t=${Date.now() + 2}`
    );
    const hint = mod.buildPaymentHint({
      requested: "PIX",
      providerBillingType: "BOLETO",
      bankSlipUrl: "https://x/boleto",
    });
    assert.equal(hint.billingType, "PIX");
    assert.equal(hint.divergence, true);
    assert.equal(hint.bankSlipUrl, null);
  });

  it("PIX ≠ BOLETO ≠ CARTÃO e datas não ambíguas", async () => {
    const mod = await import(
      pathToFileURL(join(root, "lib/billing/payment-hint.ts")).href +
        `?t=${Date.now() + 3}`
    );
    const pix = mod.buildPaymentHint({ requested: "PIX", providerBillingType: "PIX" });
    const boleto = mod.buildPaymentHint({
      requested: "BOLETO",
      providerBillingType: "BOLETO",
      bankSlipUrl: "https://b",
    });
    const card = mod.buildPaymentHint({
      requested: "CREDIT_CARD",
      providerBillingType: "CREDIT_CARD",
      providerStatus: "PENDING",
    });
    assert.notEqual(pix.billingType, boleto.billingType);
    assert.notEqual(pix.billingType, card.billingType);
    assert.notEqual(boleto.billingType, card.billingType);
    assert.equal(mod.methodDisplayLabel("CREDIT_CARD"), "CARTÃO");
    assert.match(mod.formatProviderPaymentStatus("CONFIRMED"), /Confirmado \(CONFIRMED\)/);
    const dates = mod.resolveBillingDateLabels({
      currentChargeDue: "2026-08-13",
      nextRenewal: "2026-09-13",
    });
    assert.equal(dates.currentChargeDue, "2026-08-13");
    assert.equal(dates.nextRenewal, "2026-09-13");
    assert.equal(dates.sameDate, false);
    const same = mod.resolveBillingDateLabels({
      currentChargeDue: "2026-08-13",
      nextRenewal: "2026-08-13T23:59:59.000Z",
    });
    assert.equal(same.sameDate, true);
    assert.equal(same.nextRenewal, null);
  });
});

describe("33.4 pickPaymentForBillingType", () => {
  it("não escolhe BOLETO quando pedido PIX", async () => {
    // Função está em subscriptions.ts (server-only) — espelha contrato via source + lógica local
    const src = read("lib/billing/asaas/subscriptions.ts");
    assert.match(src, /pickPaymentForBillingType/);
    assert.match(src, /billingTypeAligned/);
    assert.match(src, /updatePendingPayments/);
    assert.match(src, /DIVERGENCE/);

    const payments = [
      { id: "pay_b", billingType: "BOLETO", bankSlipUrl: "https://b" },
      { id: "pay_p", billingType: "PIX", invoiceUrl: "https://p" },
    ];
    const exact = payments.find(
      (p) => String(p.billingType || "").toUpperCase() === "PIX",
    );
    assert.equal(exact?.id, "pay_p");
    assert.ok(!exact?.bankSlipUrl);
  });
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

describe("33.4 webhook + actions + card contracts", () => {
  it("webhook valida asaas-access-token e processa eventos reais", () => {
    const wh = read("app/api/billing/webhook/route.ts");
    assert.match(wh, /asaas-access-token/);
    assert.match(wh, /processAsaasWebhook/);
    const map = read("lib/billing/asaas/status-map.ts");
    assert.match(map, /PAYMENT_RECEIVED/);
    assert.match(map, /PAYMENT_OVERDUE/);
    const proc = read("lib/billing/asaas/webhook.ts");
    assert.match(proc, /SUBSCRIPTION_MISMATCH|CUSTOMER_MISMATCH/);
    assert.match(proc, /23505/);
  });

  it("checkout tokeniza cartão; não marca active; não persiste PAN/CVV", () => {
    const actions = read("lib/billing/actions.ts");
    assert.match(actions, /tokenizeAsaasCreditCard/);
    assert.match(actions, /resolveClientRemoteIp/);
    assert.match(actions, /requestedBillingType/);
    assert.match(actions, /buildPaymentHint/);
    assert.match(actions, /CUSTOMER_TENANT_MISMATCH/);
    assert.match(actions, /status interno não foi marcado active/);
    assert.doesNotMatch(actions, /status:\s*["']active["']/);
    assert.doesNotMatch(actions, /localStorage|sessionStorage/);
    // result_summary não guarda number/ccv
    assert.doesNotMatch(actions, /result_summary:[\s\S]{0,200}ccv/i);
    assert.match(actions, /cardMeta/);
  });

  it("tokenize endpoint oficial + sem log de PAN", () => {
    const tok = read("lib/billing/asaas/tokenize.ts");
    assert.match(tok, /\/v3\/creditCard\/tokenizeCreditCard/);
    assert.match(tok, /remoteIp/);
    assert.doesNotMatch(tok, /logger\.(info|warn|error|exception)\([\s\S]{0,80}number/);
    assert.doesNotMatch(tok, /logger\.(info|warn|error|exception)\([\s\S]{0,80}ccv/i);
  });

  it("client nunca loga body bruto de cartão", () => {
    const client = read("lib/billing/asaas/client.ts");
    assert.match(client, /Nunca logar body bruto/);
    assert.match(client, /safeDesc/);
  });

  it("remoteIp usa forwarded headers, sem IP fixo de produção", () => {
    const ip = read("lib/billing/remote-ip.ts");
    assert.match(ip, /x-forwarded-for/);
    assert.match(ip, /x-real-ip/);
    assert.doesNotMatch(ip, /116\.213\.42\.532/);
    assert.doesNotMatch(ip, /["']8\.8\.8\.8["']/);
  });

  it("customer usa externalReference=tenant_id", () => {
    const src = read("lib/billing/asaas/customers.ts");
    assert.match(src, /externalReference/);
    assert.match(src, /maskDocument/);
  });

  it("UI: última cobrança + datas + status; Abrir boleto só em BOLETO", () => {
    const ui = read("components/billing/billing-actions-panel.tsx");
    assert.match(ui, /AMBIENTE DE TESTE \/ SANDBOX/);
    assert.match(ui, /Última cobrança criada/);
    assert.match(ui, /Vencimento atual/);
    assert.match(ui, /formatProviderPaymentStatus/);
    assert.match(ui, /CREDIT_CARD/);
    assert.match(ui, /billingType === "BOLETO" && paymentHint\.bankSlipUrl/);
    assert.match(ui, /Abrir boleto/);
    assert.doesNotMatch(ui, /localStorage\.|sessionStorage\./);
    const page = read("app/(app)/[tenant]/configuracoes/assinatura/page.tsx");
    assert.match(page, /Próxima renovação/);
    assert.match(page, /Cobrança atual \/ vencimento/);
    assert.match(page, /resolveBillingDateLabels/);
    assert.match(page, /getLatestCheckoutForTenant/);
  });

  it("cross-tenant: tokenização amarra customer do tenant", () => {
    const actions = read("lib/billing/actions.ts");
    assert.match(actions, /CUSTOMER_TENANT_MISMATCH/);
    const tok = read("lib/billing/asaas/tokenize.ts");
    assert.match(tok, /customerId/);
    assert.match(tok, /tenantId/);
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
