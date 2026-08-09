/**
 * Sprint 32.4 — testes estruturais tab bar (sem import RN / pixel).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const mobileRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("32.4 tab bar contrast tokens", () => {
  it("design-tokens define gofTabBar light/dark", () => {
    const src = readFileSync(
      join(root, "packages/design-tokens/src/index.ts"),
      "utf8",
    );
    assert.match(src, /export const gofTabBar/);
    assert.match(src, /goldSoft/);
    assert.match(src, /inactive:/);
    assert.match(src, /disabled:/);
    assert.match(src, /labelActive:/);
  });

  it("tab-bar helper define active ≠ inactive e minHeight 44", () => {
    const src = readFileSync(join(mobileRoot, "src/design/tab-bar.ts"), "utf8");
    assert.match(src, /TAB_ACTIVE/);
    assert.match(src, /TAB_INACTIVE/);
    assert.match(src, /TAB_DISABLED/);
    assert.match(src, /minHeight:\s*44/);
    assert.match(src, /buildTabScreenOptions/);
    assert.doesNotMatch(src, /opacity:\s*0\.[0-3]/);
  });

  it("layout usa inactive tint + TabBarIcon + a11y labels", () => {
    const src = readFileSync(
      join(mobileRoot, "app/(app)/_layout.tsx"),
      "utf8",
    );
    assert.match(src, /buildTabScreenOptions/);
    assert.match(src, /TabBarIcon/);
    assert.match(src, /tabBarAccessibilityLabel/);
    assert.doesNotMatch(src, /tabBarActiveTintColor:\s*colors\.primary/);
  });

  it("TabBarIcon mapeia rotas principais", () => {
    const src = readFileSync(
      join(mobileRoot, "src/design/TabBarIcon.tsx"),
      "utf8",
    );
    for (const route of [
      "index",
      "inteligencia",
      "crm",
      "estoque",
      "operacao",
      "financeiro",
    ]) {
      assert.match(src, new RegExp(`${route}:`));
    }
  });
});
