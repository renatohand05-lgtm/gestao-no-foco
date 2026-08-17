#!/usr/bin/env node
/**
 * Hotfix piloto — Client 360 gated by capabilities (sem fork de segmento na UI).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const load = (rel) =>
  import(pathToFileURL(join(root, rel)).href + `?t=${Date.now()}`);

const ENGINE = { segmentVersion: 1 };

async function surfaceFor(segment, extra = {}) {
  const { client360Surface, visibleClient360Tabs } = await load(
    "lib/segments/client-360.ts",
  );
  const surface = client360Surface({ segment, ...ENGINE, ...extra });
  const tabs = visibleClient360Tabs({
    showVehicles: surface.showVehicles,
    showWorkOrders: surface.showWorkOrders,
    hasExecutivo: true,
  });
  return { surface, tabs };
}

describe("hotfix client 360 — clínicas / estética / odonto", () => {
  for (const segment of [
    "clinica_estetica",
    "clinica",
    "estetica",
    "consultorio_odontologico",
    "odontologia",
  ]) {
    it(`${segment}: vehicles OFF e work_orders OFF — sem cards/abas`, async () => {
      const { surface, tabs } = await surfaceFor(segment);
      assert.equal(surface.showVehicles, false);
      assert.equal(surface.showWorkOrders, false);
      assert.equal(tabs.includes("veiculos"), false);
      assert.equal(tabs.includes("ordens"), false);
    });
  }
});

describe("hotfix client 360 — demais segmentos", () => {
  it("consultoria e barbearia: sem veículos e sem OS", async () => {
    for (const segment of ["consultoria", "barbearia"]) {
      const { surface, tabs } = await surfaceFor(segment);
      assert.equal(surface.showVehicles, false);
      assert.equal(surface.showWorkOrders, false);
      assert.equal(tabs.includes("veiculos"), false);
      assert.equal(tabs.includes("ordens"), false);
    }
  });

  it("lava: veículos SIM, Atendimentos SIM, copy OS NÃO", async () => {
    const { surface, tabs } = await surfaceFor("lava_rapido");
    assert.equal(surface.showVehicles, true);
    assert.equal(surface.showWorkOrders, true);
    assert.equal(tabs.includes("veiculos"), true);
    assert.equal(tabs.includes("ordens"), true);
    assert.equal(surface.workOrdersLabel.includes("Atendimento"), true);
    assert.doesNotMatch(surface.workOrderShort, /\bOS\b/);
    assert.doesNotMatch(surface.workOrdersLabel, /\bOS\b/);
  });

  it("oficina: veículos SIM e OS SIM", async () => {
    const { surface, tabs } = await surfaceFor("oficina");
    assert.equal(surface.showVehicles, true);
    assert.equal(surface.showWorkOrders, true);
    assert.equal(tabs.includes("veiculos"), true);
    assert.equal(tabs.includes("ordens"), true);
    assert.match(surface.workOrderShort, /OS/);
    assert.match(surface.workOrdersLabel, /Ordens/i);
  });

  it("alias clinica sem version ainda usa o motor", async () => {
    const { client360Surface } = await load("lib/segments/client-360.ts");
    const surface = client360Surface({ segment: "clinica" });
    assert.equal(surface.showVehicles, false);
    assert.equal(surface.showWorkOrders, false);
  });

  it("legado (engine off): preserva veículos e OS", async () => {
    const { client360Surface, visibleClient360Tabs } = await load(
      "lib/segments/client-360.ts",
    );
    const surface = client360Surface({ segment: "comercio", segmentVersion: null });
    assert.equal(surface.showVehicles, true);
    assert.equal(surface.showWorkOrders, true);
    const tabs = visibleClient360Tabs({
      showVehicles: surface.showVehicles,
      showWorkOrders: surface.showWorkOrders,
      hasExecutivo: false,
    });
    assert.equal(tabs.includes("veiculos"), true);
    assert.equal(tabs.includes("ordens"), true);
    assert.equal(tabs.includes("executivo"), false);
  });
});

describe("hotfix client 360 — UI usa o adapter, não forks", () => {
  it("workspace e página montam cards/abas pelo helper", () => {
    const workspace = read("components/clientes/cliente-workspace.tsx");
    const page = read("app/(app)/[tenant]/clientes/[id]/page.tsx");
    const exec = read("components/crm/crm-executivo-perfil.tsx");
    assert.match(workspace, /visibleClient360Tabs/);
    assert.match(workspace, /client360\.showVehicles/);
    assert.match(workspace, /client360\.showWorkOrders/);
    assert.match(page, /client360Surface/);
    assert.doesNotMatch(workspace, /if \(segment ===/);
    assert.doesNotMatch(page, /if \(segment ===/);
    assert.doesNotMatch(workspace, /title="Ordens de serviço"/);
    assert.doesNotMatch(workspace, /title="Veículos"/);
    assert.match(exec, /client360/);
    assert.doesNotMatch(workspace, /\bOS #/);
  });

  it("mobile 360 não devolve veículos/OS quando capability OFF", () => {
    const compose = read("lib/mobile/operations-compose.ts");
    const route = read(
      "app/api/mobile/v1/tenants/[tenantId]/operacao/customers/[id]/route.ts",
    );
    const screen = read("apps/mobile/app/(app)/operacao/clientes/[id].tsx");
    assert.match(compose, /client360Surface/);
    assert.match(compose, /surface\.showVehicles/);
    assert.match(compose, /surface\.showWorkOrders/);
    assert.match(route, /segment: auth\.ctx\.segment/);
    assert.doesNotMatch(screen, /OS \{o\.numero\}/);
  });
});

describe("hotfix allowlist — canais e bloqueio", () => {
  it("whatsapp + e-mail quando ambos habilitados no tenant", async () => {
    const { pickChannels, DEFAULT_COMMUNICATION_SETTINGS } = await load(
      "lib/retention/settings.ts",
    );
    const both = pickChannels({
      settings: {
        ...DEFAULT_COMMUNICATION_SETTINGS,
        whatsappMode: "provider",
        emailMode: "provider",
      },
      preferred: "whatsapp",
      whatsappAvailable: true,
      emailAvailable: true,
    });
    assert.deepEqual(both, ["whatsapp", "email"]);
  });
});
