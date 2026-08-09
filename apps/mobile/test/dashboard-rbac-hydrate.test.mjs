/**
 * Sprint 32.5 — Dashboard não some por RBAC vazio no cold start.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const mobileRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("32.5 dashboard + RBAC hydrate", () => {
  it("session boot chama hydrateTenantPermissions após restore", () => {
    const src = readFileSync(
      join(mobileRoot, "src/auth/session-store.ts"),
      "utf8",
    );
    assert.match(src, /hydrateTenantPermissions/);
    assert.match(src, /restoreFromMetadata/);
  });

  it("hydrate nunca grava permissions vazias em falha de API", () => {
    const src = readFileSync(
      join(mobileRoot, "src/tenant/hydrate-permissions.ts"),
      "utf8",
    );
    assert.match(src, /Nunca grava \[\]/);
    assert.match(src, /loadPermissionsCache/);
    assert.match(src, /fetchPermissions/);
    assert.doesNotMatch(src, /applyPermissions\(\s*\[\]/);
  });

  it("tab layout não esconde Início enquanto RBAC não é autoritativo", () => {
    const src = readFileSync(
      join(mobileRoot, "app/(app)/_layout.tsx"),
      "utf8",
    );
    assert.match(src, /arePermissionsAuthoritative/);
    assert.match(src, /hrefIf/);
    assert.match(src, /tabBarAccessibilityLabel:\s*"Início, Dashboard"/);
  });

  it("Dashboard Home espera RBAC ready antes de deny/redirect", () => {
    const src = readFileSync(join(mobileRoot, "app/(app)/index.tsx"), "utf8");
    assert.match(src, /arePermissionsAuthoritative/);
    assert.match(src, /rbacReady/);
    assert.match(src, /DashboardSkeleton/);
    assert.match(src, /from ["']@\/operacao\/perms["']/);
    assert.doesNotMatch(src, /from ["']@\/operacao\/sections["']/);
  });

  it("labels curtas anti-truncamento na tab bar", () => {
    const src = readFileSync(
      join(mobileRoot, "app/(app)/_layout.tsx"),
      "utf8",
    );
    assert.match(src, /tabBarLabel:\s*"Ops"/);
    assert.match(src, /tabBarLabel:\s*"Financ\."/);
    assert.match(src, /tabBarLabel:\s*"Estoq\."/);
    assert.doesNotMatch(src, /tabBarLabel:\s*"Financeiro"/);
    assert.doesNotMatch(src, /tabBarLabel:\s*"Operação"/);
  });

  it("tab-bar desliga font scaling agressivo e mantém inactive tint", () => {
    const src = readFileSync(join(mobileRoot, "src/design/tab-bar.ts"), "utf8");
    assert.match(src, /tabBarInactiveTintColor:\s*tokens\.TAB_INACTIVE/);
    assert.match(src, /tabBarAllowFontScaling:\s*false/);
    assert.doesNotMatch(src, /opacity:\s*0\.[0-3]/);
  });

  it("tokens inactive ≠ disabled (contraste)", async () => {
    const mod = await import("@gof/design-tokens");
    const dark = mod.gofTabBar.dark;
    const light = mod.gofTabBar.light;
    assert.notEqual(dark.inactive, dark.disabled);
    assert.notEqual(light.inactive, light.disabled);
    assert.notEqual(dark.inactive, dark.active);
  });
});
