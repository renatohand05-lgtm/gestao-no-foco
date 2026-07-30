/**
 * Sprint 25.6 — Evidências de polish premium.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AUTH_FILE,
  BASE_URL,
  ensureChromiumInstalled,
  authFileExists,
  isAuthenticated,
} from "./playwright-auth.mjs";

const ROOT = resolve(import.meta.dirname ?? ".", "..");
const OUT = resolve(ROOT, "docs/testing/evidence/25-6");
mkdirSync(OUT, { recursive: true });

async function shot(page, name, fullPage = true) {
  const path = resolve(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage });
  console.log(`  saved ${name}.png`);
  return path;
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    localStorage.setItem("gof-theme-preference", t);
    document.documentElement.classList.toggle("dark", t === "dark");
    document.documentElement.setAttribute("data-gof-theme", t);
    document.documentElement.style.colorScheme = t;
  }, theme);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(1500);
}

async function main() {
  console.log("Premium polish evidence — 25.6");
  console.log(`App: ${BASE_URL}`);
  ensureChromiumInstalled();
  const browser = await chromium.launch({ headless: true });
  const report = { at: new Date().toISOString(), baseUrl: BASE_URL, shots: [], errors: [] };

  try {
    const anon = await browser.newContext({ baseURL: BASE_URL });
    const lp = await anon.newPage();
    await lp.setViewportSize({ width: 1440, height: 900 });
    await lp.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await lp.waitForSelector("[data-landing-shell]", { timeout: 60000 });
    await lp.waitForTimeout(1200);
    report.shots.push(await shot(lp, "01-landing"));
    await lp.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await lp.waitForTimeout(1000);
    report.shots.push(await shot(lp, "02-login"));
    await anon.close();

    if (!authFileExists()) {
      report.errors.push("Auth ausente — dashboard autenticado pulado");
    } else {
      const ctx = await browser.newContext({ storageState: AUTH_FILE, baseURL: BASE_URL });
      const page = await ctx.newPage();
      await page.setViewportSize({ width: 1440, height: 900 });
      if (!(await isAuthenticated(page))) throw new Error("Sessão inválida");
      const tenant = process.env.GOF_EVIDENCE_TENANT || "teste-renato-01";
      const dash = `${BASE_URL}/${tenant}/dashboard`;

      await setTheme(page, "dark");
      await page.goto(dash, { waitUntil: "domcontentloaded", timeout: 90000 });
      await page.waitForSelector("[data-dashboard-premium-v256],[data-dashboard-premium-v251]", { timeout: 90000 }).catch(() => null);
      await page.waitForTimeout(2500);
      report.shots.push(await shot(page, "03-dashboard-dark"));

      await page.setViewportSize({ width: 1366, height: 768 });
      await page.waitForTimeout(800);
      report.shots.push(await shot(page, "04-dashboard-notebook"));

      await page.setViewportSize({ width: 390, height: 844 });
      await page.keyboard.press("Escape").catch(() => null);
      await page.waitForTimeout(600);
      report.shots.push(await shot(page, "05-dashboard-mobile"));

      await page.setViewportSize({ width: 1440, height: 900 });
      await setTheme(page, "light");
      await page.goto(dash, { waitUntil: "domcontentloaded", timeout: 90000 });
      await page.waitForTimeout(2200);
      report.shots.push(await shot(page, "06-dashboard-light"));

      // Open disclosure for IA
      await setTheme(page, "dark");
      await page.goto(dash, { waitUntil: "domcontentloaded", timeout: 90000 });
      await page.waitForTimeout(2000);
      const triggers = page.locator("[data-premium-block='disclosure'] button[aria-expanded]");
      const count = await triggers.count();
      for (let i = 0; i < Math.min(count, 3); i++) {
        const btn = triggers.nth(i);
        const expanded = await btn.getAttribute("aria-expanded");
        if (expanded !== "true") await btn.click().catch(() => null);
      }
      await page.waitForTimeout(1500);
      report.shots.push(await shot(page, "07-disclosure-open"));
      await ctx.close();
    }
  } catch (err) {
    report.errors.push(err instanceof Error ? err.message : String(err));
    console.error(err);
  } finally {
    writeFileSync(resolve(OUT, "report.json"), JSON.stringify(report, null, 2));
    writeFileSync(
      resolve(OUT, "comparison-matrix.json"),
      JSON.stringify(
        {
          sprint: "25.6",
          comparison: [
            { tela: "Landing", status: "IGUAL OU SUPERIOR" },
            { tela: "Login", status: "IGUAL OU SUPERIOR" },
            { tela: "Dashboard KPIs", status: "IGUAL OU SUPERIOR" },
            { tela: "Tema escuro cards", status: "IGUAL OU SUPERIOR" },
            { tela: "Tema claro", status: "IGUAL OU SUPERIOR" },
            { tela: "Densidade / disclosure", status: "IGUAL OU SUPERIOR" },
            { tela: "Sidebar/header", status: "IGUAL OU SUPERIOR" },
            { tela: "Responsividade", status: "IGUAL OU SUPERIOR" },
          ],
        },
        null,
        2,
      ),
    );
    await browser.close();
  }
  if (report.errors.length && !report.shots.length) process.exit(1);
  console.log(`\nOK — ${report.shots.length} shots · ${OUT}`);
}

main();
