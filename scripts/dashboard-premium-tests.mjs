#!/usr/bin/env node
/**
 * Sprint 25.5.1 — Dashboard premium visual contract (dados reais, rota real)
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) {
    pass += 1;
    console.log(`  PASS  ${msg}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${msg}`);
  }
}

console.log("\nDashboard Premium — Sprint 25.5.1\n");

assert(
  existsSync(join(root, "components/dashboard/dashboard-streaming.tsx")),
  "dashboard streaming",
);
assert(
  existsSync(
    join(root, "components/dashboard/premium/premium-dashboard-view.tsx"),
  ),
  "premium dashboard view",
);
assert(
  existsSync(join(root, "components/dashboard/premium/premium-kpi-strip.tsx")),
  "kpi strip",
);
assert(
  existsSync(join(root, "components/dashboard/premium/premium-main-row.tsx")),
  "main row",
);
assert(
  existsSync(join(root, "lib/dashboard/premium-dashboard-map.ts")),
  "premium map",
);

const shell = readFileSync(
  join(root, "components/dashboard/executive/executive-dashboard-shell.tsx"),
  "utf8",
);
assert(shell.includes("data-dashboard-premium"), "shell premium marker");
assert(shell.includes("radial-gradient"), "glow executivo");

const stream = readFileSync(
  join(root, "components/dashboard/dashboard-streaming.tsx"),
  "utf8",
);
assert(stream.includes("PremiumDashboardView"), "usa PremiumDashboardView");
assert(stream.includes("loadDashboardPrimary"), "loader primary real");
assert(stream.includes("loadDashboardCharts"), "loader charts real");
assert(stream.includes("composeOpsExecutiveIntelligence"), "inteligência real");
assert(stream.includes("composeExecutiveFinancialCockpit"), "cockpit real");
assert(!/Math\.random\(/.test(stream), "sem random no stream");
assert(
  !stream.includes("ResumoVendasHojeCards"),
  "layout legado de hoje removido do stream",
);

const view = readFileSync(
  join(root, "components/dashboard/premium/premium-dashboard-view.tsx"),
  "utf8",
);
assert(view.includes('data-dashboard-premium-v251'), "marker v25.5.1");
assert(view.includes('data-premium-block="ask-ai"'), "bloco IA");
assert(view.includes("BrandInstitutionalFooter"), "rodapé institucional");
assert(view.includes("PremiumKpiStrip"), "KPI strip");
assert(view.includes("PremiumMainRow"), "main row");
assert(view.includes("PremiumOpsStrip"), "ops strip");
assert(view.includes("PremiumAlertsRail"), "alerts rail");

const map = readFileSync(
  join(root, "lib/dashboard/premium-dashboard-map.ts"),
  "utf8",
);
assert(map.includes("Indisponível"), "estados indisponíveis sem inventar");
assert(map.includes("Lucro líquido"), "KPI lucro");
assert(map.includes("EBITDA"), "KPI ebitda");
assert(
  map.includes("formatCurrencyCompact"),
  "KPI usa formatação compacta quando necessário",
);

const main = readFileSync(
  join(root, "components/dashboard/premium/premium-main-row.tsx"),
  "utf8",
);
assert(main.includes("Central de Inteligência"), "central inteligência");
assert(main.includes("Calendário fiscal"), "calendário fiscal");
assert(main.includes("Alertas inteligentes"), "alertas");
assert(
  main.includes("Análise baseada em regras"),
  "disclaimer sem IA externa",
);

const footer = readFileSync(
  join(root, "components/brand/brand-institutional-footer.tsx"),
  "utf8",
);
assert(footer.includes("positioning"), "footer institucional");
assert(footer.includes("pillars"), "pilares");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
