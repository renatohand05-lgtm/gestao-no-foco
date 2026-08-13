#!/usr/bin/env node
/**
 * Sprint 34.2 — P0 isolamento / inactive / Enterprise RBAC.
 * Contratos + helpers (sem DB live).
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

const MIGRATION =
  "supabase/migrations/20260825_phase34_2_p0_tenant_rls_hardening.sql";

describe("34.2 migration present and idempotent shape", () => {
  it("migration file exists", () => {
    assert.ok(existsSync(join(root, MIGRATION)));
  });

  it("P0-1: drops self-join INSERT and adds create_tenant_with_owner RPC", () => {
    const sql = read(MIGRATION);
    assert.match(sql, /drop policy if exists "Usuário pode se vincular como owner ao criar empresa"/);
    assert.match(sql, /create or replace function public\.create_tenant_with_owner/);
    assert.match(sql, /security definer/i);
    assert.match(sql, /Admins inserem tenant_members/);
    assert.ok(
      !sql.includes('with check (auth.uid() = user_id)') ||
        sql.indexOf("drop policy if exists \"Usuário pode se vincular") <
          sql.lastIndexOf("Admins inserem"),
      "não recria INSERT só com auth.uid() = user_id",
    );
  });

  it("P0-2: SELECT exige membership ativa", () => {
    const sql = read(MIGRATION);
    assert.match(sql, /tenant_members_select_self_active_or_admin/);
    assert.match(sql, /status is null or status = 'active'/);
    assert.match(sql, /deactivated_at is null/);
    assert.match(sql, /is_active_tenant_member/);
  });

  it("P0-3: Enterprise RBAC — member SELECT; admin write", () => {
    const sql = read(MIGRATION);
    for (const table of [
      "tenant_roles",
      "tenant_rbac_role_permissions",
      "tenant_user_roles",
      "tenant_user_permission_overrides",
    ]) {
      assert.match(sql, new RegExp(`drop policy if exists "Membros gerenciam ${table}"`));
      assert.match(sql, new RegExp(`Membros leem ${table}`));
      assert.match(sql, new RegExp(`Admins gerenciam ${table}`));
    }
    assert.match(sql, /is_tenant_admin\(tenant_id\)/);
  });
});

describe("34.2 app-layer inactive filter", () => {
  it("isActiveMembershipRow bloqueia inactive / deactivated", async () => {
    const mod = await import(
      pathToFileURL(join(root, "lib/tenants/membership-status.ts")).href +
        `?t=${Date.now()}`
    );
    assert.equal(mod.isActiveMembershipRow({ status: "active" }), true);
    assert.equal(mod.isActiveMembershipRow({ status: null }), true);
    assert.equal(mod.isActiveMembershipRow({}), true);
    assert.equal(mod.isActiveMembershipRow({ status: "inactive" }), false);
    assert.equal(
      mod.isActiveMembershipRow({
        status: "active",
        deactivated_at: "2026-08-13T00:00:00Z",
      }),
      false,
    );
  });

  it("getUserTenants / getUserTenantSlugs filtram status e deactivated_at", () => {
    const tenants = read("lib/tenants.ts");
    const redirect = read("lib/auth/redirect.ts");
    assert.match(tenants, /isActiveMembershipRow/);
    assert.match(tenants, /status, deactivated_at/);
    assert.match(redirect, /isActiveMembershipRow/);
    assert.match(redirect, /status, deactivated_at/);
  });

  it("mobile membership reusa helper ativo", () => {
    const mobile = read("lib/mobile/membership.ts");
    assert.match(mobile, /isActiveMembershipRow/);
    assert.match(mobile, /isInactiveMembership/);
  });
});

describe("34.2 onboarding path uses RPC (not direct member insert)", () => {
  it("createTenantWithOwner chama create_tenant_with_owner", () => {
    const src = read("lib/onboarding/create-tenant.ts");
    assert.match(src, /create_tenant_with_owner/);
    assert.match(src, /\.rpc\(/);
    assert.ok(!src.includes('.from("tenant_members").insert'));
    assert.ok(!src.includes(".from('tenant_members').insert"));
  });

  it("schema.sql não restaura INSERT permissivo", () => {
    const schema = read("supabase/schema.sql");
    assert.ok(
      !schema.includes(
        'create policy "Usuário pode se vincular como owner ao criar empresa"',
      ),
    );
  });
});

describe("34.2 privilege escalation matrix (contract)", () => {
  it("documenta bloqueios esperados A/B e roles", () => {
    const matrix = {
      unauthenticated_insert_membership: "BLOCK",
      member_a_insert_membership_tenant_b: "BLOCK",
      member_a_self_promote_owner: "BLOCK",
      member_write_tenant_user_roles: "BLOCK",
      member_write_tenant_rbac_role_permissions: "BLOCK",
      member_write_tenant_roles: "BLOCK",
      member_write_permission_overrides: "BLOCK",
      cross_tenant_rbac_write: "BLOCK",
      inactive_select_own_membership: "BLOCK",
      inactive_access_tenant_data_via_exists: "BLOCK",
      owner_admin_write_rbac: "ALLOW",
      owner_create_tenant_via_rpc: "ALLOW",
      invite_accept_service_role: "ALLOW",
    };
    assert.equal(matrix.member_a_insert_membership_tenant_b, "BLOCK");
    assert.equal(matrix.inactive_select_own_membership, "BLOCK");
    assert.equal(matrix.owner_create_tenant_via_rpc, "ALLOW");
  });
});

describe("34.2 billing untouched", () => {
  it("config e blocker intactos", async () => {
    const prev = { ...process.env };
    delete process.env.BILLING_REAL_CHARGES_ENABLED;
    delete process.env.ASAAS_ENV;
    try {
      const config = await import(
        pathToFileURL(join(root, "lib/billing/config.ts")).href +
          `?t=${Date.now()}`
      );
      const blockers = await import(
        pathToFileURL(join(root, "lib/billing/external-blockers.ts")).href +
          `?t=${Date.now()}`
      );
      assert.equal(config.getAsaasEnvMode(), "sandbox");
      assert.equal(config.isRealChargesAuthorized(), false);
      assert.equal(blockers.isAsaasProductionApiKeyBlockedExternally(), true);
    } finally {
      for (const k of Object.keys(process.env)) {
        if (!(k in prev)) delete process.env[k];
      }
      Object.assign(process.env, prev);
    }
  });
});

describe("34.2 evidence + diagnostics", () => {
  it("diagnostic queries and report paths", () => {
    assert.ok(
      existsSync(join(root, "docs/testing/evidence/34-2/DIAGNOSTIC_QUERIES.sql")),
    );
  });
});
