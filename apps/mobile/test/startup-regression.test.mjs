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
  it("tab layout não importa finance/sections (UI) no bootstrap", () => {
    const src = readFileSync(
      join(mobileRoot, "app/(app)/_layout.tsx"),
      "utf8",
    );
    assert.match(src, /from ["']@\/finance\/perms["']/);
    assert.doesNotMatch(src, /from ["']@\/finance\/sections["']/);
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
