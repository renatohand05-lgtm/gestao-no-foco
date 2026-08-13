#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

describe("33.7 commercial catalog", () => {
  it("quatro planos, preços, BRL, mensal, Gestão recomendado", async () => {
    const mod = await import(
      pathToFileURL(join(root, "lib/billing/catalog.ts")).href + `?t=${Date.now()}`
    );
    const list = mod.listCommercialPlans();
    assert.equal(list.length, 4);
    const by = Object.fromEntries(list.map((p) => [p.slug, p]));
    assert.equal(by.essential.amountCents, 27990);
    assert.equal(by.management.amountCents, 47990);
    assert.equal(by.pro.amountCents, 74990);
    assert.equal(by.pro_plus_consulting.amountCents, 349990);
    for (const p of list) {
      assert.equal(p.currency, "BRL");
      assert.equal(p.billingInterval, "month");
      assert.equal(p.status, "active");
    }
    assert.equal(mod.getRecommendedPlan().slug, "management");
    assert.equal(by.essential.trialDays, 14);
    assert.equal(by.management.trialDays, 14);
    assert.equal(by.pro.trialDays, 14);
    assert.equal(by.pro_plus_consulting.trialDays, null);
    assert.equal(by.pro_plus_consulting.includesConsulting, true);
    assert.equal(by.pro_plus_consulting.requiresSalesContact, true);
    assert.equal(mod.SANDBOX_HOMOLOGATION_AMOUNT_CENTS, 1990);
    assert.equal(mod.resolveTrustedAmountCents("pro"), 74990);
    assert.equal(mod.resolveTrustedAmountCents("ghost"), null);
  });
});

describe("33.7 price security", () => {
  it("catálogo vence amount do cliente e plano inativo/inexistente", async () => {
    const amount = await import(
      pathToFileURL(join(root, "lib/billing/checkout-amount.ts")).href +
        `?t=${Date.now()}`
    );
    const fakePro = {
      id: "x",
      slug: "pro",
      name: "Pro",
      status: "active",
      amountCents: 1,
      currency: "USD",
      billingInterval: "month",
      entitlements: {},
      isPilot: false,
    };
    const priced = amount.resolveCheckoutAmount(fakePro);
    assert.equal(priced.ok, true);
    assert.equal(priced.amountCents, 74990);
    assert.equal(priced.source, "catalog");

    const inactive = amount.resolveCheckoutAmount({
      ...fakePro,
      status: "inactive",
    });
    assert.equal(inactive.ok, false);
    assert.equal(inactive.code, "PLAN_INACTIVE");

    assert.equal(
      amount.isPlanSlugAuthorized({
        requestedSlug: "nope",
        tenantPlanSlug: "pilot",
      }),
      false,
    );
    assert.equal(
      amount.isPlanSlugAuthorized({
        requestedSlug: "pro",
        tenantPlanSlug: "pilot",
      }),
      true,
    );
    assert.match(
      String(amount.rejectClientPriceFields({ amountCents: 74991 })),
      /Preço/,
    );
    assert.match(
      String(amount.rejectClientPriceFields({ currency: "USD" })),
      /Preço|moeda/,
    );

    const plusOne = amount.resolveAmountIgnoringClient(fakePro, {
      plan_code: "pro",
      amountCents: 74991,
    });
    assert.equal(plusOne.ok, false);
    assert.equal(plusOne.code, "PRICE_NOT_CLIENT_SETTABLE");

    const essentialTamper = amount.resolveAmountIgnoringClient(
      { ...fakePro, slug: "essential" },
      { amount_cents: 1 },
    );
    assert.equal(essentialTamper.ok, false);

    const currencyTamper = amount.resolveAmountIgnoringClient(fakePro, {
      currency: "USD",
    });
    assert.equal(currencyTamper.ok, false);
  });
});

describe("33.7 upgrade/downgrade no charge no delete", () => {
  it("upgrade/downgrade sem cobrança e sem apagar dados", async () => {
    const mod = await import(
      pathToFileURL(join(root, "lib/billing/plan-change.ts")).href +
        `?t=${Date.now()}`
    );
    const up = mod.classifyPlanChange("essential", "pro");
    assert.equal(up.kind, "upgrade");
    assert.equal(up.charges, false);
    assert.equal(up.deletesData, false);
    const down = mod.classifyPlanChange("pro", "essential");
    assert.equal(down.kind, "downgrade");
    assert.equal(down.preferredTiming, "next_cycle");
    assert.equal(down.deletesData, false);
    const bad = mod.classifyPlanChange("pro", "ghost");
    assert.equal(bad.allowed, false);
    const fromPilot = mod.classifyPlanChange("pilot", "management");
    assert.equal(fromPilot.allowed, true);
    assert.equal(fromPilot.charges, false);
    assert.equal(fromPilot.deletesData, false);
    const plus = mod.classifyPlanChange("pro", "pro_plus_consulting");
    assert.equal(plus.preferredTiming, "contact_sales");
    const downPlus = mod.classifyPlanChange("pro_plus_consulting", "essential");
    assert.equal(downPlus.kind, "downgrade");
    assert.equal(downPlus.deletesData, false);
  });
});

