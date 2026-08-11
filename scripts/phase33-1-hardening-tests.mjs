#!/usr/bin/env node
/**
 * Sprint 33.1 — contratos P1: RLS finance write, sidebar RBAC, service role server-only, idempotency.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

describe("33.1 finance RLS write", () => {
  const sql = read(
    "supabase/migrations/20260822_phase33_1_finance_rls_write.sql",
  );

  it("define can_write_finance com roles reais owner|admin|manager", () => {
    assert.match(sql, /can_write_finance/);
    assert.match(sql, /role in \('owner', 'admin', 'manager'\)/);
    assert.doesNotMatch(sql, /role in \('owner', 'admin', 'manager', 'member'\)/);
  });

  it("SELECT usa can_read_finance (membro); write separado", () => {
    assert.match(sql, /can_read_finance/);
    assert.match(sql, /for select using \(public\.can_read_finance/);
    assert.match(sql, /for insert with check \(public\.can_write_finance/);
    assert.match(sql, /for delete using \(public\.can_write_finance/);
  });

  it("cobre tabelas financeiras críticas", () => {
    for (const t of [
      "contas_pagar",
      "contas_receber",
      "contas_bancarias",
      "movimentacoes_bancarias",
      "categorias_financeiras",
      "centros_custo",
      "plano_contas",
      "formas_pagamento",
      "despesas_recorrentes",
      "finance_budgets",
    ]) {
      assert.match(sql, new RegExp(`'${t}'`));
    }
  });

  it("revoke anon/public nas funções", () => {
    assert.match(sql, /revoke all on function public\.can_write_finance/);
    assert.match(sql, /revoke all on function public\.can_read_finance/);
  });
});

describe("33.1 sidebar RBAC", () => {
  it("sidebar filtra por permissions", () => {
    const src = read("components/layout/app-sidebar.tsx");
    assert.match(src, /filterNavByPermissions/);
    assert.match(src, /permissions/);
  });

  it("layout resolve permissões de nav", () => {
    const src = read("app/(app)/[tenant]/layout.tsx");
    assert.match(src, /resolveTenantNavPermissions/);
    assert.match(src, /permissions=\{permissions\}/);
  });

  it("finance/CRM/estoque/OS têm requiredAnyPermissions", () => {
    const src = read("config/navigation.ts");
    assert.match(src, /id: "finance"[\s\S]*requiredAnyPermissions/);
    assert.match(src, /id: "crm"[\s\S]*requiredAnyPermissions/);
    assert.match(src, /id: "inventory"[\s\S]*requiredAnyPermissions/);
    assert.match(src, /id: "work-orders"[\s\S]*requiredAnyPermissions/);
  });

  it("member mapeia visualizacao; owner mapeia proprietario; filtro UX any-of", () => {
    const compat = read("lib/finance/shared/rbac-compat.ts");
    assert.match(compat, /member:\s*\["visualizacao"\]/);
    assert.match(compat, /owner:\s*ELEVATED_MEMBERSHIP_TO_ENTERPRISE_ROLES\.owner/);
    const roles = read("lib/rbac/role-permissions.ts");
    const vizBlock = roles.slice(
      roles.indexOf("const VISUALIZACAO_KEYS"),
      roles.indexOf("/** Permissões de plataforma"),
    );
    assert.match(vizBlock, /financeiro\.visualizar/);
    assert.doesNotMatch(vizBlock, /financeiro\.criar/);

    const items = [
      { id: "finance", requiredAnyPermissions: ["financeiro.visualizar"] },
      { id: "integrations", requiredAnyPermissions: ["integracoes.administrar"] },
    ];
    const perms = ["financeiro.visualizar"];
    const filtered = items.filter(
      (i) =>
        !i.requiredAnyPermissions?.length ||
        i.requiredAnyPermissions.some((p) => perms.includes(p)),
    );
    assert.equal(filtered.some((i) => i.id === "finance"), true);
    assert.equal(filtered.some((i) => i.id === "integrations"), false);
  });
});

describe("33.1 service role não vai ao frontend", () => {
  it("admin client é server-only e usa env privada", () => {
    const src = read("lib/supabase/admin.ts");
    assert.match(src, /import "server-only"/);
    assert.match(src, /process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
    assert.doesNotMatch(src, /NEXT_PUBLIC_SUPABASE_SERVICE_ROLE/);
  });

  it("compose mobile é server-only (BFF), não apps/mobile", () => {
    const src = read("lib/mobile/finance-compose.ts");
    assert.match(src, /import "server-only"/);
    assert.match(src, /createAdminClient/);
    const mobileAdmin = read("apps/mobile/src/api/mobile-api.ts");
    assert.doesNotMatch(mobileAdmin, /SUPABASE_SERVICE_ROLE_KEY/);
    assert.doesNotMatch(mobileAdmin, /createAdminClient/);
  });

  it("apps/mobile não importa admin client", () => {
    const layout = read("apps/mobile/app/(app)/_layout.tsx");
    assert.doesNotMatch(layout, /createAdminClient/);
    assert.doesNotMatch(layout, /SUPABASE_SERVICE_ROLE/);
  });
});

describe("33.1 idempotency persistente em production", () => {
  it("helper falha fechado em production sem service role", () => {
    const src = read("lib/finance/persistent-idempotency.ts");
    assert.match(src, /createIdempotencySupabaseAdapter/);
    assert.match(src, /isProductionRuntime/);
    assert.match(src, /service role ausente/);
    assert.match(src, /ALLOW_IMPORT_MEMORY/);
  });

  it("actions financeiras usam helper persistente", () => {
    const src = read("lib/finance/actions.ts");
    assert.match(src, /resolvePersistentIdempotency/);
    assert.doesNotMatch(src, /createMemoryIdempotencyRepository/);
  });
});
