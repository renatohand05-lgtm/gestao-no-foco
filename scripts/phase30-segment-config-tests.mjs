#!/usr/bin/env node
/**
 * Sprint 30.3 — configuração automática por segmento.
 */
import {
  ENTERPRISE_SEGMENTS,
  searchEnterpriseSegments,
  toNavSegmentId,
} from "../config/onboarding/segments.ts";
import { getSegmentSetup } from "../config/onboarding/segment-setup.ts";
import { IMPORT_CHANNELS } from "../config/onboarding/import-channels.ts";

let pass = 0;
let fail = 0;

function check(name, cond) {
  if (cond) {
    pass += 1;
    console.log("  PASS", name);
  } else {
    fail += 1;
    console.log("  FAIL", name);
  }
}

console.log("Phase 30.3 — segment-config\n");

const labels = ENTERPRISE_SEGMENTS.map((s) => s.label);
for (const expected of [
  "Oficina Mecânica",
  "Auto Center",
  "Lava-rápido / Estética automotiva",
  "Comércio",
  "Restaurante",
  "Serviços",
  "Consultoria",
  "Distribuição",
  "Pequena Indústria",
  "Outro",
]) {
  check(`label ${expected}`, labels.includes(expected));
}

check("search oficina", searchEnterpriseSegments("oficina").some((s) => s.id === "oficina"));
check("search lava", searchEnterpriseSegments("lavagem").some((s) => s.id === "lava_rapido"));
check("auto_center → nav oficina", toNavSegmentId("auto_center") === "oficina");
check("distribuicao → nav comercio", toNavSegmentId("distribuicao") === "comercio");

const oficina = getSegmentSetup("oficina");
check("oficina módulos OS/veículos", oficina.modules.some((m) => m.key === "ordens") && oficina.modules.some((m) => m.key === "veiculos"));
check("oficina label workOrder OS", /ordem/i.test(oficina.labels.workOrder));
check("oficina menus", oficina.menus.length >= 3);
check("oficina kpis", oficina.kpis.length >= 2);

const comercio = getSegmentSetup("comercio");
check("comercio produtos+pedidos", comercio.modules.some((m) => m.key === "produtos") && comercio.modules.some((m) => m.key === "pedidos"));

const rest = getSegmentSetup("restaurante");
check(
  "restaurante cardápio/salão/cozinha/delivery",
  ["cardapio", "salao", "cozinha", "delivery"].every((k) =>
    rest.modules.some((m) => m.key === k),
  ),
);

const serv = getSegmentSetup("servicos");
check(
  "servicos agenda/ordens/profissionais",
  ["agenda", "ordens", "profissionais"].every((k) =>
    serv.modules.some((m) => m.key === k),
  ),
);

check("import channels 5", IMPORT_CHANNELS.length === 5);
check(
  "import sem implementação ativa",
  IMPORT_CHANNELS.every((c) => c.status === "planned" || c.status === "ready_architecture"),
);

for (const seg of ENTERPRISE_SEGMENTS) {
  const setup = getSegmentSetup(seg.id);
  check(
    `${seg.id} setup completo`,
    setup.menus.length > 0 &&
      setup.modules.length > 0 &&
      setup.kpis.length > 0 &&
      setup.dashboards.length > 0,
  );
}

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
