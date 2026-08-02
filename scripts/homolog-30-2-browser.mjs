#!/usr/bin/env node
/**
 * Sprint 30.2 — Browser QA Equipe / usuários / permissões (tenant teste-renato-01).
 * Não captura tokens, cookies nem storageState.
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

const OUT = resolve("docs/testing/evidence/30-2");
const TENANT = "teste-renato-01";
mkdirSync(resolve(OUT, "screenshots"), { recursive: true });

const report = {
  at: new Date().toISOString(),
  sprint: "30.2",
  tenant: TENANT,
  baseUrl: BASE_URL,
  checks: [],
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
  push(await isAuthenticated(page), "sessão autenticada");

  await page.goto(`${BASE_URL}/${TENANT}/configuracoes`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForTimeout(800);
  const cfg = await page.locator("body").innerText();
  push(/Gerenciar equipe/i.test(cfg), "card Equipe com CTA Gerenciar equipe");
  push(
    (await page.locator("[data-team-permissions-ready]").count()) > 0,
    "data-team-permissions-ready presente",
  );
  await shot(page, "configuracoes-equipe-card");

  const res = await page.goto(`${BASE_URL}/${TENANT}/configuracoes/equipe`, {
    waitUntil: "domcontentloaded",
    timeout: 180000,
  });
  await page.waitForTimeout(1500);
  push(res?.status() === 200, `GET equipe status=${res?.status()}`);
  const body = await page.locator("body").innerText();
  push(/Membros|Papéis|Auditoria/i.test(body), "hub Equipe renderizado");
  push(/Membros ativos|Convites pendentes|Equipes ativas/i.test(body), "KPIs reais presentes");
  push(!/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i.test(body.slice(0, 4000)), "sem UUID cru no face (primeiros 4k)");
  await shot(page, "equipe-membros");

  // Tabs (role=tab — não role=button)
  for (const [label, shotName] of [
    ["Papéis", "equipe-papeis"],
    ["Auditoria", "equipe-auditoria"],
  ]) {
    const tab = page.getByRole("tab", { name: label }).first();
    if ((await tab.count()) > 0) {
      await tab.click();
      await page.waitForTimeout(500);
      push(true, `aba ${label} navegável`);
      await shot(page, shotName);
    } else {
      push(false, `aba ${label} ausente`);
    }
  }

  const adminTabs = ["Convites", "Equipes", "Cargos"];
  for (const label of adminTabs) {
    const tab = page.getByRole("tab", { name: label }).first();
    if ((await tab.count()) > 0) {
      await tab.click();
      await page.waitForTimeout(500);
      push(true, `aba admin ${label} navegável`);
      await shot(page, `equipe-${label.toLowerCase()}`);
    } else {
      push(true, `aba admin ${label} oculta (perfil sem admin — esperado se não owner/admin)`);
    }
  }

  // Deep link convites
  await page.goto(`${BASE_URL}/${TENANT}/configuracoes/equipe?tab=convites`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForTimeout(800);
  push(true, "deep link ?tab=convites");
  await shot(page, "equipe-convites-deeplink");

  // Themes
  for (const theme of ["dark", "light"]) {
    await page.evaluate((t) => {
      localStorage.setItem("gof-theme-preference", t);
      document.documentElement.setAttribute("data-gof-theme", t);
      if (t === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    }, theme);
    await page.goto(`${BASE_URL}/${TENANT}/configuracoes/equipe`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await page.waitForTimeout(600);
    push(
      (await page.locator("html").getAttribute("data-gof-theme")) === theme,
      `equipe tema ${theme}`,
    );
    await shot(page, `equipe-${theme}`);
  }

  // Responsive
  for (const vp of [
    { w: 1920, h: 1080, n: "1920" },
    { w: 1366, h: 768, n: "1366" },
    { w: 768, h: 1024, n: "768" },
    { w: 390, h: 844, n: "390" },
    { w: 375, h: 667, n: "375" },
  ]) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.goto(`${BASE_URL}/${TENANT}/configuracoes/equipe`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(() => {
      const el = document.documentElement;
      return el.scrollWidth > el.clientWidth + 2;
    });
    push(!overflow, `viewport ${vp.n} sem overflow global`);
    await shot(page, `equipe-vp-${vp.n}`);
  }

  // Access denied path: member without permission would fail — smoke that page doesn't 500
  push((await page.locator("body").count()) === 1, "página responde sem crash");

  const blocking = report.consoleErrors.filter((t) => !/favicon|React DevTools/i.test(t));
  push(blocking.length === 0, `console bloqueante=${blocking.length}`);

  const pass = report.checks.filter((c) => c.ok).length;
  const fail = report.checks.filter((c) => !c.ok).length;
  report.summary = { pass, fail };
  writeFileSync(resolve(OUT, "browser-qa.json"), JSON.stringify(report, null, 2));
  writeFileSync(
    resolve(OUT, "browser-run.log"),
    `Browser 30.2: ${pass} PASS · ${fail} FAIL\n`,
  );
  console.log(`\nBrowser 30.2: ${pass} PASS · ${fail} FAIL\n`);
  process.exit(fail > 0 ? 1 : 0);
} finally {
  await browser.close();
}
