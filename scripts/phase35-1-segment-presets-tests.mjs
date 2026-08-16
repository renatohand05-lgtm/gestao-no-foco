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
    assert.equal(legado.workspaceLoadingAria, "Carregando workspace da OS");
  });

  it("skeleton do workspace usa copy do adapter", async () => {
    const { getSegmentUiCopy } = await load("lib/segments/copy.ts");
    const lava = getSegmentUiCopy({ segment: "lava_rapido", ...ENGINE });
    const oficina = getSegmentUiCopy({ segment: "oficina", ...ENGINE });
    assert.equal(lava.workspaceLoadingAria, "Carregando atendimento");
    assert.doesNotMatch(lava.workspaceLoadingAria, /\bOS\b/);
    assert.match(oficina.workspaceLoadingAria, /\bOS\b/);
    const lazy = read("components/ordens/os-workspace-lazy.tsx");
    assert.match(lazy, /workspaceLoadingAria/);
    assert.doesNotMatch(
      lazy.replace(/workspaceLoadingAria[\s\S]{0,80}/, ""),
      /aria-label="Carregando workspace da OS"/,
    );
  });

  it("importação de OS some quando work_orders está OFF", async () => {
    const hub = read("app/(app)/[tenant]/integracoes/importar/page.tsx");
    assert.match(hub, /hasCapability\(ctx, "work_orders"\)/);
    assert.match(hub, /ui\.importModuleTitle/);
    const page = read("app/(app)/[tenant]/integracoes/importar/ordens/page.tsx");
    assert.match(page, /hasCapability\(ctx, "work_orders"\)/);
    assert.match(page, /notFound\(\)/);
    const { getSegmentUiCopy } = await load("lib/segments/copy.ts");
    const lava = getSegmentUiCopy({ segment: "lava_rapido", ...ENGINE });
    const consul = getSegmentUiCopy({ segment: "consultoria", ...ENGINE });
    assert.doesNotMatch(lava.importModuleTitle, /Ordem de Serviço|OS/);
    assert.equal(lava.importModuleTitle, "Atendimentos");
    assert.doesNotMatch(consul.importModuleTitle, /\bOS\b/);
  });

  it("matriz de módulos não vaza Mecânicos/OS para segmentos do motor", async () => {
    const { listSegmentModuleRows } = await load("lib/segments/matrix.ts");
    const { resolveSegmentContext } = await load("lib/segments/resolve.ts");
    for (const id of [
      "barbearia",
      "lava_rapido",
      "consultoria",
      "clinica_estetica",
      "consultorio_odontologico",
    ]) {
      const ctx = resolveSegmentContext({ segment: id, ...ENGINE });
      const rows = listSegmentModuleRows(ctx);
      for (const row of rows) {
        assert.doesNotMatch(row.module, /Mecânicos/, `${id} ${row.capability}`);
        assert.doesNotMatch(
          row.description,
          /equipe\/mecânicos|Equipe técnica da oficina|vinculado à OS existente/i,
          `${id} ${row.capability}`,
        );
      }
    }
    const oficinaRows = listSegmentModuleRows(
      resolveSegmentContext({ segment: "oficina", ...ENGINE }),
    );
    assert.ok(oficinaRows.some((r) => r.module === "Mecânicos"));
    assert.ok(oficinaRows.some((r) => r.module === "Ordens de serviço"));
  });

  it("estética e odontologia não usam OS na copy do motor", async () => {
    const { getSegmentUiCopy } = await load("lib/segments/copy.ts");
    const { isNavItemRelevant } = await load("lib/segments/nav.ts");
    const { resolveSegmentContext } = await load("lib/segments/resolve.ts");
    for (const id of ["clinica_estetica", "consultorio_odontologico"]) {
      const ctx = resolveSegmentContext({ segment: id, ...ENGINE });
      const ui = getSegmentUiCopy(ctx);
      assert.equal(isNavItemRelevant("work-orders", ctx), false, id);
      assert.doesNotMatch(ui.openWorkOrdersLabel, /\bOS\b/);
      assert.doesNotMatch(ui.professionals, /mec[aâ]nico/i);
      assert.equal(ui.automotiveWorkflow, false);
    }
  });

  it("onboarding 30.x visível no primeiro-acesso já tem copy por segmento", () => {
    assert.match(
      read("app/(app)/[tenant]/primeiro-acesso/page.tsx"),
      /EnterpriseOnboardingWizard/,
    );
    assert.doesNotMatch(
      read("app/(app)/[tenant]/primeiro-acesso/page.tsx"),
      /OnboardingTour/,
    );
    const setup = read("config/onboarding/segment-setup.ts");
    assert.match(setup, /lava_rapido:[\s\S]*Atendimentos/);
    assert.match(setup, /barbearia:[\s\S]*Barbeiros/);
    assert.match(setup, /consultoria:[\s\S]*Consultores/);
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

const AUTO_LEAK =
  /amortecedor|pastilha|óleo do motor|filtro de óleo|disco de freio|scanner automotivo|correia dentada|caixa de direção|peça mecânica|componente automotivo|matéria-prima industrial|quilometragem|\bcombustível\b|ordem de serviço/i;
const LAVA_MECHANICAL_LEAK =
  /diagnóstico de motor|diagnóstico mecânico|pastilha|peça mecânica|oficina \/ veículo|troca de óleo do motor|embreagem|correia dentada/i;

describe("35.1 segment service library", () => {
  it("biblioteca existe só no código e não mistura segmentos", async () => {
    const { ALL_SEGMENT_LIBRARIES, getSegmentServiceLibrary } = await load(
      "lib/segments/catalogs/index.ts",
    );
    const { PRODUCT_SEGMENT_IDS } = await load("lib/segments/types.ts");
    const ids = new Set();
    for (const segment of PRODUCT_SEGMENT_IDS) {
      const lib = getSegmentServiceLibrary(segment);
      assert.equal(lib, ALL_SEGMENT_LIBRARIES[segment]);
      assert.ok(lib.length >= 30, `${segment} too small: ${lib.length}`);
      for (const item of lib) {
        assert.equal(item.segment, segment, item.id);
        assert.equal(item.active, true, item.id);
        assert.ok(item.name.trim(), item.id);
        assert.ok(item.category.trim(), item.id);
        assert.equal(item.preco, undefined);
        assert.equal(item.price, undefined);
        assert.ok(!ids.has(item.id), `id duplicado ${item.id}`);
        ids.add(item.id);
      }
    }
  });

  it("oficina cobre as categorias homologadas", async () => {
    const { getSegmentServiceLibrary } = await load(
      "lib/segments/catalogs/index.ts",
    );
    const lib = getSegmentServiceLibrary("oficina");
    const cats = new Set(lib.map((i) => i.category));
    for (const cat of [
      "Revisão / Manutenção",
      "Freios",
      "Suspensão",
      "Direção",
      "Motor",
      "Elétrica",
      "Ar-condicionado",
      "Transmissão",
      "Pneus",
    ]) {
      assert.ok(cats.has(cat), cat);
    }
    assert.ok(lib.length >= 70, lib.length);
    assert.ok(lib.some((i) => i.name === "Revisão básica"));
    assert.ok(lib.some((i) => i.name === "Troca de óleo do motor"));
    assert.ok(lib.some((i) => i.name === "Scanner automotivo"));
  });

  it("barbearia não vaza automotivo e tem produtos de varejo", async () => {
    const { getSegmentServiceLibrary } = await load(
      "lib/segments/catalogs/index.ts",
    );
    const lib = getSegmentServiceLibrary("barbearia");
    const blob = lib.map((i) => `${i.name} ${i.description} ${i.category}`).join("\n");
    assert.doesNotMatch(blob, AUTO_LEAK);
    assert.doesNotMatch(blob, /veículo|placa|\bkm\b|oficina/i);
    assert.ok(lib.some((i) => i.name === "Corte degradê"));
    assert.ok(lib.some((i) => i.name === "Pomada" && i.itemType === "produto"));
    assert.ok(lib.length >= 50, lib.length);
  });

  it("lava-rápido preserva estética automotiva sem mecânica", async () => {
    const { getSegmentServiceLibrary } = await load(
      "lib/segments/catalogs/index.ts",
    );
    const { getSegmentFormConfig } = await load("lib/segments/form-config.ts");
    const { resolveSegmentContext, hasCapability } = await load(
      "lib/segments/resolve.ts",
    );
    const lib = getSegmentServiceLibrary("lava_rapido");
    const blob = lib.map((i) => `${i.name} ${i.category}`).join("\n");
    assert.doesNotMatch(blob, LAVA_MECHANICAL_LEAK);
    assert.ok(lib.some((i) => i.name === "Lavagem completa"));
    assert.ok(lib.some((i) => i.name === "Detalhamento completo"));
    const ctx = resolveSegmentContext({
      segment: "lava_rapido",
      ...ENGINE,
    });
    assert.equal(hasCapability(ctx, "vehicles"), true);
    assert.equal(hasCapability(ctx, "service_checklist"), true);
    const form = getSegmentFormConfig(ctx);
    assert.ok(form.visibleFields.includes("veiculo"));
    assert.ok(form.visibleFields.includes("placa"));
    assert.ok(form.visibleFields.includes("checklist"));
    assert.ok(form.optionalFields.includes("km"));
    assert.ok(form.optionalFields.includes("combustivel"));
    assert.ok(form.hiddenFields.includes("diagnostico_mecanico"));
    assert.ok(!form.allowedItemTypes.some((t) => t.value === "peca"));
  });

  it("consultoria, estética e odonto sem peças/veículo/km", async () => {
    const { getSegmentServiceLibrary } = await load(
      "lib/segments/catalogs/index.ts",
    );
    const { getSegmentFormConfig } = await load("lib/segments/form-config.ts");
    const { resolveSegmentContext } = await load("lib/segments/resolve.ts");
    for (const id of [
      "consultoria",
      "clinica_estetica",
      "consultorio_odontologico",
    ]) {
      const lib = getSegmentServiceLibrary(id);
      const blob = lib.map((i) => `${i.name} ${i.description} ${i.category}`).join("\n");
      assert.doesNotMatch(blob, AUTO_LEAK, id);
      assert.doesNotMatch(blob, /veículo|placa|\bkm\b|oficina/i, id);
      const form = getSegmentFormConfig(
        resolveSegmentContext({ segment: id, ...ENGINE }),
      );
      assert.ok(form.hiddenFields.includes("veiculo"), id);
      assert.ok(form.hiddenFields.includes("km"), id);
      assert.ok(form.hiddenFields.includes("pecas_mecanicas"), id);
      assert.ok(!form.allowedItemTypes.some((t) => t.value === "peca"), id);
    }
    assert.ok(
      getSegmentServiceLibrary("consultoria").some((i) => i.name === "Hora técnica"),
    );
    assert.ok(
      getSegmentServiceLibrary("clinica_estetica").some(
        (i) => i.name === "Limpeza de pele",
      ),
    );
    assert.ok(
      getSegmentServiceLibrary("consultorio_odontologico").some(
        (i) => i.name === "Consulta inicial",
      ),
    );
    const odontoBlob = getSegmentServiceLibrary("consultorio_odontologico")
      .map((i) => i.description)
      .join(" ");
    assert.doesNotMatch(odontoBlob, /prontuário|odontograma|anamnese|prescrição/i);
  });

  it("legado (engine off) usa biblioteca e form da oficina", async () => {
    const { resolveSegmentContext } = await load("lib/segments/resolve.ts");
    const { getLibraryForContext } = await load("lib/segments/catalogs/index.ts");
    const { getSegmentFormConfig } = await load("lib/segments/form-config.ts");
    const ctx = resolveSegmentContext({
      segment: "consultoria",
      segmentVersion: null,
    });
    assert.equal(ctx.usesCapabilityEngine, false);
    const lib = getLibraryForContext(ctx);
    assert.ok(lib.every((i) => i.segment === "oficina"));
    const form = getSegmentFormConfig(ctx);
    assert.equal(form.segment, "oficina");
    assert.ok(form.allowedItemTypes.some((t) => t.value === "peca"));
  });

  it("seleção, deduplicação e custom sem preço imposto", async () => {
    const { getSegmentServiceLibrary } = await load(
      "lib/segments/catalogs/index.ts",
    );
    const { planLibraryAdoption, libraryItemToCreateInput } = await load(
      "lib/segments/library-adopt.ts",
    );
    const { namesAreEquivalent } = await load("lib/segments/catalogs/builder.ts");
    const lib = getSegmentServiceLibrary("barbearia");
    const corte = lib.find((i) => i.name === "Corte tradicional");
    const barba = lib.find((i) => i.name === "Barba tradicional");
    const pomada = lib.find((i) => i.name === "Pomada");
    assert.ok(corte && barba && pomada);
    const plan = planLibraryAdoption(
      "barbearia",
      [corte.id, barba.id, pomada.id, "oficina-freios-diagnostico-freios"],
      [{ nome: "corte tradicional" }],
    );
    assert.equal(plan.toCreate.length, 2);
    assert.equal(plan.skippedDuplicate.length, 1);
    assert.equal(plan.skippedWrongSegment.length, 1);
    assert.ok(namesAreEquivalent("Troca de ÓLEO do Motor", "troca oleo motor"));
    const input = libraryItemToCreateInput(barba);
    assert.equal(input.preco_venda, null);
    assert.equal(input.nome, "Barba tradicional");
    assert.equal(input.tenant_id, undefined);
  });

  it("tenant isolation e RBAC na action; sem auto-seed", () => {
    const actions = read("lib/segments/library-actions.ts");
    assert.match(actions, /requireTenantMutationPermission/);
    assert.match(actions, /produtos\.criar/);
    assert.match(actions, /createProdutoService\(tenant\.id\)/);
    assert.doesNotMatch(actions, /asaas/i);
    const create = read("lib/onboarding/create-tenant.ts");
    assert.doesNotMatch(create, /adoptSegmentLibrary|getSegmentServiceLibrary/);
    const service = read("lib/produtos/produto-service.ts");
    assert.match(service, /eq\("tenant_id", this.tenantId\)/);
  });

  it("empty state, picker, CTA de tenant existente e custom service", () => {
    const empty = read("components/produtos/produto-empty-state.tsx");
    assert.match(empty, /Montar catálogo inicial/);
    assert.match(empty, /Criar serviço do zero/);
    assert.match(empty, /catalogo-inicial/);
    assert.match(empty, /hasLibrary/);
    const picker = read("components/produtos/segment-catalog-picker.tsx");
    assert.match(picker, /Adicionar \$\{selectedCount\} serviço/);
    assert.match(picker, /Limpar seleção/);
    assert.match(picker, /Selecionar categoria/);
    assert.match(picker, /Criar serviço personalizado/);
    assert.match(picker, /sm:grid-cols-2/);
    assert.match(picker, /sticky|fixed inset-x-0 bottom-0/);
    assert.doesNotMatch(picker, /preco_venda|R\$/);
    const hub = read("app/(app)/[tenant]/produtos/page.tsx");
    assert.match(hub, /Sugestões do segmento/);
    assert.match(hub, /buildCatalogPickerView/);
    assert.match(hub, /Definir preços/);
    const page = read("app/(app)/[tenant]/produtos/catalogo-inicial/page.tsx");
    assert.match(page, /buildCatalogPickerView/);
    assert.match(page, /Criar serviço do zero/);
    const form = read("components/produtos/produto-form.tsx");
    assert.match(form, /formConfig/);
    assert.doesNotMatch(form, /segment === ['"]barbearia['"]/);
  });

  it("form config central: tipos e campos por segmento", async () => {
    const { getSegmentFormConfig } = await load("lib/segments/form-config.ts");
    const { resolveSegmentContext } = await load("lib/segments/resolve.ts");
    const oficina = getSegmentFormConfig(
      resolveSegmentContext({ segment: "oficina", ...ENGINE }),
    );
    assert.ok(oficina.allowedItemTypes.some((t) => t.value === "peca"));
    assert.ok(oficina.allowedItemTypes.some((t) => t.value === "composto"));
    assert.equal(oficina.hiddenFields.length, 0);
    const barbearia = getSegmentFormConfig(
      resolveSegmentContext({ segment: "barbearia", ...ENGINE }),
    );
    const barbTypes = barbearia.allowedItemTypes.map((t) => t.value);
    assert.deepEqual(barbTypes.sort(), ["combo", "kit", "produto", "servico"].sort());
    const consultoria = getSegmentFormConfig(
      resolveSegmentContext({ segment: "consultoria", ...ENGINE }),
    );
    assert.ok(consultoria.allowedOperationTypes.includes("consultation"));
    assert.ok(
      consultoria.allowedItemTypes.every((t) => t.value === "servico" || t.value === "combo"),
    );
    const lava = getSegmentFormConfig(
      resolveSegmentContext({ segment: "lava_rapido", ...ENGINE }),
    );
    const lavaTypes = lava.allowedItemTypes.map((t) => t.value).sort();
    assert.deepEqual(lavaTypes, ["combo", "kit", "materia_prima", "produto", "servico"].sort());
    assert.ok(!lava.hiddenFields.includes("veiculo"));
    assert.ok(lava.hiddenFields.includes("diagnostico_mecanico"));
    const estetica = getSegmentFormConfig(
      resolveSegmentContext({ segment: "clinica_estetica", ...ENGINE }),
    );
    const estTypes = estetica.allowedItemTypes.map((t) => t.value).sort();
    assert.deepEqual(
      estTypes,
      ["combo", "kit", "materia_prima", "produto", "servico"].sort(),
    );
    const odonto = getSegmentFormConfig(
      resolveSegmentContext({ segment: "consultorio_odontologico", ...ENGINE }),
    );
    assert.ok(odonto.allowedItemTypes.some((t) => /insumo/i.test(t.label)));
    assert.ok(odonto.hiddenFields.includes("veiculo"));
  });
});

describe("35.1 biblioteca visível na camada da página", () => {
  it("route → resolver → library → view não vazia nos 6 segmentos", async () => {
    const page = read("app/(app)/[tenant]/produtos/catalogo-inicial/page.tsx");
    assert.match(page, /buildCatalogPickerView/);
    assert.match(page, /view\.items|view\.hasLibrary/);
    const { resolveSegmentContext } = await load("lib/segments/resolve.ts");
    const { buildCatalogPickerView, MIN_LIBRARY_COUNTS } = await load(
      "lib/segments/catalogs/view-model.ts",
    );
    const { PRODUCT_SEGMENT_IDS } = await load("lib/segments/types.ts");
    for (const id of PRODUCT_SEGMENT_IDS) {
      const view = buildCatalogPickerView(
        resolveSegmentContext({ segment: id, ...ENGINE }),
      );
      assert.equal(view.hasLibrary, true, id);
      assert.ok(view.items.length >= MIN_LIBRARY_COUNTS[id], `${id} count`);
      assert.ok(view.categories.length > 0, `${id} categories`);
      assert.match(view.title, new RegExp(view.segmentLabel));
      assert.equal(view.items.some((i) => !i.active), false, id);
    }
  });

  it("categorias da biblioteca batem com o ramo (sem vazamento automotivo)", async () => {
    const { resolveSegmentContext } = await load("lib/segments/resolve.ts");
    const { buildCatalogPickerView } = await load(
      "lib/segments/catalogs/view-model.ts",
    );
    const barb = buildCatalogPickerView(
      resolveSegmentContext({ segment: "barbearia", ...ENGINE }),
    );
    for (const cat of [
      "Cabelo",
      "Barba",
      "Combos",
      "Tratamentos",
      "Química / estilo",
      "Estética complementar",
      "Pacotes",
    ]) {
      assert.ok(barb.categories.includes(cat), cat);
    }
    assert.equal(barb.categories.some((c) => /freios|motor|suspensão/i.test(c)), false);
    const lava = buildCatalogPickerView(
      resolveSegmentContext({ segment: "lava_rapido", ...ENGINE }),
    );
    assert.ok(lava.items.length >= 54);
    assert.equal(lava.items.some((i) => /freios|diagnóstico de motor/i.test(i.name)), false);
    const cons = buildCatalogPickerView(
      resolveSegmentContext({ segment: "consultoria", ...ENGINE }),
    );
    for (const cat of [
      "Consultoria",
      "Diagnóstico",
      "Projetos",
      "Assessoria",
      "Treinamentos",
      "Recorrência",
    ]) {
      assert.ok(cons.categories.includes(cat), cat);
    }
    assert.equal(cons.items.some((i) => /lavagem|placa|oficina/i.test(i.name)), false);
    const est = buildCatalogPickerView(
      resolveSegmentContext({ segment: "clinica_estetica", ...ENGINE }),
    );
    for (const cat of ["Facial", "Corporal", "Depilação", "Sobrancelhas / cílios", "Massagens", "Pacotes"]) {
      assert.ok(est.categories.includes(cat), cat);
    }
    const odonto = buildCatalogPickerView(
      resolveSegmentContext({ segment: "consultorio_odontologico", ...ENGINE }),
    );
    for (const cat of [
      "Consultas",
      "Prevenção",
      "Restauração",
      "Periodontia",
      "Endodontia",
      "Cirurgia",
      "Prótese",
      "Estética",
      "Ortodontia",
      "Implantodontia",
    ]) {
      assert.ok(odonto.categories.includes(cat), cat);
    }
    const blob = odonto.items.map((i) => `${i.name} ${i.description}`).join(" ");
    assert.doesNotMatch(blob, /odontograma|prontuário|anamnese|prescrição/i);
  });

  it("segmento sem biblioteca não quebra a rota", () => {
    const page = read("app/(app)/[tenant]/produtos/catalogo-inicial/page.tsx");
    assert.match(page, /view\.hasLibrary/);
    assert.match(page, /Não há sugestões/);
    const empty = read("components/produtos/produto-empty-state.tsx");
    assert.match(empty, /hasLibrary/);
  });
});

describe("35.1 lava-rápido atendimento e barbearia profissionais", () => {
  it("form de abertura usa adapter, sem Oficina / Veículo no lava", async () => {
    const form = read("components/ordens/os-open-form.tsx");
    assert.match(form, /attendanceOptions/);
    assert.match(form, /openCta/);
    assert.match(form, /\{openCta\}/);
    assert.doesNotMatch(form, /Tipo de operação \(Ordem de Trabalho\)/);
    const nova = read("app/(app)/[tenant]/ordens/nova/page.tsx");
    assert.match(nova, /attendanceOptionsForContext/);
    assert.match(nova, /openWorkOrderCta/);
    const { resolveSegmentContext } = await load("lib/segments/resolve.ts");
    const { attendanceOptionsForContext, defaultAttendanceType } = await load(
      "lib/segments/attendance-types.ts",
    );
    const { getSegmentUiCopy } = await load("lib/segments/copy.ts");
    const lava = resolveSegmentContext({ segment: "lava_rapido", ...ENGINE });
    const options = attendanceOptionsForContext(lava);
    assert.equal(options.some((o) => o.label === "Oficina / Veículo"), false);
    assert.ok(options.some((o) => o.label === "Lavagem simples"));
    assert.ok(options.some((o) => o.label === "Pacote / plano"));
    assert.equal(defaultAttendanceType(lava), "lava_rapido");
    const ui = getSegmentUiCopy({ segment: "lava_rapido", ...ENGINE });
    assert.equal(ui.operationTypeLabel, "Tipo de atendimento");
    assert.equal(ui.openWorkOrderCta, "Abrir atendimento");
    assert.equal(ui.compactVehicleVitals, true);
    assert.equal(ui.automotiveWorkflow, false);
  });

  it("checklist lava reusa a mesma tabela e template próprio", () => {
    const status = read("lib/ordens/os-status.ts");
    assert.match(status, /LAVA_RAPIDO_CHECKLIST_TEMPLATE/);
    assert.match(status, /getOsChecklistTemplate/);
    assert.match(status, /objetos_veiculo/);
    assert.match(status, /fotos_entrada/);
    const service = read("lib/ordens/ordem-servico-service.ts");
    assert.match(service, /applyChecklistTemplate/);
    assert.match(service, /getOsChecklistTemplate/);
    const actions = read("lib/ordens/actions.ts");
    assert.match(actions, /applyChecklistTemplate/);
    assert.match(actions, /lava_rapido/);
    const workspace = read("components/ordens/os-workspace.tsx");
    assert.match(workspace, /automotiveWorkflow/);
    assert.match(workspace, /compactVehicleVitals/);
  });

  it("barbearia oferece especialidades reais, não só Geral", async () => {
    const { BARBER_SPECIALTY_SUGGESTIONS } = await load(
      "lib/segments/professional-specialties.ts",
    );
    assert.ok(BARBER_SPECIALTY_SUGGESTIONS.includes("Corte masculino"));
    assert.ok(BARBER_SPECIALTY_SUGGESTIONS.includes("Fade / degradê"));
    assert.ok(BARBER_SPECIALTY_SUGGESTIONS.includes("Geral"));
    const manager = read("components/mecanicos/mecanicos-manager.tsx");
    assert.match(manager, /professionalSpecialtySuggestions/);
    assert.match(manager, /ProfessionalSpecialtyField/);
    const field = read("components/mecanicos/professional-specialty-field.tsx");
    assert.match(field, /datalist/);
    assert.match(field, /valor personalizado/);
    const list = read("components/mecanicos/professionals-list-screen.tsx");
    assert.match(list, /professionalSpecialtySuggestions/);
  });

  it("oficina permanece com OS, Km e diagnóstico visíveis", async () => {
    const { getSegmentUiCopy } = await load("lib/segments/copy.ts");
    const ui = getSegmentUiCopy({ segment: "oficina", ...ENGINE });
    assert.equal(ui.openWorkOrderCta, "Abrir OS");
    assert.equal(ui.automotiveWorkflow, true);
    assert.equal(ui.compactVehicleVitals, false);
    const { attendanceOptionsForContext } = await load(
      "lib/segments/attendance-types.ts",
    );
    const { resolveSegmentContext } = await load("lib/segments/resolve.ts");
    const options = attendanceOptionsForContext(
      resolveSegmentContext({ segment: "oficina", ...ENGINE }),
    );
    assert.ok(options.some((o) => o.label === "Oficina / Veículo"));
  });
});
