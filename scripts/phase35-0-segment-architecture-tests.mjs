#!/usr/bin/env node
/**
 * Sprint 35.0 — Arquitetura de segmentação do produto.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const load = (rel) =>
  import(pathToFileURL(join(root, rel)).href + `?t=${Date.now()}`);

describe("35.0 schema + docs", () => {
  it("migration aditiva de segment_version/config sem DELETE", () => {
    const path =
      "supabase/migrations/20260830_phase35_0_tenant_segment_config.sql";
    assert.ok(existsSync(join(root, path)));
    const sql = read(path);
    assert.match(sql, /segment_version/);
    assert.match(sql, /segment_config/);
    assert.match(sql, /add column if not exists/);
    assert.ok(!/\bDELETE FROM\b/i.test(sql));
    assert.ok(!/\bDROP TABLE\b/i.test(sql));
  });

  it("documentação de arquitetura e evidência", () => {
    assert.ok(existsSync(join(root, "docs/product/SEGMENT_ARCHITECTURE.md")));
    assert.ok(existsSync(join(root, "docs/testing/evidence/35-0/REPORT.md")));
    const arch = read("docs/product/SEGMENT_ARCHITECTURE.md");
    assert.match(arch, /capability/i);
    assert.match(arch, /override/i);
    assert.match(arch, /RBAC/);
  });

  it("não toca billing", () => {
    const eng = read("lib/segments/resolve.ts");
    assert.doesNotMatch(eng, /asaas/i);
  });
});

describe("35.0 resolver + capabilities", () => {
  it("tenant sem segmento = legado (engine off, não esconde módulos)", async () => {
    const { resolveSegmentContext, hasCapability } = await load(
      "lib/segments/resolve.ts",
    );
    const ctx = resolveSegmentContext({ segment: null });
    assert.equal(ctx.legacy, true);
    assert.equal(ctx.usesCapabilityEngine, false);
    assert.equal(ctx.productSegment, null);
    assert.equal(hasCapability(ctx, "workshop_mechanics"), true);
  });

  it("os 6 segmentos têm perfil e capabilities distintas", async () => {
    const { PRODUCT_SEGMENT_IDS } = await load("lib/segments/types.ts");
    const { getSegmentProfile } = await load("lib/segments/profiles.ts");
    const { resolveSegmentContext, hasCapability } = await load(
      "lib/segments/resolve.ts",
    );

    assert.equal(PRODUCT_SEGMENT_IDS.length, 6);

    for (const id of PRODUCT_SEGMENT_IDS) {
      const p = getSegmentProfile(id);
      assert.ok(p.capabilities.length >= 4, id);
      assert.ok(p.financePresetIds.length >= 4, id);
      assert.ok(p.terminology.customer);
    }

    const oficina = resolveSegmentContext({
      segment: "oficina",
      segmentVersion: 1,
    });
    const consultoria = resolveSegmentContext({
      segment: "consultoria",
      segmentVersion: 1,
    });
    const barbearia = resolveSegmentContext({
      segment: "barbearia",
      segmentVersion: 1,
    });
    const lava = resolveSegmentContext({
      segment: "lava_rapido",
      segmentVersion: 1,
    });
    const estetica = resolveSegmentContext({
      segment: "clinica_estetica",
      segmentVersion: 1,
    });
    const odonto = resolveSegmentContext({
      segment: "consultorio_odontologico",
      segmentVersion: 1,
    });

    assert.equal(hasCapability(oficina, "vehicles"), true);
    assert.equal(hasCapability(oficina, "workshop_mechanics"), true);
    assert.equal(hasCapability(consultoria, "vehicles"), false);
    assert.equal(hasCapability(consultoria, "workshop_mechanics"), false);
    assert.equal(hasCapability(consultoria, "crm"), true);
    assert.equal(hasCapability(barbearia, "appointments"), true);
    assert.equal(hasCapability(barbearia, "vehicles"), false);
    assert.equal(hasCapability(lava, "vehicles"), true);
    assert.equal(hasCapability(lava, "workshop_mechanics"), false);
    assert.equal(hasCapability(estetica, "patient_records"), false);
    assert.equal(hasCapability(odonto, "treatment_plans"), false);
    assert.equal(odonto.terminology.customers, "Pacientes");
  });

  it("consultoria legado (sem version) não muda UX até escolha explícita", async () => {
    const { resolveSegmentContext, hasCapability } = await load(
      "lib/segments/resolve.ts",
    );
    const ctx = resolveSegmentContext({
      segment: "consultoria",
      segmentVersion: null,
    });
    assert.equal(ctx.usesCapabilityEngine, false);
    assert.equal(hasCapability(ctx, "workshop_mechanics"), true);
  });

  it("overrides do tenant ligam/desligam sem cruzar tenants", async () => {
    const { resolveSegmentContext, hasCapability } = await load(
      "lib/segments/resolve.ts",
    );
    const a = resolveSegmentContext({
      segment: "consultoria",
      segmentVersion: 1,
      segmentConfig: { enabledCapabilities: ["inventory"] },
    });
    const b = resolveSegmentContext({
      segment: "consultoria",
      segmentVersion: 1,
      segmentConfig: { disabledCapabilities: ["crm"] },
    });
    assert.equal(hasCapability(a, "inventory"), true);
    assert.equal(hasCapability(b, "inventory"), false);
    assert.equal(hasCapability(b, "crm"), false);
    assert.equal(hasCapability(a, "crm"), true);
  });
});

describe("35.0 navegação + RBAC + onboarding", () => {
  it("sidebar combina capabilities e RBAC (contratos)", async () => {
    const { resolveSegmentContext } = await load("lib/segments/resolve.ts");
    const { filterNavByCapabilities, isNavItemRelevant } = await load(
      "lib/segments/nav.ts",
    );
    const items = [
      { id: "mechanics" },
      { id: "finance" },
      { id: "inventory" },
      { id: "settings" },
      { id: "clients" },
    ];
    const consultoria = resolveSegmentContext({
      segment: "consultoria",
      segmentVersion: 1,
    });
    const filtered = filterNavByCapabilities(items, consultoria);
    assert.ok(!filtered.some((i) => i.id === "mechanics"));
    assert.ok(!filtered.some((i) => i.id === "inventory"));
    assert.ok(filtered.some((i) => i.id === "finance"));
    assert.ok(filtered.some((i) => i.id === "settings"));
    assert.equal(isNavItemRelevant("mechanics", consultoria), false);

    const barbearia = resolveSegmentContext({
      segment: "barbearia",
      segmentVersion: 1,
    });
    assert.equal(isNavItemRelevant("mechanics", barbearia), true);
    assert.equal(isNavItemRelevant("inventory", barbearia), true);
    assert.equal(isNavItemRelevant("work-orders", barbearia), false);

    const legado = resolveSegmentContext({ segment: null });
    assert.equal(filterNavByCapabilities(items, legado).length, items.length);
  });

  it("RBAC continua autoridade — capability não concede permissão", () => {
    const nav = read("config/navigation.ts");
    assert.match(nav, /filterNavByCapabilities/);
    assert.match(nav, /requiredAnyPermissions/);
    const sidebar = read("components/layout/app-sidebar.tsx");
    assert.match(sidebar, /filterNavByPermissions/);
    assert.match(sidebar, /segment_version/);
  });

  it("onboarding lista os 6 segmentos", async () => {
    const { PRODUCT_ONBOARDING_SEGMENT_IDS, listProductOnboardingSegments } =
      await load("config/onboarding/segments.ts");
    assert.deepEqual([...PRODUCT_ONBOARDING_SEGMENT_IDS], [
      "oficina",
      "barbearia",
      "lava_rapido",
      "consultoria",
      "clinica_estetica",
      "consultorio_odontologico",
    ]);
    assert.equal(listProductOnboardingSegments().length, 6);
    const form = read("components/onboarding/onboarding-form.tsx");
    assert.match(form, /tipo de negócio/);
    assert.match(form, /listProductOnboardingSegments/);
    const picker = read(
      "components/onboarding/enterprise/segment-picker.tsx",
    );
    assert.match(picker, /listProductOnboardingSegments/);
    const actions = read("lib/onboarding/enterprise/actions.ts");
    assert.match(actions, /SEGMENT_ENGINE_VERSION/);
    assert.doesNotMatch(actions, /toNavSegmentId/);
  });
});

describe("35.0 financeiro + isolamento", () => {
  it("presets reutilizam catálogo 34.9 sem duplicar", async () => {
    const { getFinancePresetsForSegment, financePresetsReuseCatalog } =
      await load("lib/segments/finance-presets.ts");
    const { PRODUCT_SEGMENT_IDS } = await load("lib/segments/types.ts");
    for (const id of PRODUCT_SEGMENT_IDS) {
      const ids = getFinancePresetsForSegment(id);
      assert.ok(ids.length >= 4, id);
      assert.equal(new Set(ids).size, ids.length, `${id} unique`);
      assert.equal(financePresetsReuseCatalog(ids), true, id);
    }
    assert.ok(getFinancePresetsForSegment("barbearia").includes("comissoes"));
    assert.ok(getFinancePresetsForSegment("consultoria").includes("prolabore"));
    assert.ok(getFinancePresetsForSegment("oficina").includes("frete"));
  });

  it("resolver é puro por tenant — sem catálogo compartilhado", async () => {
    const { resolveSegmentContext } = await load("lib/segments/resolve.ts");
    const t1 = resolveSegmentContext({
      segment: "barbearia",
      segmentVersion: 1,
    });
    const t2 = resolveSegmentContext({
      segment: "oficina",
      segmentVersion: 1,
    });
    assert.notEqual(t1.productSegment, t2.productSegment);
    assert.equal(t1.storedSegment, "barbearia");
    assert.equal(t2.storedSegment, "oficina");
  });
});

describe("35.0 mobile + contracts extras", () => {
  it("mobile continua tenant-safe com segment nulo e sem if espalhado", async () => {
    const { resolveSegmentContext, hasCapability } = await load(
      "lib/segments/resolve.ts",
    );
    const memberships = read("app/api/mobile/v1/memberships/route.ts");
    const mobileApi = read("apps/mobile/src/api/mobile-api.ts");
    const store = read("apps/mobile/src/tenant/context-store.ts");
    assert.match(memberships, /segmentId:\s*tenant\.segment/);
    assert.match(mobileApi, /segmentId:\s*string\s*\|\s*null/);
    assert.match(mobileApi, /segment:\s*string\s*\|\s*null/);
    assert.match(store, /segmentId:\s*SegmentId\s*\|\s*null/);
    const src = `${read("apps/mobile/src/api/mobile-api.ts")}\n${read("apps/mobile/src/tenant/context-store.ts")}\n${read("apps/mobile/app/(auth)/tenant.tsx")}`;
    assert.doesNotMatch(src, /if\s*\(\s*segment\s*===\s*['"]oficina['"]/);
    const legado = resolveSegmentContext({ segment: null });
    assert.equal(legado.legacy, true);
    assert.equal(hasCapability(legado, "inventory"), true);
  });
});
