/**
 * Sprint 33.0 — actions clássicas do financeiro exigem RBAC (não só membership).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("33.0 financeiro classic actions RBAC", () => {
  it("actions usam requireFinanceiroAction e não requireTenant puro", () => {
    const src = readFileSync(join(root, "lib/financeiro/actions.ts"), "utf8");
    assert.match(src, /requireFinanceiroAction/);
    assert.doesNotMatch(src, /requireTenant\(/);
    assert.match(src, /financeiro\.criar/);
    assert.match(src, /financeiro\.editar/);
    assert.match(src, /financeiro\.excluir/);
    assert.match(src, /financeiro\.transferir/);
  });

  it("helper action-auth delega para page-auth", () => {
    const src = readFileSync(
      join(root, "lib/financeiro/action-auth.ts"),
      "utf8",
    );
    assert.match(src, /requireFinancePagePermission/);
  });
});
