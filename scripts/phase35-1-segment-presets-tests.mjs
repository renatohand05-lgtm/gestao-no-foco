#!/usr/bin/env node
/**
 * Sprint 35.1 — Presets por segmento + override tenant + adapter de UI.
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

const ENGINE = { segmentVersion: 1 };

describe("35.1 evidência e contratos de segurança", () => {
  it("evidência, docs e UI de override existem", () => {
    assert.ok(existsSync(join(root, "docs/testing/evidence/35-1/REPORT.md")));
    assert.ok(existsSync(join(root, "docs/product/SEGMENT_ARCHITECTURE.md")));
    assert.match(
      read("app/(app)/[tenant]/configuracoes/modulos/page.tsx"),
      /Personalizar experiência/,
    );
    assert.match(read("lib/segments/overrides.ts"), /resetSegmentConfig/);
  });

  it("actions exigem RBAC e não fazem DELETE nem tocam billing", () => {
    const actions = read("lib/segments/actions.ts");
    assert.match(actions, /requireTenantMutationPermission/);
    assert.match(actions, /configuracoes\.editar/);
    assert.doesNotMatch(actions, /\bDELETE FROM\b/);
    assert.doesNotMatch(actions, /asaas/i);
  });
});

describe("35.1 oficina", () => {
  it("oficina liga OS, mecânicos, veículos e tributário", async () => {
    const { resolveSegmentContext, hasCapability } = await load(
      "lib/segments/resolve.ts",
    );
    const { getSegmentUiCopy } = await load("lib/segments/copy.ts");
    const oficina = resolveSegmentContext({ segment: "oficina", ...ENGINE });
    assert.equal(hasCapability(oficina, "work_orders"), true);
    assert.equal(hasCapability(oficina, "workshop_mechanics"), true);
    assert.equal(hasCapability(oficina, "vehicles"), true);
    assert.equal(hasCapability(oficina, "crm"), true);
    assert.equal(hasCapability(oficina, "tax"), true);
    assert.equal(oficina.terminology.professionals, "Mecânicos");
    const ui = getSegmentUiCopy({ segment: "oficina", ...ENGINE });
    assert.equal(ui.professionalsListPath, "/oficina/mecanicos");
    assert.equal(ui.newWorkOrder, "Nova OS");
    assert.equal(ui.assigneeLabel, "Mecânico");
    assert.equal(ui.automotiveSpecialties, true);
  });
});

describe("35.1 consultoria", () => {
  it("consultoria esconde veículos, mecânicos, estoque, compras e OS", async () => {
    const { resolveSegmentContext, hasCapability } = await load(
      "lib/segments/resolve.ts",
    );
    const { isNavItemRelevant } = await load("lib/segments/nav.ts");
    const consultoria = resolveSegmentContext({
      segment: "consultoria",
      ...ENGINE,
    });
    assert.equal(hasCapability(consultoria, "vehicles"), false);
    assert.equal(hasCapability(consultoria, "workshop_mechanics"), false);
    assert.equal(hasCapability(consultoria, "inventory"), false);
    assert.equal(hasCapability(consultoria, "purchases"), false);
    assert.equal(hasCapability(consultoria, "work_orders"), false);
    assert.equal(hasCapability(consultoria, "crm"), true);
    assert.equal(consultoria.terminology.catalog, "Serviços");
    assert.equal(isNavItemRelevant("mechanics", consultoria), false);
    assert.equal(isNavItemRelevant("inventory", consultoria), false);
    assert.equal(isNavItemRelevant("products", consultoria), true);
  });
});

describe("35.1 barbearia", () => {
  it("barbearia usa Barbeiros, rota /profissionais e não vaza Mecânico na copy", async () => {
    const { resolveSegmentContext, hasCapability } = await load(
      "lib/segments/resolve.ts",
    );
    const { isNavItemRelevant } = await load("lib/segments/nav.ts");
    const { getSegmentUiCopy } = await load("lib/segments/copy.ts");
    const barbearia = resolveSegmentContext({
      segment: "barbearia",
      ...ENGINE,
    });
    assert.equal(barbearia.terminology.professionals, "Barbeiros");
    assert.equal(barbearia.terminology.professional, "Barbeiro");
    assert.equal(isNavItemRelevant("mechanics", barbearia), true);
    assert.equal(isNavItemRelevant("work-orders", barbearia), false);
    assert.equal(hasCapability(barbearia, "appointments"), true);
    assert.equal(hasCapability(barbearia, "professionals"), true);
    const ui = getSegmentUiCopy({ segment: "barbearia", ...ENGINE });
    assert.equal(ui.professionalsListPath, "/profissionais");
    assert.equal(ui.professionals, "Barbeiros");
    assert.equal(ui.assigneeLabel, "Barbeiro");
    assert.doesNotMatch(ui.newProfessional, /mec[aâ]nico/i);
    assert.doesNotMatch(ui.professionalsDescription, /oficina/i);
    assert.equal(ui.automotiveSpecialties, false);
    assert.equal(ui.professionalsParentLabel, "Equipe");
  });

  it("páginas de profissionais existem e redirecionam oficina↔profissionais", () => {
    assert.ok(
      existsSync(join(root, "app/(app)/[tenant]/profissionais/page.tsx")),
    );
    assert.ok(
      existsSync(join(root, "app/(app)/[tenant]/profissionais/[id]/page.tsx")),
    );
    const list = read("components/mecanicos/professionals-list-screen.tsx");
    assert.match(list, /redirect\(`\/\$\{tenantSlug\}\/profissionais`\)/);
    assert.match(list, /redirect\(`\/\$\{tenantSlug\}\/oficina\/mecanicos`\)/);
    assert.doesNotMatch(list, /Novo mecânico/);
    const nav = read("config/navigation.ts");
    assert.match(nav, /ui\.professionalsListPath/);
    const caps = read("lib/segments/capabilities.ts");
    assert.match(caps, /id: "professionals"[\s\S]*href: "\/profissionais"/);
  });
});

describe("35.1 lava-rápido", () => {
  it("lava-rápido liga work_orders e usa copy de Atendimentos", async () => {
    const { resolveSegmentContext, hasCapability } = await load(
      "lib/segments/resolve.ts",
    );
    const { isNavItemRelevant } = await load("lib/segments/nav.ts");
    const { getSegmentUiCopy } = await load("lib/segments/copy.ts");
    const lava = resolveSegmentContext({
      segment: "lava_rapido",
      ...ENGINE,
    });
    assert.equal(hasCapability(lava, "vehicles"), true);
    assert.equal(hasCapability(lava, "work_orders"), true);
    assert.equal(hasCapability(lava, "service_checklist"), true);
    assert.equal(isNavItemRelevant("work-orders", lava), true);
    assert.equal(lava.terminology.workOrder, "Atendimento");
    const ui = getSegmentUiCopy({ segment: "lava_rapido", ...ENGINE });
    assert.equal(ui.workOrders, "Atendimentos");
    assert.equal(ui.newWorkOrder, "Novo atendimento");
    assert.equal(ui.openWorkOrdersLabel, "Atendimentos abertos");
    assert.equal(ui.inProgressWorkOrdersLabel, "Atendimentos em andamento");
    assert.equal(
      ui.estimatedInProgressHint,
      "Valor estimado dos atendimentos em andamento.",
    );
    assert.doesNotMatch(ui.openWorkOrdersLabel, /\bOS\b/);
    assert.doesNotMatch(ui.newWorkOrder, /Nova OS/);
    assert.doesNotMatch(ui.workOrdersHubTitle, /Ordem de Serviço/);
    assert.equal(ui.professionalsListPath, "/profissionais");
    assert.equal(ui.workOrderDetailTitle(12), "Atendimento #12");
  });
});

describe("35.1 estética e odontologia", () => {
  it("clínica estética usa procedimentos e não liga prontuário", async () => {
    const { resolveSegmentContext, hasCapability } = await load(
      "lib/segments/resolve.ts",
    );
    const estetica = resolveSegmentContext({
      segment: "clinica_estetica",
      ...ENGINE,
    });
    assert.equal(hasCapability(estetica, "patient_records"), false);
    assert.equal(estetica.terminology.catalog.includes("Procedimento"), true);
  });

  it("consultório odontológico usa Pacientes e não liga plano clínico", async () => {
    const { resolveSegmentContext, hasCapability } = await load(
      "lib/segments/resolve.ts",
    );
    const odonto = resolveSegmentContext({
      segment: "consultorio_odontologico",
      ...ENGINE,
    });
    assert.equal(odonto.terminology.customers, "Pacientes");
    assert.equal(hasCapability(odonto, "treatment_plans"), false);
    assert.equal(hasCapability(odonto, "inventory"), false);
  });

  it("os 6 presets têm catálogo financeiro suficiente", async () => {
    const { PRODUCT_SEGMENT_IDS } = await load("lib/segments/types.ts");
    const { getSegmentProfile } = await load("lib/segments/profiles.ts");
    assert.equal(PRODUCT_SEGMENT_IDS.length, 6);
    for (const id of PRODUCT_SEGMENT_IDS) {
      const p = getSegmentProfile(id);
      assert.ok(p.financePresetIds.length >= 4, id);
    }
  });
});

describe("35.1 override enable/disable + reset + isolamento", () => {
  it("enable liga capability só no tenant com override", async () => {
    const { resolveSegmentContext, hasCapability } = await load(
      "lib/segments/resolve.ts",
    );
    const { setCapabilityOverride } = await load("lib/segments/overrides.ts");
    const { getSegmentProfile } = await load("lib/segments/profiles.ts");
    const preset = getSegmentProfile("consultoria").capabilities;
    const aCfg = setCapabilityOverride(preset, {}, "inventory", true);
    const a = resolveSegmentContext({
      segment: "consultoria",
      ...ENGINE,
      segmentConfig: aCfg,
    });
    const b = resolveSegmentContext({
      segment: "consultoria",
      ...ENGINE,
    });
    assert.equal(hasCapability(a, "inventory"), true);
    assert.equal(hasCapability(b, "inventory"), false);
  });

  it("disable esconde capability só no tenant com override", async () => {
    const { resolveSegmentContext, hasCapability } = await load(
      "lib/segments/resolve.ts",
    );
    const { setCapabilityOverride } = await load("lib/segments/overrides.ts");
    const { getSegmentProfile } = await load("lib/segments/profiles.ts");
    const preset = getSegmentProfile("consultoria").capabilities;
    const bCfg = setCapabilityOverride(preset, {}, "crm", false);
    const b = resolveSegmentContext({
      segment: "consultoria",
      ...ENGINE,
      segmentConfig: bCfg,
    });
    const a = resolveSegmentContext({
      segment: "consultoria",
      ...ENGINE,
    });
    assert.equal(hasCapability(b, "crm"), false);
    assert.equal(hasCapability(a, "crm"), true);
    assert.equal(hasCapability(b, "inventory"), false);
  });

  it("reset volta ao preset e troca de segmento pode preservar ou limpar", async () => {
    const { resolveSegmentContext, hasCapability } = await load(
      "lib/segments/resolve.ts",
    );
    const { setCapabilityOverride, resetSegmentConfig, configAfterSegmentChange } =
      await load("lib/segments/overrides.ts");
    const { getSegmentProfile } = await load("lib/segments/profiles.ts");
    const preset = getSegmentProfile("consultoria").capabilities;
    const aCfg = setCapabilityOverride(preset, {}, "inventory", true);
    const reset = resolveSegmentContext({
      segment: "consultoria",
      ...ENGINE,
      segmentConfig: resetSegmentConfig(),
    });
    assert.equal(hasCapability(reset, "inventory"), false);
    assert.equal(hasCapability(reset, "crm"), true);
    const preserved = configAfterSegmentChange(aCfg, "preserve");
    assert.ok(preserved.enabledCapabilities?.includes("inventory"));
    const cleared = configAfterSegmentChange(aCfg, "reset");
    assert.equal(Object.keys(cleared).length, 0);
  });

  it("future capability patient_records não liga pela UI mesmo com override", async () => {
    const { resolveSegmentContext, hasCapability } = await load(
      "lib/segments/resolve.ts",
    );
    const { setCapabilityOverride } = await load("lib/segments/overrides.ts");
    const { getSegmentProfile } = await load("lib/segments/profiles.ts");
    const preset = getSegmentProfile("clinica_estetica").capabilities;
    const blocked = setCapabilityOverride(preset, {}, "patient_records", true);
    const clinical = resolveSegmentContext({
      segment: "clinica_estetica",
      ...ENGINE,
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

describe("35.1 RBAC owner/admin vs member", () => {
  it("member não altera segment_config; owner/admin sim", () => {
    const actions = read("lib/segments/actions.ts");
    assert.match(actions, /requireTenantMutationPermission/);
    assert.doesNotMatch(
      actions,
      /if \(tenant\.role === "member"\) return actionOk/,
    );
    const form = read("components/configuracoes/segment-modules-form.tsx");
    assert.match(form, /canEdit/);
    assert.match(form, /Restaurar padrão do segmento/);
  });
});

describe("35.1 finance + mobile + dashboard", () => {
  it("presets 34.9 são priorizados sem duplicar", async () => {
    const {
      orderDespesaPresetsForSegment,
      financePresetsReuseCatalog,
      getFinancePresetsForSegment,
    } = await load("lib/segments/finance-presets.ts");
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
      ...ENGINE,
    });
    const oficina = resolveMobileModuleFlags({
      segment: "oficina",
      ...ENGINE,
    });
    const barbearia = resolveMobileModuleFlags({
      segment: "barbearia",
      ...ENGINE,
    });
    assert.equal(consultoria.stock, false);
    assert.equal(consultoria.crm, true);
    assert.equal(oficina.stock, true);
    assert.equal(barbearia.ops, true);
    assert.equal(
      isOpsActionRelevant("veiculos", {
        segment: "consultoria",
        ...ENGINE,
      }),
      false,
    );
    assert.equal(
      isOpsActionRelevant("veiculos", { segment: "oficina", ...ENGINE }),
      true,
    );
    assert.match(
      read("app/api/mobile/v1/memberships/route.ts"),
      /resolveMobileModuleFlags/,
    );
    assert.match(read("apps/mobile/app/(app)/_layout.tsx"), /hrefIfModule/);
  });

  it("dashboard web/mobile esconde OS, veículo e estoque incompatíveis", async () => {
    const { filterDashboardSurface, segmentDashboardFlags } = await load(
      "lib/segments/dashboard.ts",
    );
    const consultoria = { segment: "consultoria", ...ENGINE };
    const oficina = { segment: "oficina", ...ENGINE };
    const lava = { segment: "lava_rapido", ...ENGINE };
    const flagsC = segmentDashboardFlags(consultoria);
    const flagsO = segmentDashboardFlags(oficina);
    const flagsL = segmentDashboardFlags(lava);
    assert.equal(flagsC.workOrders, false);
    assert.equal(flagsC.inventory, false);
    assert.equal(flagsC.vehicles, false);
    assert.equal(flagsO.workOrders, true);
    assert.equal(flagsO.inventory, true);
    assert.equal(flagsL.workOrders, true);
    assert.equal(flagsL.vehicles, true);
    const items = [
      { id: "ordens" },
      { id: "estoque" },
      { id: "clientes" },
      { id: "nova-os" },
      { id: "novo-veiculo" },
    ];
    assert.deepEqual(
      filterDashboardSurface(items, consultoria).map((i) => i.id),
      ["clientes"],
    );
    assert.equal(filterDashboardSurface(items, oficina).length, 5);
    assert.equal(
      filterDashboardSurface(items, lava).map((i) => i.id).includes("nova-os"),
      true,
    );
    assert.match(
      read("lib/dashboard/cockpit-v2/kpis.ts"),
      /filterDashboardSurface/,
    );
  });
});

describe("35.1 copy sem vazamento na UI", () => {
  it("oficina mantém terminologia automotiva", async () => {
    const { getSegmentUiCopy } = await load("lib/segments/copy.ts");
    const ui = getSegmentUiCopy({ segment: "oficina", ...ENGINE });
    assert.equal(ui.openWorkOrdersLabel, "OS abertas");
    assert.equal(ui.estimatedInProgressHint, "Valor estimado das OS em andamento.");
    assert.equal(ui.assigneeLabel, "Mecânico");
    assert.equal(ui.professionals, "Mecânicos");
    assert.equal(ui.diagnosisLabel, "Em diagnóstico");
    assert.equal(ui.waitingPartsLabel, "Aguardando peças");
    assert.equal(ui.automotiveWorkflow, true);
    assert.match(ui.statusLabels.aguardando_diagnostico, /diagnóstico/i);
  });

  it("barbearia não recebe Mecânicos nem OS na copy visível", async () => {
    const { getSegmentUiCopy } = await load("lib/segments/copy.ts");
    const ui = getSegmentUiCopy({ segment: "barbearia", ...ENGINE });
    assert.equal(ui.professionals, "Barbeiros");
    assert.doesNotMatch(ui.professionals, /mec[aâ]nico/i);
    assert.doesNotMatch(ui.openWorkOrdersLabel, /\bOS\b/);
    assert.doesNotMatch(ui.estimatedInProgressHint, /\bOS\b/);
    assert.doesNotMatch(ui.diagnosisLabel, /diagnóstico/i);
    assert.doesNotMatch(ui.waitingPartsLabel, /peças/i);
    assert.equal(ui.showVehicles, false);
    assert.equal(ui.automotiveWorkflow, false);
  });

  it("lava-rápido usa Atendimentos no lugar de OS nos KPIs", async () => {
    const { getSegmentUiCopy } = await load("lib/segments/copy.ts");
    const ui = getSegmentUiCopy({ segment: "lava_rapido", ...ENGINE });
    assert.equal(ui.openWorkOrdersLabel, "Atendimentos abertos");
    assert.equal(
      ui.estimatedInProgressHint,
      "Valor estimado dos atendimentos em andamento.",
    );
    assert.doesNotMatch(ui.openWorkOrdersLabel, /\bOS\b/);
    assert.doesNotMatch(ui.centralKpisAria, /\bOS\b/);
    assert.doesNotMatch(ui.dashboardTitle, /\bOS\b/);
    assert.equal(ui.showVehicles, true);
    assert.equal(ui.automotiveWorkflow, false);
    assert.match(read("components/ordens/os-central-kpis.tsx"), /copy\?\.openWorkOrdersLabel/);
    assert.match(read("components/ordens/os-central-kpis.tsx"), /estimatedInProgressHint/);
    assert.doesNotMatch(ui.openFormSectionDescription, /\bOS\b|peças/i);
    assert.match(read("app/(app)/[tenant]/ordens/nova/page.tsx"), /openFormSectionDescription/);
    assert.match(
      read("lib/dashboard/premium-dashboard-map.ts"),
      /ui\.openWorkOrdersLabel/,
    );
    assert.match(
      read("components/ordens/os-workspace.tsx"),
      /uiCopy\?\.alreadyBilledMessage/,
    );
    assert.match(
      read("app/(app)/[tenant]/relatorios/page.tsx"),
      /hasCapability\(ctx, "work_orders"\)/,
    );
  });

  it("consultoria não recebe terminologia automotiva indevida", async () => {
    const { getSegmentUiCopy } = await load("lib/segments/copy.ts");
    const { isNavItemRelevant } = await load("lib/segments/nav.ts");
    const { resolveSegmentContext } = await load("lib/segments/resolve.ts");
    const ctx = resolveSegmentContext({ segment: "consultoria", ...ENGINE });
    const ui = getSegmentUiCopy(ctx);
    assert.equal(ui.professionals, "Consultores");
    assert.doesNotMatch(ui.openWorkOrdersLabel, /\bOS\b|mec[aâ]nico|oficina/i);
    assert.equal(ui.showVehicles, false);
    assert.equal(isNavItemRelevant("mechanics", ctx), false);
    assert.equal(isNavItemRelevant("work-orders", ctx), false);
    assert.doesNotMatch(ui.openFormSectionDescription, /placa|peças|oficina/i);
  });

  it("tenant legado preserva copy de oficina", async () => {
    const { getSegmentUiCopy } = await load("lib/segments/copy.ts");
    const legado = getSegmentUiCopy({
      segment: "consultoria",
      segmentVersion: null,
    });
    assert.equal(legado.engine, false);
    assert.equal(legado.openWorkOrdersLabel, "OS abertas");
    assert.equal(legado.professionalsListPath, "/oficina/mecanicos");
  });

  it("override não troca vocabulário do segmento", async () => {
    const { getSegmentUiCopy } = await load("lib/segments/copy.ts");
    const { setCapabilityOverride } = await load("lib/segments/overrides.ts");
    const { getSegmentProfile } = await load("lib/segments/profiles.ts");
    const preset = getSegmentProfile("consultoria").capabilities;
    const cfg = setCapabilityOverride(preset, {}, "work_orders", true);
    const ui = getSegmentUiCopy({
      segment: "consultoria",
      ...ENGINE,
      segmentConfig: cfg,
    });
    assert.doesNotMatch(ui.openWorkOrdersLabel, /\bOS\b/);
    assert.doesNotMatch(ui.professionals, /mec[aâ]nico/i);
  });

  it("navegação dos 6 segmentos respeita capabilities", async () => {
    const { PRODUCT_SEGMENT_IDS } = await load("lib/segments/types.ts");
    const { resolveSegmentContext, hasCapability } = await load(
      "lib/segments/resolve.ts",
    );
    const { isNavItemRelevant } = await load("lib/segments/nav.ts");
    for (const id of PRODUCT_SEGMENT_IDS) {
      const ctx = resolveSegmentContext({ segment: id, ...ENGINE });
      assert.equal(
        isNavItemRelevant("work-orders", ctx),
        hasCapability(ctx, "work_orders"),
        id,
      );
      assert.equal(
        isNavItemRelevant("inventory", ctx),
        hasCapability(ctx, "inventory"),
        id,
      );
    }
  });
});
