#!/usr/bin/env node
/**
 * Sprint 30.1 — Browser QA (shell, ops, analytics, equipe, viewports, temas).
 */
import { chromium } from "playwright";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AUTH_FILE,
  BASE_URL,
  ensureChromiumInstalled,
  isAuthenticated,
} from "./playwright-auth.mjs";

const OUT = resolve("docs/testing/evidence/30-1");
const TENANT = "teste-renato-01";
mkdirSync(resolve(OUT, "screenshots"), { recursive: true });

const report = {
  at: new Date().toISOString(),
  sprint: "30.1",
  baseUrl: BASE_URL,
  checks: [],
  perf: [],
  consoleErrors: [],
};

function push(ok, detail) {
  report.checks.push({ ok: Boolean(ok), detail });
  console.log(ok ? "  PASS" : "  FAIL", detail);
}

async function shot(page, name) {
  await page.screenshot({
    path: resolve(OUT, `screenshots/${name}.png`),
    fullPage: false,
  });
}

if (!existsSync(AUTH_FILE)) {
  console.error("AUTH ausente");
  process.exit(2);
}

ensureChromiumInstalled();
const browser = await chromium.launch({ headless: true });
try {
  const ctx = await browser.newContext({
    storageState: AUTH_FILE,
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      report.consoleErrors.push(msg.text().slice(0, 200));
    }
  });

  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const authed = await isAuthenticated(page);
  push(authed, "sessão autenticada");
  if (!authed) {
    writeFileSync(resolve(OUT, "browser-qa.json"), JSON.stringify(report, null, 2));
    process.exit(2);
  }

  // Clear expanded chrome preference for collapsed default
  await page.evaluate(() => {
    try {
      sessionStorage.setItem("gnf_demo_chrome_expanded", "0");
    } catch {
      /* */
    }
  });

  await page.goto(`${BASE_URL}/${TENANT}/dashboard`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForTimeout(1000);
  const chrome = await page.locator("[data-demo-chrome]").first().getAttribute("data-demo-chrome");
  push(chrome === "collapsed", `shell Apresentação collapsed (got ${chrome})`);
  await shot(page, "shell-dashboard-collapsed");

  const sideText = await page.locator("[data-app-sidebar-premium]").innerText();
  push(!/Mecânicos/.test(sideText), "sidebar comércio sem Mecânicos");
  push(/Centro de Opera/.test(sideText), "sidebar tem Centro de Operações");

  // Expand presentation briefly
  await page.locator('[aria-controls="demo-mode-options"]').click();
  await page.waitForTimeout(300);
  const chrome2 = await page.locator("[data-demo-chrome]").first().getAttribute("data-demo-chrome");
  push(chrome2 === "expanded", "chrome expansível sob demanda");
  await shot(page, "shell-presentation-expanded");
  // collapse again
  await page.locator('[aria-controls="demo-mode-options"]').click();

  // Centro Ops perf cold/warm
  for (const label of ["cold", "warm", "warm2"]) {
    const t0 = Date.now();
    const res = await page.goto(`${BASE_URL}/${TENANT}/centro-operacoes`, {
      waitUntil: "domcontentloaded",
      timeout: 180000,
    });
    await page.waitForTimeout(600);
    const navMs = Date.now() - t0;
    const vitals = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0];
      const paints = performance.getEntriesByType("paint");
      const fcp = paints.find((p) => p.name === "first-contentful-paint")?.startTime;
      return {
        ttfb: nav ? Math.round(nav.responseStart) : null,
        fcp: fcp != null ? Math.round(fcp) : null,
      };
    });
    const body = await page.locator("body").innerText();
    const useful = /Quadro da opera|Atualizado|Atendimento|Em opera|Centro de Opera/i.test(body);
    report.perf.push({ label, navMs, status: res?.status() ?? 0, useful, ...vitals });
    push(res?.status() === 200 && useful, `centro-ops ${label} ${navMs}ms useful=${useful}`);
    if (label === "warm2") await shot(page, "centro-ops-after");
  }

  const cold = report.perf.find((p) => p.label === "cold");
  const warm = report.perf.find((p) => p.label === "warm");
  push(
    cold && cold.navMs <= 4000,
    `meta cold ≤4000ms (got ${cold?.navMs ?? "?"})`,
  );
  push(
    warm && warm.navMs <= 2500,
    `meta warm ≤2500ms (got ${warm?.navMs ?? "?"}) — aspiracional`,
  );

  // Analytics
  await page.goto(`${BASE_URL}/${TENANT}/analytics`, {
    waitUntil: "domcontentloaded",
    timeout: 180000,
  });
  await page.waitForTimeout(2000);
  const analyticsBody = await page.locator("body").innerText();
  push(!/lib\/finance\/cash-intelligence/.test(analyticsBody), "analytics sem path lib/finance face");
  await shot(page, "analytics-after");

  // Equipe / configurações
  await page.goto(`${BASE_URL}/${TENANT}/configuracoes`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForTimeout(800);
  const cfg = await page.locator("body").innerText();
  push(/em breve|Sprint 30\.2|em evolução/i.test(cfg), "equipe stub honesto");
  push(!/UUID|convidar membro(?! \(em breve\))/i.test(cfg.slice(0, 2000)), "sem falso pronto");
  await shot(page, "equipe-stub");

  // Themes
  await page.evaluate(() => {
    localStorage.setItem("gof-theme-preference", "dark");
    document.documentElement.setAttribute("data-gof-theme", "dark");
    document.documentElement.classList.add("dark");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
  push(
    (await page.locator("html").getAttribute("data-gof-theme")) === "dark",
    "tema dark",
  );
  await shot(page, "config-dark");

  await page.evaluate(() => {
    localStorage.setItem("gof-theme-preference", "light");
    document.documentElement.setAttribute("data-gof-theme", "light");
    document.documentElement.classList.remove("dark");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
  push(
    (await page.locator("html").getAttribute("data-gof-theme")) === "light",
    "tema light",
  );

  // Viewports shell + ops
  for (const vp of [
    { w: 1920, h: 1080, n: "1920" },
    { w: 1440, h: 900, n: "1440" },
    { w: 1024, h: 768, n: "1024" },
    { w: 768, h: 1024, n: "768" },
    { w: 390, h: 844, n: "390" },
    { w: 375, h: 667, n: "375" },
  ]) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.goto(`${BASE_URL}/${TENANT}/dashboard`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await page.waitForTimeout(500);
    const c = await page.locator("[data-demo-chrome]").first().getAttribute("data-demo-chrome");
    push(c === "collapsed" || c === "expanded", `viewport ${vp.n} shell chrome=${c}`);
    await shot(page, `vp-dash-${vp.n}`);
  }

  const blocking = report.consoleErrors.filter((t) => !/favicon|React DevTools/i.test(t));
  push(blocking.length === 0, `console bloqueante=${blocking.length}`);

  const pass = report.checks.filter((c) => c.ok).length;
  const fail = report.checks.filter((c) => !c.ok).length;
  report.summary = { pass, fail };
  writeFileSync(resolve(OUT, "browser-qa.json"), JSON.stringify(report, null, 2));
  console.log(`\nBrowser 30.1: ${pass} PASS · ${fail} FAIL\n`);
  // Warm aspirational is non-blocking for exit if cold meta ok
  const hardFail = report.checks.filter(
    (c) => !c.ok && !c.detail.includes("aspiracional"),
  ).length;
  process.exit(hardFail > 0 ? 1 : 0);
} finally {
  await browser.close();
}
