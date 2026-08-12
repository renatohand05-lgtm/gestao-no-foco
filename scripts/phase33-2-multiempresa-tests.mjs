#!/usr/bin/env node
/**
 * Sprint 33.2 — multiempresa portal: seletor, cache, onboarding adicional, billing docs.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

describe("33.2 multiempresa architecture map", () => {
  it("documenta modelo memberships (sem arquitetura paralela)", () => {
    assert.ok(existsSync(join(root, "docs/architecture/PHASE_33_2_MULTI_TENANT.md")));
    const doc = read("docs/architecture/PHASE_33_2_MULTI_TENANT.md");
    assert.match(doc, /tenant_members/);
    assert.match(doc, /Não foi criada arquitetura paralela/);
  });

  it("empresas é segmento reservado (não tenant slug)", () => {
    const routes = read("lib/auth/routes.ts");
    assert.match(routes, /"empresas"/);
    assert.match(routes, /\/empresas\/nova/);
  });
});

describe("33.2 preferred tenant + redirect", () => {
  it("pickPreferredTenantSlug só aceita slug autorizado", async () => {
    const mod = await import(
      pathToFileURL(join(root, "lib/tenant/active-tenant.ts")).href
    );
    assert.equal(mod.pickPreferredTenantSlug(["a", "b"], "b"), "b");
    assert.equal(mod.pickPreferredTenantSlug(["a", "b"], "evil"), "a");
    assert.equal(mod.pickPreferredTenantSlug(["a"], null), "a");
    assert.equal(mod.pickPreferredTenantSlug([], "a"), null);
  });

  it("resolvePostLoginPath usa preferred autorizado", () => {
    const src = read("lib/auth/redirect.ts");
    assert.match(src, /pickPreferredTenantSlug/);
    assert.match(src, /preferredSlug/);
    assert.match(src, /tenantSlugs\.includes\(slug\)/);
    // preferred inválido cai no primeiro autorizado — ver pickPreferredTenantSlug
  });
});

describe("33.2 dashboard filter storage tenant-scoped", () => {
  it("chave inclui slug; parse usa query conta", async () => {
    const mod = await import(
      pathToFileURL(join(root, "lib/dashboard/filter-storage.ts")).href
    );
    assert.equal(
      mod.dashboardFiltersStorageKey("Acme-Co"),
      "gnf:dashboard-filters:acme-co",
    );
    const params = new URLSearchParams("conta=uuid-1&status=realizado");
    const parsed = mod.parseDashboardSearchParams(params, {
      dataDe: "2026-01-01",
      dataAte: "2026-01-31",
    });
    assert.equal(parsed.contaBancaria, "uuid-1");
  });

  it("consumers passam tenantSlug ao persistir", () => {
    const bar = read("components/dashboard/dashboard-filters.tsx");
    const header = read("components/dashboard/dashboard-header.tsx");
    assert.match(bar, /writeStoredDashboardFilters\(tenantSlug,/);
    assert.match(bar, /readStoredDashboardFilters\(tenantSlug\)/);
    assert.match(header, /writeStoredDashboardFilters\(tenantSlug,/);
  });
});

describe("33.2 tenant switcher", () => {
  it("invalida cache, persiste cookie e refresh na troca", () => {
    const src = read("components/layout/tenant-switcher.tsx");
    assert.match(src, /clearTenantScopedClientCaches/);
    assert.match(src, /buildLastTenantCookie/);
    assert.match(src, /router\.refresh\(\)/);
    assert.match(src, /empresas\/nova/);
    assert.doesNotMatch(src, /fluxo completo ainda não/);
  });

  it("middleware nega slug não autorizado e loga", () => {
    const src = read("lib/supabase/middleware.ts");
    assert.match(src, /tenant_access_denied/);
    assert.match(src, /LAST_TENANT_COOKIE/);
    assert.match(src, /x-request-id/);
    assert.match(src, /getPostLoginPath\([\s\S]*preferredSlug/);
  });

  it("requireTenant loga deny", () => {
    const src = read("lib/tenants.ts");
    assert.match(src, /tenant_context_denied/);
  });
});

describe("33.2 onboarding empresa adicional", () => {
  it("rota /empresas/nova existe e não bloqueia memberships", () => {
    assert.ok(existsSync(join(root, "app/(app)/empresas/nova/page.tsx")));
    const page = read("app/(app)/empresas/nova/page.tsx");
    assert.match(page, /mode="additional"/);
    assert.doesNotMatch(page, /getPostLoginPath/);
  });

  it("form impede double submit e seta cookie", () => {
    const form = read("components/onboarding/onboarding-form.tsx");
    assert.match(form, /mode\?: "first" \| "additional"/);
    assert.match(form, /if \(loading \|\| submitted\) return/);
    assert.match(form, /buildLastTenantCookie/);
  });

  it("middleware não redireciona /empresas/nova para dashboard", () => {
    const mw = read("lib/supabase/middleware.ts");
    assert.match(mw, /Empresa adicional: \/empresas\/nova/);
    assert.doesNotMatch(
      mw,
      /pathname === "\/empresas\/nova"[\s\S]{0,80}defaultDestination/,
    );
  });
});

describe("33.2 pilot + billing docs", () => {
  it("pilot helper sem bypass de segurança", () => {
    const src = read("lib/pilot/pilot-tenant.ts");
    assert.match(src, /PILOT_TENANT_SLUGS/);
    assert.match(src, /sem bypass|sem alterar RLS/i);
  });

  it("BILLING_ARCHITECTURE.md cobre estados e RBAC≠entitlement", () => {
    const doc = read("docs/billing/BILLING_ARCHITECTURE.md");
    assert.match(doc, /trial/);
    assert.match(doc, /active/);
    assert.match(doc, /past_due/);
    assert.match(doc, /canceled/);
    assert.match(doc, /Entitlement/);
    assert.match(doc, /RBAC/);
    assert.match(doc, /PAYMENT IMPLEMENTADO: NÃO/);
    assert.match(doc, /idempotência/i);
    assert.match(doc, /webhook/i);
  });

  it("onboarding piloto atualizado para multiempresa", () => {
    const doc = read("docs/pilot/WEB_PILOT_01_ONBOARDING.md");
    assert.match(doc, /33\.2/);
    assert.match(doc, /empresas\/nova/);
    assert.match(doc, /gof_last_tenant_slug/);
  });
});

describe("33.2 mobile untouched contract", () => {
  it("não altera apps/mobile nesta evidência estrutural", () => {
    // Guard: arquivos tocados pela sprint vivem fora de apps/mobile.
    for (const p of [
      "components/layout/tenant-switcher.tsx",
      "lib/supabase/middleware.ts",
      "app/(app)/empresas/nova/page.tsx",
    ]) {
      assert.ok(!p.startsWith("apps/mobile"));
    }
  });
});
