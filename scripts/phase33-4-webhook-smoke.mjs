#!/usr/bin/env node
/**
 * Smoke HTTP do webhook billing em production (sandbox Asaas).
 * NÃO envia eventos autenticados reais (sem secret no CI).
 * Valida: GET health + rejeição sem/com token inválido.
 */
import assert from "node:assert/strict";

const base =
  process.env.BILLING_WEBHOOK_SMOKE_URL ||
  "https://gestao-no-foco.vercel.app/api/billing/webhook";

async function main() {
  const get = await fetch(base, { method: "GET" });
  assert.equal(get.status, 200, `GET status ${get.status}`);
  const health = await get.json();
  assert.equal(health.ok, true);
  assert.equal(health.service, "billing-webhook");
  console.log("PASS GET", {
    provider: health.provider,
    asaasConfigured: health.asaasConfigured,
    sandbox: health.sandbox,
  });

  const noAuth = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: `evt_smoke_${Date.now()}`,
      event: "PAYMENT_CREATED",
    }),
  });
  assert.equal(noAuth.status, 401, `POST sem token → ${noAuth.status}`);
  const noAuthBody = await noAuth.json();
  assert.equal(noAuthBody.code, "INVALID_SIGNATURE");
  console.log("PASS POST sem token → 401");

  const badAuth = await fetch(base, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "asaas-access-token": "definitely-not-the-real-token",
    },
    body: JSON.stringify({
      id: `evt_smoke_bad_${Date.now()}`,
      event: "PAYMENT_RECEIVED",
    }),
  });
  assert.equal(badAuth.status, 401, `POST token inválido → ${badAuth.status}`);
  console.log("PASS POST token inválido → 401");

  console.log("WEBHOOK_SMOKE: PASS (auth gate). Evento autenticado real = NÃO EXECUTADO neste script.");
}

main().catch((err) => {
  console.error("WEBHOOK_SMOKE: FAIL", err);
  process.exit(1);
});
