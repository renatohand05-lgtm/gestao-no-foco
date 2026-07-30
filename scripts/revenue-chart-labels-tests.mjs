#!/usr/bin/env node
/** Sprint 25.6.3 — Revenue chart labels contract */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) {
    pass++;
    console.log(`  PASS  ${msg}`);
  } else {
    fail++;
    console.log(`  FAIL  ${msg}`);
  }
}

console.log("\nRevenue Chart Labels — Sprint 25.6.3\n");

assert(
  existsSync(join(root, "components/dashboard/premium/premium-revenue-chart.tsx")),
  "componente premium-revenue-chart",
);
assert(
  existsSync(join(root, "lib/dashboard/revenue-chart-labels.ts")),
  "lib revenue-chart-labels",
);

const chart = readFileSync(
  join(root, "components/dashboard/premium/premium-revenue-chart.tsx"),
  "utf8",
);
assert(chart.includes("data-chart-label"), "marker label");
assert(chart.includes("data-chart-tooltip"), "marker tooltip");
assert(chart.includes("formatCurrencyChartLabel"), "label compacto");
assert(chart.includes("formatCurrency("), "tooltip moeda completa");
assert(chart.includes("aria-label"), "acessibilidade nos pontos");
assert(chart.includes("tabIndex"), "foco teclado");
assert(chart.includes("overflow-x-hidden"), "sem overflow horizontal");
assert(chart.includes("metaByDate"), "meta só quando fornecida");
assert(!/Math\.random|faker/.test(chart), "sem dados inventados");

const main = readFileSync(
  join(root, "components/dashboard/premium/premium-main-row.tsx"),
  "utf8",
);
assert(main.includes("PremiumRevenueChart"), "main-row usa chart");
assert(
  main.includes("@/components/dashboard/premium/premium-revenue-chart"),
  "import do chart dedicado",
);

const currency = readFileSync(join(root, "lib/format/currency.ts"), "utf8");
assert(currency.includes("formatCurrencyChartLabel"), "formatter chart");

const labelsMod = await import(
  pathToFileURL(join(root, "lib/dashboard/revenue-chart-labels.ts")).href,
);
const currencyMod = await import(
  pathToFileURL(join(root, "lib/format/currency.ts")).href,
);

const {
  buildRevenueCoords,
  selectRevenueLabels,
  buildRevenueTooltip,
  resolveRevenueBreakpoint,
  formatChartDate,
} = labelsMod;
const { formatCurrencyChartLabel, formatCurrency } = currencyMod;

assert(resolveRevenueBreakpoint(390) === "mobile", "breakpoint mobile");
assert(resolveRevenueBreakpoint(1366) === "notebook", "breakpoint notebook");
assert(resolveRevenueBreakpoint(1920) === "desktop", "breakpoint desktop");

const series = [
  { label: "01/07", data: "2026-07-01", value: 0 },
  { label: "05/07", data: "2026-07-05", value: 1400 },
  { label: "10/07", data: "2026-07-10", value: 14350 },
  { label: "15/07", data: "2026-07-15", value: 950 },
  { label: "20/07", data: "2026-07-20", value: 125000 },
  { label: "25/07", data: "2026-07-25", value: 8000 },
  { label: "29/07", data: "2026-07-29", value: 4200 },
  { label: "31/07", data: "2026-07-31", value: 0 },
];

const coords = buildRevenueCoords(series);
assert(coords.length === 8, "coords geradas");

const desktop = selectRevenueLabels(coords, "desktop");
assert(desktop.some((l) => l.role === "peak"), "desktop maior pico");
assert(
  desktop.find((l) => l.role === "peak")?.index === 4,
  "pico = R$ 125 mil",
);
assert(desktop.some((l) => l.role === "second"), "desktop segundo pico");
assert(desktop.some((l) => l.role === "last"), "desktop último valor > 0");
assert(
  desktop.find((l) => l.role === "last")?.index === 6,
  "último positivo = 29/07",
);

const notebook = selectRevenueLabels(coords, "notebook");
assert(notebook.some((l) => l.role === "peak"), "notebook pico");
assert(notebook.some((l) => l.role === "last"), "notebook último");
assert(!notebook.some((l) => l.role === "second"), "notebook sem segundo");

const mobile = selectRevenueLabels(coords, "mobile");
assert(mobile.some((l) => l.role === "peak"), "mobile pico");
assert(mobile.some((l) => l.role === "last"), "mobile último");
assert(mobile.length <= 2, "mobile no máx 2 labels fixos");

const withActive = selectRevenueLabels(coords, "mobile", 2);
assert(withActive.some((l) => l.index === 2), "label do ponto ativo");

const tip = buildRevenueTooltip(coords, 2);
assert(tip != null, "tooltip existe");
assert(tip.point.value === 14350, "tooltip valor");
assert(tip.previous?.value === 1400, "tooltip dia anterior");
assert(tip.delta === 14350 - 1400, "tooltip delta");
assert(tip.variationPct != null, "tooltip variação %");
assert(tip.metaStatus == null, "meta não inventada");

const tipMeta = buildRevenueTooltip(coords, 2, { "2026-07-10": 10000 });
assert(tipMeta?.metaStatus === "acima", "meta quando fornecida");

assert(formatChartDate("2026-07-29") === "29/07/2026", "data formatada");

assert(formatCurrencyChartLabel(950).includes("950"), "compact R$ 950");
assert(formatCurrencyChartLabel(1400).includes("mil"), "compact mil");
assert(formatCurrencyChartLabel(14350).includes("mil"), "compact 14,3 mil");
assert(formatCurrencyChartLabel(125000).includes("mil"), "compact 125 mil");
assert(formatCurrencyChartLabel(1_200_000).includes("mi"), "compact mi");
assert(formatCurrency(14350).includes("14.350"), "completo no tooltip");

const zeros = buildRevenueCoords([
  { label: "a", data: "2026-07-01", value: 0 },
  { label: "b", data: "2026-07-02", value: 0 },
]);
assert(zeros.length === 2, "série zero ainda gera coords");

const near = Array.from({ length: 15 }, (_, i) => ({
  label: String(i),
  data: `2026-07-${String(i + 1).padStart(2, "0")}`,
  value: i === 7 ? 200 : i === 8 ? 190 : 10,
}));
const nearCoords = buildRevenueCoords(near);
const nearLabels = selectRevenueLabels(nearCoords, "desktop");
assert(
  !nearLabels.some((l) => l.role === "second"),
  "segundo pico omitido se próximo do maior",
);

const edge = selectRevenueLabels(coords, "desktop");
assert(
  edge.every((l) => l.x + l.dx >= 0 && l.x + l.dx <= 100),
  "labels dentro do viewBox (bordas)",
);
assert(
  edge.filter((l) => l.role === "peak")[0]?.highlight === true,
  "pico com highlight",
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
