/**
 * Sprint 25.7 — Screenshots reais (landing, login, dashboard, painéis).
 *
 * Pré-requisitos:
 *   npm run dev
 *   docs/testing/playwright/.auth/user.json (npm run test:login) — dashboard
 *
 * Uso:
 *   NEXT_PUBLIC_APP_URL=http://localhost:3000 node scripts/capture-25-7-evidence.mjs
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

const ROOT = resolve(import.meta.dirname ?? ".", "..");
const OUT = resolve(ROOT, "docs/testing/evidence/25-7");
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "1920", width: 1920, height: 1080 },
  { name: "1440", width: 1440, height: 900 },
  { name: "1366", width: 1366, height: 768 },
  { name: "tablet", width: 767, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
];

async function shot(page, name, fullPage = false) {
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
  await page.waitForTimeout(1600);
}

async function measureOverflow(page) {
  return page.evaluate(() => {
    const root =
      document.querySelector("[data-dashboard-premium-v257]") ||
      document.querySelector("[data-dashboard-premium-v2561]") ||
      document.querySelector("[data-landing-hero-final]") ||
      document.body;
    const doc = document.documentElement;
    const body = document.body;
    const scrollW = Math.max(doc.scrollWidth, body?.scrollWidth ?? 0);
    const clientW = doc.clientWidth;
    const rootRect = root.getBoundingClientRect();
    const rootOverflows =
      root.scrollWidth > root.clientWidth + 2 ||
      rootRect.right > clientW + 2;
    const kpiBroken = Array.from(
      document.querySelectorAll("[data-kpi-value]"),
    ).some((el) => el.scrollWidth > el.clientWidth + 4);
    const cash = document.querySelector("[data-cash-panel]");
    const cashOverflow = cash
      ? cash.scrollWidth > cash.clientWidth + 2
      : false;
    return {
      pageOverflow: rootOverflows && scrollW > clientW + 8,
      cashOverflow,
      kpiBroken,
      scrollW,
      clientW,
      hasV257: Boolean(document.querySelector("[data-dashboard-premium-v257]")),
      hasBriefing: Boolean(
        document.querySelector('[data-premium-block="executive-briefing"]'),
      ),
      hasMatrix: Boolean(
        document.querySelector('[data-premium-v257="impact-effort-matrix"]'),
      ),
      hasHealth: Boolean(
        document.querySelector('[data-premium-v257="business-health"]'),
      ),
    };
  });
}

async function resolveTenant(page) {
  let url = page.url();
  const match = url.match(/\/([^/]+)\/(dashboard|primeiro-acesso)/);
  let tenant = match?.[1];
  if (!tenant) {
    const href = await page
      .locator('a[href*="/dashboard"]')
      .first()
      .getAttribute("href")
      .catch(() => null);
    tenant = href?.split("/").filter(Boolean)[0] ?? null;
  }
  return tenant;
}

async function main() {
  console.log("Evidence 25.7");
  console.log(`App: ${BASE_URL}`);
  console.log(`Out: ${OUT}`);
  ensureChromiumInstalled();

  const browser = await chromium.launch({ headless: true });
  const report = {
    at: new Date().toISOString(),
    baseUrl: BASE_URL,
    shots: [],
    checks: [],
    errors: [],
  };

  try {
    const landing = await browser.newPage();
    for (const vp of VIEWPORTS) {
      await landing.setViewportSize({ width: vp.width, height: vp.height });
      await landing.goto(`${BASE_URL}/`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await landing.waitForSelector("[data-landing-hero-final]", {
        timeout: 60000,
      });
      await landing.waitForTimeout(1200);
      report.shots.push(await shot(landing, `landing-${vp.name}`));
      report.checks.push({
        page: `landing-${vp.name}`,
        ...(await measureOverflow(landing)),
      });
    }
    await landing.close();

    const login = await browser.newPage();
    await login.setViewportSize({ width: 1440, height: 900 });
    await login.goto(`${BASE_URL}/login`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await login.waitForTimeout(1200);
    report.shots.push(await shot(login, "login-1440"));
    await login.close();

    if (!existsSync(AUTH_FILE)) {
      report.errors.push(`Auth ausente: ${AUTH_FILE}`);
      console.warn("  WARN dashboard pulado — rode npm run test:login");
    } else {
      const context = await browser.newContext({
        storageState: AUTH_FILE,
      });
      await context.addCookies([
        {
          name: "sidebar_state",
          value: "false",
          url: BASE_URL,
        },
      ]);
      const page = await context.newPage();
      await page.goto(`${BASE_URL}/`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await page.waitForTimeout(2000);
      if (!isAuthenticated(page) && !page.url().includes("/dashboard")) {
        await page
          .goto(`${BASE_URL}/`, { waitUntil: "networkidle", timeout: 90000 })
          .catch(() => null);
      }

      const tenant = await resolveTenant(page);
      if (!tenant) {
        report.errors.push("Não foi possível resolver tenant para dashboard");
      } else {
        // Early load for loader frame
        await page.setViewportSize({ width: 1440, height: 900 });
        const loaderNav = page.goto(`${BASE_URL}/${tenant}/dashboard`, {
          waitUntil: "commit",
          timeout: 90000,
        });
        await page.waitForTimeout(350);
        report.shots.push(await shot(page, "loader-or-early-1440"));
        await loaderNav.catch(() => null);
        await page
          .waitForSelector(
            "[data-dashboard-premium-v257], [data-dashboard-premium-v2561]",
            { timeout: 90000 },
          )
          .catch(() => null);
        await page.waitForTimeout(2200);
        report.shots.push(await shot(page, "dashboard-initial-1440-dark"));

        for (const theme of ["dark", "light"]) {
          await setTheme(page, theme);
          await page
            .waitForSelector(
              "[data-dashboard-premium-v257], [data-dashboard-premium-v2561]",
              { timeout: 90000 },
            )
            .catch(() => null);
          await page.waitForTimeout(1800);
          report.shots.push(await shot(page, `dashboard-1440-${theme}`));
          report.checks.push({
            page: `dashboard-1440-${theme}`,
            ...(await measureOverflow(page)),
          });

          // Scroll panels
          await page.evaluate(() => {
            document
              .querySelector('[data-premium-v257="business-health"]')
              ?.scrollIntoView({ block: "center" });
          });
          await page.waitForTimeout(600);
          report.shots.push(await shot(page, `business-health-1440-${theme}`));

          await page.evaluate(() => {
            document
              .querySelector('[data-premium-v257="decision-center"]')
              ?.scrollIntoView({ block: "center" });
          });
          await page.waitForTimeout(600);
          report.shots.push(await shot(page, `decision-center-1440-${theme}`));

          await page.evaluate(() => {
            document
              .querySelector('[data-premium-v257="executive-ai"]')
              ?.scrollIntoView({ block: "center" });
          });
          await page.waitForTimeout(600);
          report.shots.push(await shot(page, `executive-ai-1440-${theme}`));
        }

        for (const vp of VIEWPORTS) {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.goto(`${BASE_URL}/${tenant}/dashboard`, {
            waitUntil: "domcontentloaded",
            timeout: 90000,
          });
          await setTheme(page, "dark");
          await page
            .waitForSelector(
              "[data-dashboard-premium-v257], [data-dashboard-premium-v2561]",
              { timeout: 90000 },
            )
            .catch(() => null);
          await page.waitForTimeout(1800);
          report.shots.push(await shot(page, `dashboard-${vp.name}-dark`));
          report.checks.push({
            page: `dashboard-${vp.name}-dark`,
            ...(await measureOverflow(page)),
          });
        }

        // Sidebar / header close-ups
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto(`${BASE_URL}/${tenant}/dashboard`, {
          waitUntil: "domcontentloaded",
          timeout: 90000,
        });
        await setTheme(page, "dark");
        await page.waitForTimeout(1500);
        const header = page.locator("[data-premium-v257='header']").first();
        if (await header.count()) {
          await header.screenshot({
            path: resolve(OUT, "header-1440-dark.png"),
          });
          report.shots.push(resolve(OUT, "header-1440-dark.png"));
        }
        const sidebar = page.locator("[data-premium-v257='sidebar']").first();
        if (await sidebar.count()) {
          await sidebar.screenshot({
            path: resolve(OUT, "sidebar-1440-dark.png"),
          });
          report.shots.push(resolve(OUT, "sidebar-1440-dark.png"));
        }
      }
      await context.close();
    }
  } catch (err) {
    report.errors.push(String(err));
    console.error(err);
  } finally {
    await browser.close();
  }

  writeFileSync(resolve(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log("\nChecks:");
  for (const c of report.checks) {
    const ok = !c.pageOverflow && !c.cashOverflow && !c.kpiBroken;
    console.log(
      `  ${ok ? "OK" : "ISSUE"} ${c.page} overflow=${c.pageOverflow} cash=${c.cashOverflow} kpiBroken=${c.kpiBroken} v257=${c.hasV257}`,
    );
  }
  if (report.errors.length) {
    console.log("\nErrors:", report.errors);
    process.exit(1);
  }
  console.log(`\nDone → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
