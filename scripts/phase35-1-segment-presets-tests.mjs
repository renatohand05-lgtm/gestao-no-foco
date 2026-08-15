#!/usr/bin/env node
/**
 * Sprint 35.1 — Presets por segmento + override tenant + reset.
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

describe("35.1 contratos", () => {
  it("evidência e docs existem; billing intacto; sem DELETE em override", () => {
    assert.ok(existsSync(join(root, "docs/testing/evidence/35-1/REPORT.md")));
    assert.ok(existsSync(join(root, "docs/product/SEGMENT_ARCHITECTURE.md")));
    const actions = read("lib/segments/actions.ts");
    assert.match(actions, /requireTenantMutationPermission/);
    assert.match(actions, /configuracoes\.editar/);
    assert.doesNotMatch(actions, /\bDELETE FROM\b/);
    assert.doesNotMatch(actions, /asaas/i);
    assert.match(read("lib/segments/overrides.ts"), /resetSegmentConfig/);
    assert.match(read("app/(app)/[tenant]/configuracoes/modulos/page.tsx"), /Personalizar experiência/);
  });
});

describe("35.1 presets + labels", () => {
  it("os 6 presets cobrem o combinado nav/labels", async () => {
    const { PRODUCT_SEGMENT_IDS } = await load("lib/segments/types.ts");
    const { getSegmentProfile } = await load("lib/segments/profiles.ts");
    const { resolveSegmentContext, hasCapability } = await load(
      "lib/segments/resolve.ts",
    );
    const { isNavItemRelevant } = await load("lib/segments/nav.ts");
    assert.equal(PRODUCT_SEGMENT_IDS.length, 6);

    const oficina = resolveSegmentContext({
      segment: "oficina",
      segmentVersion: 1,
    });
    assert.equal(hasCapability(oficina, "work_orders"), true);
    assert.equal(hasCapability(oficina, "crm"), true);
    assert.equal(hasCapability(oficina, "tax"), true);
    assert.equal(oficina.terminology.professionals, "Mecânicos");

    const consultoria = resolveSegmentContext({
      segment: "consultoria",
      segmentVersion: 1,
    });
    assert.equal(hasCapability(consultoria, "vehicles"), false);
    assert.equal(hasCapability(consultoria, "workshop_mechanics"), false);
    assert.equal(hasCapability(consultoria, "inventory"), false);
    assert.equal(hasCapability(consultoria, "purchases"), false);
    assert.equal(hasCapability(consultoria, "crm"), true);
    assert.equal(consultoria.terminology.catalog, "Serviços");
    assert.equal(isNavItemRelevant("mechanics", consultoria), false);
    assert.equal(isNavItemRelevant("inventory", consultoria), false);
    assert.equal(isNavItemRelevant("products", consultoria), true);

    const barbearia = resolveSegmentContext({
      segment: "barbearia",
      segmentVersion: 1,
    });
    assert.equal(barbearia.terminology.professionals, "Barbeiros");
    assert.equal(isNavItemRelevant("mechanics", barbearia), true);
    assert.equal(isNavItemRelevant("work-orders", barbearia), false);
    assert.equal(hasCapability(barbearia, "appointments"), true);

    const lava = resolveSegmentContext({
      segment: "lava_rapido",
      segmentVersion: 1,
    });
    assert.equal(hasCapability(lava, "vehicles"), true);
    assert.equal(hasCapability(lava, "work_orders"), false);
    assert.equal(lava.terminology.workOrder, "Atendimento");

    const estetica = resolveSegmentContext({
      segment: "clinica_estetica",
      segmentVersion: 1,
    });
    assert.equal(hasCapability(estetica, "patient_records"), false);
    assert.equal(estetica.terminology.catalog.includes("Procedimento"), true);

    const odonto = resolveSegmentContext({
      segment: "consultorio_odontologico",
      segmentVersion: 1,
    });
    assert.equal(odonto.terminology.customers, "Pacientes");
    assert.equal(hasCapability(odonto, "treatment_plans"), false);
    assert.equal(hasCapability(odonto, "inventory"), false);

    for (const id of PRODUCT_SEGMENT_IDS) {
      const p = getSegmentProfile(id);
      assert.ok(p.financePresetIds.length >= 4, id);
    }
  });
});

describe("35.1 override + reset + isolamento", () => {
  it("enable/disable/reset não cruzam tenants e não apagam dados", async () => {
    const { resolveSegmentContext, hasCapability } = await load(
      "lib/segments/resolve.ts",
    );
    const { setCapabilityOverride, resetSegmentConfig, configAfterSegmentChange } =
      await load("lib/segments/overrides.ts");
    const { getSegmentProfile } = await load("lib/segments/profiles.ts");

    const preset = getSegmentProfile("consultoria").capabilities;
    const aCfg = setCapabilityOverride(preset, {}, "inventory", true);
    const bCfg = setCapabilityOverride(preset, {}, "crm", false);

    const a = resolveSegmentContext({
      segment: "consultoria",
      segmentVersion: 1,
      segmentConfig: aCfg,
    });
    const b = resolveSegmentContext({
      segment: "consultoria",
      segmentVersion: 1,
      segmentConfig: bCfg,
    });
    assert.equal(hasCapability(a, "inventory"), true);
    assert.equal(hasCapability(b, "inventory"), false);
    assert.equal(hasCapability(b, "crm"), false);
    assert.equal(hasCapability(a, "crm"), true);

    const reset = resolveSegmentContext({
      segment: "consultoria",
      segmentVersion: 1,
      segmentConfig: resetSegmentConfig(),
    });
    assert.equal(hasCapability(reset, "inventory"), false);
    assert.equal(hasCapability(reset, "crm"), true);

    const preserved = configAfterSegmentChange(aCfg, "preserve");
    assert.ok(preserved.enabledCapabilities?.includes("inventory"));
    const cleared = configAfterSegmentChange(aCfg, "reset");
    assert.equal(Object.keys(cleared).length, 0);

    const blocked = setCapabilityOverride(preset, {}, "patient_records", true);
    const clinical = resolveSegmentContext({
      segment: "clinica_estetica",
      segmentVersion: 1,
      segmentConfig: blocked,
    });
    assert.equal(hasCapability(clinical, "patient_records"), false);
  });

  it("legacy permanece com engine off", async () => {
    const { resolveSegmentContext, hasCapability } = await load(
      "lib/segments/resolve.ts",
    );
    const legado = resolveSegmentContext({
      segment: "consultoria",
      segmentVersion: null,
    });
    assert.equal(legado.usesCapabilityEngine, false);
    assert.equal(hasCapability(legado, "workshop_mechanics"), true);
  });
});

describe("35.1 finance + mobile + rbac", () => {
  it("presets 34.9 priorizados sem duplicar", async () => {
    const { orderDespesaPresetsForSegment, financePresetsReuseCatalog, getFinancePresetsForSegment } =
      await load("lib/segments/finance-presets.ts");
    const { PRODUCT_SEGMENT_IDS } = await load("lib/segments/types.ts");
    for (const id of PRODUCT_SEGMENT_IDS) {
      const ids = getFinancePresetsForSegment(id);
      assert.equal(financePresetsReuseCatalog(ids), true, id);
      const ordered = orderDespesaPresetsForSegment(id);
      assert.equal(ordered[0].id, ids[0], id);
      assert.equal(new Set(ordered.map((p) => p.id)).size, ordered.length);
    }
    assert.equal(getFinancePresetsForSegment("consultoria")[0], "prolabore");
    assert.equal(getFinancePresetsForSegment("oficina")[0], "salarios");
  });

  it("mobile esconde estoque em consultoria e mantém em oficina", async () => {
    const { resolveMobileModuleFlags, isOpsActionRelevant } = await load(
      "lib/segments/mobile-tabs.ts",
    );
    const consultoria = resolveMobileModuleFlags({
      segment: "consultoria",
      segmentVersion: 1,
    });
    const oficina = resolveMobileModuleFlags({
      segment: "oficina",
      segmentVersion: 1,
    });
    const barbearia = resolveMobileModuleFlags({
      segment: "barbearia",
      segmentVersion: 1,
    });
    assert.equal(consultoria.stock, false);
    assert.equal(consultoria.crm, true);
    assert.equal(oficina.stock, true);
    assert.equal(barbearia.ops, true);
    assert.equal(
      isOpsActionRelevant("veiculos", {
        segment: "consultoria",
        segmentVersion: 1,
      }),
      false,
    );
    assert.equal(
      isOpsActionRelevant("veiculos", { segment: "oficina", segmentVersion: 1 }),
      true,
    );
    const memberships = read("app/api/mobile/v1/memberships/route.ts");
    assert.match(memberships, /resolveMobileModuleFlags/);
    const layout = read("apps/mobile/app/(app)/_layout.tsx");
    assert.match(layout, /hrefIfModule/);
  });

  it("member não altera segment_config; owner/admin sim (contrato)", () => {
    const actions = read("lib/segments/actions.ts");
    assert.match(actions, /requireTenantMutationPermission/);
    assert.doesNotMatch(actions, /if \(tenant\.role === "member"\) return actionOk/);
    const form = read("components/configuracoes/segment-modules-form.tsx");
    assert.match(form, /canEdit/);
    assert.match(form, /Restaurar padrão do segmento/);
  });

  it("dashboard web/mobile esconde OS/estoque incompatíveis", async () => {
    const { filterDashboardSurface, segmentDashboardFlags } = await load(
      "lib/segments/dashboard.ts",
    );
    const consultoria = {
      segment: "consultoria",
      segmentVersion: 1,
    };
    const oficina = { segment: "oficina", segmentVersion: 1 };
    const flagsC = segmentDashboardFlags(consultoria);
    const flagsO = segmentDashboardFlags(oficina);
    assert.equal(flagsC.workOrders, false);
    assert.equal(flagsC.inventory, false);
    assert.equal(flagsO.workOrders, true);
    assert.equal(flagsO.inventory, true);
    const items = [{ id: "ordens" }, { id: "estoque" }, { id: "clientes" }];
    assert.deepEqual(
      filterDashboardSurface(items, consultoria).map((i) => i.id),
      ["clientes"],
    );
    assert.equal(filterDashboardSurface(items, oficina).length, 3);
    const kpis = read("lib/dashboard/cockpit-v2/kpis.ts");
    assert.match(kpis, /filterDashboardSurface/);
    const layout = read("apps/mobile/app/(app)/_layout.tsx");
    assert.match(layout, /hrefIfModule/);
  });
});
