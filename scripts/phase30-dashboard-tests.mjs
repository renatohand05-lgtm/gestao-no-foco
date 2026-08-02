#!/usr/bin/env node
/**
 * Sprint 30.4 — Dashboard / Cockpit V2 (offline).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  getSegmentCockpitCopy,
  getSegmentQuickActions,
  QUICK_ACTIONS_CATALOG,
  resolveCockpitSegment,
} from "../config/dashboard/cockpit-v2.ts";

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

console.log("Phase 30.4 — dashboard\n");

const required = [
  "components/dashboard/premium/premium-dashboard-view.tsx",
  "components/dashboard/cockpit-v2/cockpit-kpi-grid.tsx",
  "components/dashboard/cockpit-v2/executive-brief-v2.tsx",
  "components/dashboard/cockpit-v2/alerts-center.tsx",
  "components/dashboard/cockpit-v2/quick-actions-panel.tsx",
  "lib/dashboard/cockpit-v2/kpis.ts",
  "lib/dashboard/cockpit-v2/alerts.ts",
  "lib/dashboard/cockpit-v2/panels.ts",
  "config/dashboard/cockpit-v2.ts",
];
for (const rel of required) {
  check(`arquivo ${rel}`, existsSync(resolve(rel)));
}

const view = readFileSync(
  resolve("components/dashboard/premium/premium-dashboard-view.tsx"),
  "utf8",
);
check("view marca sprint 30.4", /data-signature="30\.4"/.test(view));
check("view usa CockpitKpiGrid", /CockpitKpiGrid/.test(view));
check("view usa ExecutiveBriefV2", /ExecutiveBriefV2/.test(view));
check("view usa AlertsCenter", /AlertsCenter/.test(view));
check("view usa QuickActionsPanel", /QuickActionsPanel/.test(view));
check("view passa segment", /segment=\{ctx\.segment\}/.test(
  readFileSync(resolve("components/dashboard/dashboard-streaming.tsx"), "utf8"),
) || /segment,/.test(view));
check("sem inventar valores fictícios no view", !/Math\.random|faker|fakeKpi/i.test(view));

check("oficina OS labels", getSegmentCockpitCopy("oficina").kpiOrdersTitle.includes("OS"));
check("comercio pedidos", /Pedido/i.test(getSegmentCockpitCopy("comercio").kpiOrdersTitle));
check("quick actions catalog >= 8", QUICK_ACTIONS_CATALOG.length >= 8);
check(
  "oficina prioriza OS",
  getSegmentQuickActions("oficina")[0]?.id === "os",
);
check(
  "comercio prioriza venda",
  getSegmentQuickActions("comercio")[0]?.id === "venda",
);
check("alias distribuicao→comercio", resolveCockpitSegment("distribuicao") === "comercio");

const streaming = readFileSync(
  resolve("components/dashboard/dashboard-streaming.tsx"),
  "utf8",
);
check("streaming Promise.all", /Promise\.all/.test(streaming));
check("loaders React.cache preservados", existsSync(resolve("lib/dashboard/dashboard-loaders.ts")));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
