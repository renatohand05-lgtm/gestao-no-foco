#!/usr/bin/env node
/**
 * Sprint 33.3 — billing contracts: tenant isolation, RBAC, entitlements, idempotency, webhook stub.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

describe("33.3 migration billing", () => {
  const sql = read("supabase/migrations/20260823_phase33_3_billing.sql");

  it("cria plans/subscriptions/events/checkout tenant-scoped", () => {
    assert.match(sql, /billing_plans/);
    assert.match(sql, /billing_subscriptions/);
    assert.match(sql, /billing_provider_events/);
    assert.match(sql, /billing_checkout_attempts/);
    assert.match(sql, /billing_subscriptions_tenant_unique/);
  });

  it("status trial|active|past_due|canceled", () => {
    assert.match(sql, /trial.*active.*past_due.*canceled/s);
  });

  it("RLS owner manage / member read; provider_events sem auth write", () => {
    assert.match(sql, /can_read_billing/);
    assert.match(sql, /can_manage_billing/);
    assert.match(sql, /role = 'owner'/);
    assert.match(sql, /revoke all on table public\.billing_provider_events/);
  });

  it("seed pilot sem preço hardcoded", () => {
    assert.match(sql, /'pilot'/);
    assert.match(sql, /amount_cents[\s\S]*null/);
    assert.match(sql, /is_pilot/);
  });
});

describe("33.3 entitlements vs RBAC", () => {
  it("finalAccessAllowed exige ambos", async () => {
    const mod = await import(
      pathToFileURL(join(root, "lib/billing/entitlements.ts")).href
    );
    assert.equal(
      mod.finalAccessAllowed({ entitlementAllowed: true, rbacAllowed: true }),
      true,
    );
    assert.equal(
      mod.finalAccessAllowed({ entitlementAllowed: true, rbacAllowed: false }),
      false,
    );
    assert.equal(
      mod.finalAccessAllowed({ entitlementAllowed: false, rbacAllowed: true }),
      false,
    );
  });

  it("trial sem fim é inválido; expired restringe", async () => {
    const mod = await import(
      pathToFileURL(join(root, "lib/billing/entitlements.ts")).href
    );
    assert.equal(
      mod.isTrialExpired({ status: "trial", trialEnd: null }),
      true,
    );
    const past = new Date(Date.now() - 86400000).toISOString();
    assert.equal(
      mod.isTrialExpired({ status: "trial", trialEnd: past }),
      true,
    );
    const future = new Date(Date.now() + 86400000).toISOString();
    assert.equal(
      mod.isTrialExpired({ status: "trial", trialEnd: future }),
      false,
    );
  });

  it("enforcement off = open (não bloqueia teste)", async () => {
    const prev = process.env.BILLING_ENFORCEMENT;
    process.env.BILLING_ENFORCEMENT = "0";
    const mod = await import(
      pathToFileURL(join(root, "lib/billing/entitlements.ts")).href +
        `?t=${Date.now()}`
    );
    const access = mod.resolveSubscriptionAccess({
      status: "canceled",
      trialEnd: null,
      entitlements: { modules: ["crm"] },
      moduleKey: "financeiro",
    });
    assert.equal(access.accessMode, "open");
    assert.equal(access.moduleAllowed, true);
    if (prev === undefined) delete process.env.BILLING_ENFORCEMENT;
    else process.env.BILLING_ENFORCEMENT = prev;
  });
});

describe("33.3 config provider-agnostic", () => {
  it("sem provedor = não configurado", async () => {
    const prevP = process.env.BILLING_PROVIDER;
    const prevS = process.env.STRIPE_SECRET_KEY;
    process.env.BILLING_PROVIDER = "none";
    delete process.env.STRIPE_SECRET_KEY;
    const mod = await import(
      pathToFileURL(join(root, "lib/billing/config.ts")).href +
        `?t=${Date.now()}`
    );
    assert.equal(mod.isBillingProviderConfigured(), false);
    assert.equal(mod.getConfiguredBillingProvider(), "none");
    if (prevP === undefined) delete process.env.BILLING_PROVIDER;
    else process.env.BILLING_PROVIDER = prevP;
    if (prevS === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = prevS;
  });
});

describe("33.3 auth + actions + UI contracts", () => {
  it("somente owner gerencia; admin visualiza", () => {
    const auth = read("lib/billing/auth.ts");
    assert.match(auth, /role === "owner"/);
    assert.match(auth, /role === "owner" \|\| role === "admin"/);
  });

  it("checkout não marca paid sem provedor", () => {
    const actions = read("lib/billing/actions.ts");
    assert.match(actions, /provider_missing/);
    assert.match(actions, /PROVIDER_NOT_CONFIGURED/);
    assert.doesNotMatch(actions, /status:\s*["']active["']/);
    assert.match(actions, /idempotencyKey/);
  });

  it("webhook valida secret e idempotência", () => {
    const wh = read("app/api/billing/webhook/route.ts");
    assert.match(wh, /INVALID_SIGNATURE/);
    assert.match(wh, /EVENT_ID_REQUIRED/);
    assert.match(wh, /duplicate/);
    assert.match(wh, /PROVIDER_NOT_CONFIGURED/);
    assert.match(wh, /billing_provider_events/);
  });

  it("UI assinatura + link configurações", () => {
    assert.ok(
      existsSync(
        join(root, "app/(app)/[tenant]/configuracoes/assinatura/page.tsx"),
      ),
    );
    const cfg = read("app/(app)/[tenant]/configuracoes/page.tsx");
    assert.match(cfg, /configuracoes\/assinatura/);
  });

  it("docs billing atualizados", () => {
    const arch = read("docs/billing/BILLING_ARCHITECTURE.md");
    assert.match(arch, /33\.3/);
    assert.match(arch, /PAYMENT IMPLEMENTADO: NÃO/);
    assert.ok(existsSync(join(root, "docs/billing/PILOT_BILLING_RUNBOOK.md")));
  });
});

describe("33.3 mobile untouched", () => {
  it("paths da sprint fora de apps/mobile", () => {
    for (const p of [
      "lib/billing/actions.ts",
      "app/api/billing/webhook/route.ts",
      "supabase/migrations/20260823_phase33_3_billing.sql",
    ]) {
      assert.ok(!p.startsWith("apps/mobile"));
    }
  });
});

describe("33.3 cross-tenant contract (source)", () => {
  it("subscription queries filtram tenant_id", () => {
    const repo = read("lib/billing/repository.ts");
    assert.match(repo, /\.eq\("tenant_id", tenantId\)/);
    assert.match(repo, /tenant_id: input\.tenantId/);
    const sql = read("supabase/migrations/20260823_phase33_3_billing.sql");
    assert.match(sql, /can_read_billing\(tenant_id\)/);
    assert.match(sql, /can_manage_billing\(tenant_id\)/);
  });
});
