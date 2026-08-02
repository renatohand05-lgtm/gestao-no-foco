#!/usr/bin/env node
/**
 * Sprint 30.1.1 — Revalidação pente-fino (shell, ops, nav, analytics).
 * Equipe: confirma transição do stub 30.1 → link real 30.2 (sem regressão).
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

const OUT = resolve("docs/testing/evidence/30-1-1");
const TENANT = "teste-renato-01";
mkdirSync(resolve(OUT, "screenshots"), { recursive: true });

const report = {
  at: new Date().toISOString(),
  sprint: "30.1.1",
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
  await shot(page, "shell-collapsed");

  const sideText = await page.locator("[data-app-sidebar-premium]").innerText();
  push(!/Mecânicos/.test(sideText), "sidebar comércio sem Mecânicos");
  push(/Centro de Opera/.test(sideText), "sidebar tem Centro de Operações");

  for (const label of ["cold", "warm"]) {
    const t0 = Date.now();
    const res = await page.goto(`${BASE_URL}/${TENANT}/centro-operacoes`, {
      waitUntil: "domcontentloaded",
      timeout: 180000,
    });
    await page.waitForTimeout(600);
    const navMs = Date.now() - t0;
    const body = await page.locator("body").innerText();
    const useful = /Quadro da opera|Atualizado|Atendimento|Em opera|Centro de Opera/i.test(body);
    report.perf.push({ label, navMs, status: res?.status() ?? 0, useful });
    push(res?.status() === 200 && useful, `centro-ops ${label} ${navMs}ms useful=${useful}`);
  }
  const cold = report.perf.find((p) => p.label === "cold");
  const warm = report.perf.find((p) => p.label === "warm");
  push(Boolean(cold && cold.navMs <= 4000), `meta cold ≤4000ms (got ${cold?.navMs ?? "?"})`);
  push(
    Boolean(warm && warm.navMs <= 2500),
    `meta warm ≤2500ms (got ${warm?.navMs ?? "?"})`,
  );
  await shot(page, "centro-ops");

  await page.goto(`${BASE_URL}/${TENANT}/analytics`, {
    waitUntil: "domcontentloaded",
    timeout: 180000,
  });
  await page.waitForTimeout(1500);
  const analyticsBody = await page.locator("body").innerText();
  push(!/lib\/finance\/cash-intelligence/.test(analyticsBody), "analytics sem path técnico face");
  await shot(page, "analytics");

  await page.goto(`${BASE_URL}/${TENANT}/configuracoes`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForTimeout(800);
  const cfg = await page.locator("body").innerText();
  push(/Gerenciar equipe|Convidar membro/i.test(cfg), "configurações aponta para módulo Equipe");
  push(!/em breve|Sprint 30\.2/i.test(cfg), "stub 30.1 removido");
  await shot(page, "configuracoes");

  for (const theme of ["dark", "light"]) {
    await page.evaluate((t) => {
      localStorage.setItem("gof-theme-preference", t);
      document.documentElement.setAttribute("data-gof-theme", t);
      if (t === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    }, theme);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    push(
      (await page.locator("html").getAttribute("data-gof-theme")) === theme,
      `tema ${theme}`,
    );
  }

  for (const vp of [
    { w: 1920, h: 1080, n: "1920" },
    { w: 1024, h: 768, n: "1024" },
    { w: 390, h: 844, n: "390" },
  ]) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.goto(`${BASE_URL}/${TENANT}/dashboard`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await page.waitForTimeout(400);
    const c = await page.locator("[data-demo-chrome]").first().getAttribute("data-demo-chrome");
    push(c === "collapsed" || c === "expanded", `viewport ${vp.n} chrome=${c}`);
    await shot(page, `vp-${vp.n}`);
  }

  const blocking = report.consoleErrors.filter((t) => !/favicon|React DevTools/i.test(t));
  push(blocking.length === 0, `console bloqueante=${blocking.length}`);

  const pass = report.checks.filter((c) => c.ok).length;
  const fail = report.checks.filter((c) => !c.ok).length;
  report.summary = { pass, fail };
  writeFileSync(resolve(OUT, "browser-qa.json"), JSON.stringify(report, null, 2));
  writeFileSync(
    resolve(OUT, "browser-run.log"),
    `Browser 30.1.1: ${pass} PASS · ${fail} FAIL\n${JSON.stringify(report.perf, null, 2)}\n`,
  );
  console.log(`\nBrowser 30.1.1: ${pass} PASS · ${fail} FAIL\n`);
  process.exit(fail > 0 ? 1 : 0);
} finally {
  await browser.close();
}
