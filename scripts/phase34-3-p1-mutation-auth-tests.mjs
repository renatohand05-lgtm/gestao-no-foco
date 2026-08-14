#!/usr/bin/env node
/**
 * Sprint 34.3 — P1 mutation RBAC + tax guards + storage CRM.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

const MIGRATION =
  "supabase/migrations/20260826_phase34_3_p1_auth_storage_hardening.sql";

describe("34.3 mutation auth helper", () => {
  it("helper existe e é fail-closed", async () => {
    assert.ok(existsSync(join(root, "lib/rbac/mutation-auth.ts")));
    const src = read("lib/rbac/mutation-auth.ts");
    assert.match(src, /requireTenantMutationPermission/);
    assert.match(src, /requireActiveTenantIdMutation/);
    assert.match(src, /getUserTenants/);
    assert.match(src, /requireTenant/);
    assert.match(src, /MutationAuthError/);
  });

  it("isActiveMembership ainda é pré-requisito via requireTenant/getUserTenants", () => {
    const tenants = read("lib/tenants.ts");
    const redirect = read("lib/auth/redirect.ts");
    assert.match(tenants, /isActiveMembershipRow/);
    assert.match(redirect, /isActiveMembershipRow/);
  });
});

describe("34.3 core deletes protected", () => {
  it("clientes/vendas/produtos/estoque deletes usam mutation permission", () => {
    assert.match(read("lib/clientes/actions.ts"), /clientes\.excluir/);
    assert.match(read("lib/clientes/actions.ts"), /requireTenantMutationPermission/);
    assert.match(read("lib/vendas/actions.ts"), /vendas\.excluir/);
    assert.match(read("lib/vendas/actions.ts"), /vendas\.cancelar/);
    assert.match(read("lib/produtos/actions.ts"), /produtos\.excluir/);
    assert.match(read("lib/estoque/actions.ts"), /estoque\.excluir/);
  });

  it("CRM documentos e fornecedor delete protegidos", () => {
    const crm = read("lib/crm/actions.ts");
    assert.match(crm, /deleteClienteDocumentoAction/);
    assert.match(crm, /clientes\.excluir/);
    assert.match(crm, /crm\.excluir/);
    assert.match(crm, /uploadClienteDocumentoAction/);
    assert.match(crm, /clientes\.editar/);
    const md = read("lib/master-data/actions.ts");
    assert.match(md, /compras\.excluir/);
  });
});

describe("34.3 tax tenant guards", () => {
  it("tax actions guardam tenantId ativo + permission; userId da sessão", () => {
    const tax = read("lib/tax/actions.ts");
    assert.match(tax, /requireActiveTenantIdMutation/);
    assert.match(tax, /guardTax/);
    assert.match(tax, /tax\.criar_regra/);
    assert.match(tax, /createdBy: userId/);
    assert.ok(!tax.includes("createdBy: input.userId"));
    assert.match(tax, /tenant\.id !== input\.tenantId/);
  });
});

describe("34.3 storage CRM", () => {
  it("migration policies + path validation", () => {
    assert.ok(existsSync(join(root, MIGRATION)));
    const sql = read(MIGRATION);
    assert.match(sql, /cliente-documentos/);
    assert.match(sql, /crm_docs_select_tenant/);
    assert.match(sql, /crm_docs_insert_tenant/);
    assert.match(sql, /crm_docs_update_tenant/);
    assert.match(sql, /crm_docs_delete_tenant/);
    assert.match(sql, /tm\.status is null or tm\.status = 'active'/);
    assert.match(sql, /public = false/);
    const storage = read("lib/crm/cliente-documento-storage-service.ts");
    assert.match(storage, /storagePath\.startsWith/);
    assert.match(storage, /Documento inválido para este tenant/);
  });
});

describe("34.3 privilege escalation matrix (contract)", () => {
  it("documenta bloqueios", () => {
    const matrix = {
      member_delete_cliente: "BLOCK",
      member_delete_venda: "BLOCK",
      inactive_delete: "BLOCK",
      cross_tenant_tax_id: "BLOCK",
      cross_tenant_storage_path: "BLOCK",
      owner_delete_cliente: "ALLOW",
      unauthenticated: "BLOCK",
    };
    assert.equal(matrix.member_delete_cliente, "BLOCK");
    assert.equal(matrix.owner_delete_cliente, "ALLOW");
  });
});

describe("34.3 billing freeze + 34.2 regression contracts", () => {
  it("billing frozen", async () => {
    const prev = { ...process.env };
    delete process.env.BILLING_REAL_CHARGES_ENABLED;
    delete process.env.ASAAS_ENV;
    try {
      const config = await import(
        pathToFileURL(join(root, "lib/billing/config.ts")).href + `?t=${Date.now()}`
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

  it("34.2 migration still present", () => {
    assert.ok(
      existsSync(
        join(
          root,
          "supabase/migrations/20260825_phase34_2_p0_tenant_rls_hardening.sql",
        ),
      ),
    );
  });
});
