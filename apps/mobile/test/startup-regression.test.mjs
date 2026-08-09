/**
 * Sprint 31.11.14 — regressão de bootstrap mobile (unit).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const mobileRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("31.11.14 startup integrity", () => {
  it("tab layout não importa sections (UI) no bootstrap", () => {
    const src = readFileSync(
      join(mobileRoot, "app/(app)/_layout.tsx"),
      "utf8",
    );
    assert.match(src, /from ["']@\/finance\/perms["']/);
    assert.match(src, /from ["']@\/crm\/perms["']/);
    assert.match(src, /from ["']@\/stock\/perms["']/);
    assert.match(src, /from ["']@\/operacao\/perms["']/);
    assert.doesNotMatch(src, /sections/);
  });

  it("perms contém aliases Financeiro sem dependências pesadas", async () => {
    const mod = await import("../src/finance/perms.ts");
    assert.ok(mod.FINANCE_VIEW_PERMS.includes("analytics.financeiro"));
    assert.ok(mod.FINANCE_VIEW_PERMS.includes("dashboard.financeiro"));
    const src = readFileSync(join(mobileRoot, "src/finance/perms.ts"), "utf8");
    assert.equal(/from\s+["']@\/api\/mobile-api["']/.test(src), false);
  });

  it("rbac-contracts resolve alias financeiro no cold path", async () => {
    const rbac = await import("@gof/rbac-contracts");
    assert.equal(
      rbac.hasPermission(["analytics.financeiro"], "financeiro.visualizar"),
      true,
    );
  });
});

describe("32.1.1 token + env parity", () => {
  it("getAccessToken tem fallback Supabase", () => {
    const src = readFileSync(
      join(mobileRoot, "src/auth/secure-session.ts"),
      "utf8",
    );
    assert.match(src, /token_fallback_supabase/);
    assert.match(src, /getSession\(\)/);
  });

  it("tenant não usa permissions vazio em falha", () => {
    const src = readFileSync(
      join(mobileRoot, "app/(auth)/tenant.tsx"),
      "utf8",
    );
    assert.doesNotMatch(
      src,
      /permissions:\s*perms\.ok\s*\?\s*perms\.data\.permissions\s*:\s*\[\]/,
    );
  });
});
