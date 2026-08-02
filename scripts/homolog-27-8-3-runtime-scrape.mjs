#!/usr/bin/env node
/**
 * Sprint 27.8.3 — scrape runtime Dashboard / Analytics / Metas.
 */
import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "docs/testing/evidence/27-8-3");
mkdirSync(OUT, { recursive: true });
const AUTH = join(root, "docs/testing/playwright/.auth/user.json");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const TENANT = "teste-renato-01";

async function scrapePage(page, path) {
  const url = `${BASE}/${TENANT}${path}`;
  const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  const body = await page.locator("body").innerText().catch(() => "");
  const metaMesPill = await page
    .locator("[data-meta-mes-pill]")
    .innerText()
    .catch(() => null);
  const metaDiaPill = await page
    .locator("[data-meta-dia-pill]")
    .innerText()
    .catch(() => null);
  const kpiMeta = await page
    .locator('[data-kpi-title]')
    .evaluateAll((nodes) =>
      nodes.map((n) => {
        const card = n.closest("[data-kpi-card], article, a, div");
        const value = card?.querySelector("[data-kpi-value]")?.textContent?.trim();
        return { title: n.textContent?.trim(), value };
      }),
    )
    .catch(() => []);
  const has132500 =
    /132\.?500|R\$\s*132\.500|R\$\s*132,5/.test(body) ||
    /132\.500/.test(metaMesPill ?? "");
  const hasSemMeta = /Sem meta/i.test(body);
  const hasNaoCadastrada = /não cadastrada|Nao cadastrada|Não cadastrada/i.test(
    body,
  );
  return {
    url,
    status: res?.status() ?? null,
    metaMesPill,
    metaDiaPill,
    kpiMeta,
    has132500,
    hasSemMeta,
    hasNaoCadastrada,
    bodySnippet: body.slice(0, 2500),
  };
}

const report = {
  at: new Date().toISOString(),
  base: BASE,
  auth: existsSync(AUTH),
  pages: {},
};

if (!existsSync(AUTH)) {
  report.error = "auth missing";
  writeFileSync(join(OUT, "runtime-scrape.json"), JSON.stringify(report, null, 2));
  console.error("Missing auth file", AUTH);
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState: AUTH,
  viewport: { width: 1440, height: 1100 },
});
const page = await context.newPage();

try {
  report.pages.dashboard = await scrapePage(page, "/dashboard");
  await page.screenshot({
    path: join(OUT, "dashboard.png"),
    fullPage: true,
  });
  report.pages.analytics = await scrapePage(page, "/analytics");
  await page.screenshot({
    path: join(OUT, "analytics.png"),
    fullPage: true,
  });
  report.pages.metas = await scrapePage(page, "/configuracoes/metas");
  await page.screenshot({
    path: join(OUT, "metas.png"),
    fullPage: true,
  });
} catch (e) {
  report.error = String(e);
} finally {
  await browser.close();
}

const dash = report.pages.dashboard;
report.verdict = {
  dashboardShowsMeta:
    Boolean(dash?.has132500) ||
    Boolean(dash?.metaMesPill?.includes("132")),
  dashboardFalseSemMeta:
    dash?.metaDiaPill?.includes("Sem meta") &&
    !dash?.metaDiaPill?.includes("Fim de semana"),
};

writeFileSync(join(OUT, "runtime-scrape.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.verdict, null, 2));
console.log("Wrote", join(OUT, "runtime-scrape.json"));
process.exit(report.error ? 1 : 0);