describe("33.7 contracts", () => {
  it("seed SQL idempotente e não mexe no piloto", () => {
    const sql = read("supabase/migrations/20260824_phase33_7_commercial_catalog.sql");
    assert.match(sql, /on conflict \(slug\) do update/);
    assert.match(sql, /27990/);
    assert.match(sql, /47990/);
    assert.match(sql, /74990/);
    assert.match(sql, /349990/);
    assert.doesNotMatch(sql, /delete from public\.billing_plans/);
    assert.doesNotMatch(sql, /drop table/i);
  });

  it("UI catálogo + sandbox banner preservado", () => {
    const ui = read("components/billing/billing-catalog-panel.tsx");
    assert.match(ui, /Recomendado/);
    assert.match(ui, /requestPlanChangeAction/);
    assert.doesNotMatch(ui, /localStorage\.|sessionStorage\./);
    const page = read("app/(app)/[tenant]/configuracoes/assinatura/page.tsx");
    assert.match(page, /BillingCatalogPanel/);
    assert.match(page, /Seu plano atual/);
    const actions = read("components/billing/billing-actions-panel.tsx");
    assert.match(actions, /AMBIENTE DE TESTE \/ SANDBOX/);
  });

  it("real charges continua off por default; cancel preserva histórico", () => {
    const cfg = read("lib/billing/config.ts");
    assert.match(cfg, /BILLING_REAL_CHARGES_ENABLED === ["']1["']/);
    const actions = read("lib/billing/actions.ts");
    assert.match(actions, /histórico foram preservados/);
    assert.match(actions, /PLAN_INACTIVE/);
    assert.doesNotMatch(actions, /status:\s*["']active["']/);
  });

  it("mobile não alterado", () => {
    assert.ok(!read("lib/billing/catalog.ts").includes("apps/mobile"));
  });

  it("docs catálogo e 19,90 homologação", () => {
    assert.ok(existsSync(join(root, "docs/billing/COMMERCIAL_CATALOG.md")));
    const doc = read("docs/billing/COMMERCIAL_CATALOG.md");
    assert.match(doc, /279,90/);
    assert.match(doc, /19,90/);
    assert.match(doc, /HOMOLOGAÇÃO/);
    assert.match(doc, /PENDENTE DE DECISÃO COMERCIAL/);
  });

  it("tenant isolation + RBAC + entitlement server-side", async () => {
    const actions = read("lib/billing/actions.ts");
    assert.match(actions, /requireBillingPageAuth\(input\.tenantSlug\)/);
    assert.match(actions, /getSubscriptionWithPlan\(supabase, auth\.tenant\.id\)/);
    assert.doesNotMatch(actions, /input\.tenantId/);
    assert.match(actions, /canManage/);
    const repo = read("lib/billing/repository.ts");
    assert.match(repo, /\.eq\("tenant_id", tenantId\)/);
    const ent = await import(
      pathToFileURL(join(root, "lib/billing/entitlements.ts")).href +
        `?t=${Date.now()}`
    );
    assert.equal(
      ent.finalAccessAllowed({ entitlementAllowed: true, rbacAllowed: false }),
      false,
    );
    assert.equal(
      ent.planAllowsModule({ modules: ["dashboard"] }, "dashboard"),
      true,
    );
    const access = ent.resolveSubscriptionAccess({
      status: "active",
      trialEnd: null,
      entitlements: { modules: ["dashboard"] },
      moduleKey: "dashboard",
    });
    assert.equal(access.moduleAllowed, true);
    assert.equal(access.accessMode, "open");
  });

  it("sandbox/fail-closed e sem Asaas production", () => {
    const cfg = read("lib/billing/config.ts");
    assert.match(cfg, /ASAAS_ENV \|\| ["']sandbox["']/);
    assert.match(cfg, /BILLING_REAL_CHARGES_ENABLED === ["']1["']/);
    assert.match(cfg, /ASAAS_ALLOW_PRODUCTION === ["']1["']/);
    const client = read("lib/billing/asaas/client.ts");
    assert.match(client, /api-sandbox\.asaas\.com|getAsaasApiBaseUrl/);
    const actions = read("lib/billing/actions.ts");
    assert.match(actions, /isRealChargesAuthorized/);
    assert.match(actions, /REAL_CHARGES_BLOCKED/);
  });

  it("matriz de capacidades não inventa diferença comercial", async () => {
    const matrix = await import(
      pathToFileURL(join(root, "lib/billing/capability-matrix.ts")).href +
        `?t=${Date.now()}`
    );
    const classes = new Set(
      matrix.EXISTING_CAPABILITY_MATRIX.map((r) => r.classification),
    );
    assert.ok(classes.has("CORE"));
    assert.ok(classes.has("possible_entitlement"));
    assert.ok(classes.has("consulting_human"));
    assert.equal(
      matrix.EXISTING_CAPABILITY_MATRIX.filter((r) => r.id === "mobile")[0]
        .classification,
      "not_plan_applicable",
    );
  });
});
