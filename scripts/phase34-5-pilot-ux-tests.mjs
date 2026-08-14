#!/usr/bin/env node
/**
 * Sprint 34.5 — UX primeiro uso + isolamento de mocks + prontidão de piloto.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

describe("34.5 mocks not presented as live product", () => {
  it("Integrações: landing honesta + nav aponta importação", () => {
    const page = read("app/(app)/[tenant]/integracoes/page.tsx");
    assert.match(page, /ComingSoonPanel/);
    assert.match(page, /Em breve|em breve/i);
    assert.ok(!page.includes("IntegrationHubView"));
    assert.ok(!page.includes("Webhook Center · mock"));
    assert.ok(!page.includes("Erros (mock DLQ)"));

    const nav = read("config/navigation.ts");
    assert.match(nav, /id:\s*"integrations"/);
    assert.match(nav, /\/integracoes\/importar/);
    assert.match(nav, /Importação de arquivos/);
  });

  it("Automações: ocultas no menu e página Em breve", () => {
    const nav = read("config/navigation.ts");
    assert.match(nav, /PILOT_HIDDEN_IDS/);
    assert.match(nav, /"automacoes"/);
    assert.match(nav, /PILOT_HIDDEN_IDS\.has\(item\.id\)/);

    const page = read("app/(app)/[tenant]/automacoes/page.tsx");
    assert.match(page, /ComingSoonPanel|coming-soon/);
    assert.ok(!page.includes("AutomacoesCentral"));
  });

  it("não semeia regras demo de automações", () => {
    const svc = read("lib/automacoes/service.ts");
    assert.ok(!svc.includes("seedDemoRules("));
  });

  it("header não exibe sino de notificações falso", () => {
    const header = read("components/layout/app-header.tsx");
    assert.ok(!header.includes("aria-label=\"Notificações\""));
    assert.ok(!/\bBell\b/.test(header));
  });

  it("dashboard canal sem copy técnica/mock", () => {
    const src = read("components/dashboard/comercial/comercial-channel-section.tsx");
    assert.ok(!src.includes("tem_canal=false"));
    assert.ok(!src.includes("share_modo=indisponivel"));
    assert.ok(!src.includes("sem mock e sem migration"));
    assert.match(src, /sem inventar números/);
  });

  it("configurações sem Design System e copy de negócio", () => {
    const page = read("app/(app)/[tenant]/configuracoes/page.tsx");
    assert.ok(!page.includes("Abrir Design System"));
    assert.ok(!page.includes(">Slug:<"));
    assert.match(page, /Identificador/);
    assert.ok(!page.includes("(tenant)"));
    assert.ok(!page.includes("(RBAC)"));
  });
});

describe("34.5 first-use / onboarding / empty states", () => {
  it("onboarding resume no dashboard existe", () => {
    assert.ok(existsSync(join(root, "components/onboarding/onboarding-resume-card.tsx")));
    assert.ok(existsSync(join(root, "components/onboarding/dashboard-onboarding-lead.tsx")));
    const card = read("components/onboarding/onboarding-resume-card.tsx");
    assert.match(card, /Continuar/);
    assert.match(card, /Configuração inicial/);
  });

  it("empty states principais têm CTA", () => {
    for (const file of [
      "components/clientes/cliente-empty-state.tsx",
      "components/produtos/produto-empty-state.tsx",
      "components/vendas/venda-empty-state.tsx",
      "components/estoque/estoque-empty-state.tsx",
    ]) {
      const src = read(file);
      assert.match(src, /EmptyState/);
      assert.match(src, /action=\{/);
      assert.match(src, /href:/);
    }
  });

  it("ComingSoonPanel reutilizável", () => {
    assert.ok(existsSync(join(root, "components/pilot/coming-soon-panel.tsx")));
    assert.ok(existsSync(join(root, "lib/pilot/readiness.ts")));
  });
});

describe("34.5 tenant clean start + rbac ui contract", () => {
  it("createTenant não semeia demo data", () => {
    const create = read("lib/onboarding/create-tenant.ts");
    assert.ok(!/seedDemo|demo data|dados de demonstração/i.test(create));
  });

  it("sidebar ainda filtra por permissões", () => {
    const sidebar = read("components/layout/app-sidebar.tsx");
    assert.match(sidebar, /filterNavByPermissions/);
  });
});

describe("34.5 billing freeze", () => {
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
});

describe("34.5 evidence", () => {
  it("REPORT 34-5 presente", () => {
    assert.ok(existsSync(join(root, "docs/testing/evidence/34-5/REPORT.md")));
  });
});
