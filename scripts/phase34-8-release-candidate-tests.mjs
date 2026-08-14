#!/usr/bin/env node
/**
 * Sprint 34.8 — Release candidate / go-live readiness (checks automatizáveis).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

describe("34.8 release docs", () => {
  it("checklists e evidência presentes", () => {
    for (const f of [
      "docs/operations/RELEASE_CHECKLIST.md",
      "docs/operations/FIRST_CLIENT_CHECKLIST.md",
      "docs/operations/BETA_SCOPE.md",
      "docs/operations/TEST_TENANTS.md",
      "docs/operations/ROLLBACK_CHECKLIST.md",
      "docs/operations/INCIDENT_RUNBOOK.md",
      "docs/operations/RECOVERY_RUNBOOK.md",
      "docs/operations/SUPPORT_RUNBOOK.md",
      "docs/testing/evidence/34-8/REPORT.md",
    ]) {
      assert.ok(existsSync(join(root, f)), f);
    }
  });
});

describe("34.8 billing frozen + no mock leakage", () => {
  it("health marca billing frozen", async () => {
    const healthMod = await import(
      pathToFileURL(join(root, "lib/platform/health.ts")).href + `?t=${Date.now()}`
    );
    const status = await healthMod.buildSystemStatus(false);
    assert.equal(status.billing.frozen, true);
    assert.equal(status.billing.realChargesAuthorized, false);
  });

  it("external blocker Asaas production permanece", async () => {
    const { ASAAS_PRODUCTION_API_KEY_BLOCKER } = await import(
      pathToFileURL(join(root, "lib/billing/external-blockers.ts")).href +
        `?t=${Date.now()}`
    );
    assert.equal(
      ASAAS_PRODUCTION_API_KEY_BLOCKER.id,
      "ASAAS_PRODUCTION_API_KEY_BLOCKER",
    );
    assert.equal(ASAAS_PRODUCTION_API_KEY_BLOCKER.status, "blocked_externally");
  });

  it("createTenant não semeia demo", () => {
    const create = read("lib/onboarding/create-tenant.ts");
    assert.ok(!/seedDemo|demo data|dados de demonstração/i.test(create));
  });

  it("assinatura piloto esconde checkout sandbox confuso", () => {
    const page = read("app/(app)/[tenant]/configuracoes/assinatura/page.tsx");
    assert.match(page, /pilotBillingFrozen/);
    assert.match(page, /Piloto sem cobrança real/);
    assert.match(page, /canManage=\{false\}/);
  });
});

describe("34.8 critical routes / auth", () => {
  it("recuperar e nova-senha existem", () => {
    assert.ok(existsSync(join(root, "app/(auth)/recuperar/page.tsx")));
    assert.ok(existsSync(join(root, "app/(auth)/nova-senha/page.tsx")));
  });

  it("rotas core de release presentes", () => {
    assert.ok(existsSync(join(root, "app/(app)/[tenant]/relatorios/page.tsx")));
    assert.ok(
      existsSync(join(root, "app/(app)/[tenant]/financeiro/aging/page.tsx")),
    );
    assert.ok(existsSync(join(root, "app/(app)/[tenant]/dashboard/page.tsx")));
    assert.ok(existsSync(join(root, "app/(app)/[tenant]/vendas/page.tsx")));
    assert.ok(existsSync(join(root, "app/(app)/[tenant]/clientes/page.tsx")));
  });
});

describe("34.8 tenant regression contracts", () => {
  it("34.2 migration e active membership ainda presentes", () => {
    assert.ok(
      existsSync(
        join(
          root,
          "supabase/migrations/20260825_phase34_2_p0_tenant_rls_hardening.sql",
        ),
      ),
    );
    const mem = read("lib/tenants/membership-status.ts");
    assert.match(mem, /isActiveMembership/);
  });
});
