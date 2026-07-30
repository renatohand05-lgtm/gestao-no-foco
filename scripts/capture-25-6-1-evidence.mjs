/**
 * Sprint 25.6.1 — Screenshots reais landing + dashboard.
 *
 * Pré-requisitos:
 *   npm run dev (saudável)
 *   docs/testing/playwright/.auth/user.json (npm run test:login) — só dashboard
 *
 * Uso:
 *   NEXT_PUBLIC_APP_URL=http://localhost:3000 node scripts/capture-25-6-1-evidence.mjs
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
const OUT = resolve(ROOT, "docs/testing/evidence/25-6-1");
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "1920", width: 1920, height: 1080 },
  { name: "1440", width: 1440, height: 900 },
  { name: "1366", width: 1366, height: 768 },
  { name: "tablet", width: 767, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
];

async function shot(page, name) {
  const path = resolve(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
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
      // Overflow da página só conta se o conteúdo premium/landing extrapola
      pageOverflow: rootOverflows && scrollW > clientW + 8,
      cashOverflow,
      kpiBroken,
      scrollW,
      clientW,
    };
  });
}

async function main() {
  console.log("Evidence 25.6.1");
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
    // Landing (sem auth)
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
      const overflow = await measureOverflow(landing);
      report.checks.push({ page: `landing-${vp.name}`, ...overflow });
    }
    await landing.close();

    // Dashboard (com auth)
    if (!existsSync(AUTH_FILE)) {
      report.errors.push(`Auth ausente: ${AUTH_FILE}`);
      console.warn("  WARN dashboard pulado — rode npm run test:login");
    } else {
      const context = await browser.newContext({
        storageState: AUTH_FILE,
      });
    // Colapsa sidebar no tablet para medir overflow do conteúdo
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

      // Descobrir tenant pela URL após redirect
      let url = page.url();
      if (!isAuthenticated(page) && !url.includes("/dashboard")) {
        // tenta ir a um path conhecido via storage
        await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle", timeout: 90000 }).catch(() => null);
        url = page.url();
      }

      const match = url.match(/\/([^/]+)\/(dashboard|primeiro-acesso)/);
      let tenant = match?.[1];
      if (!tenant) {
        // fallback: procurar link dashboard
        const href = await page
          .locator('a[href*="/dashboard"]')
          .first()
          .getAttribute("href")
          .catch(() => null);
        tenant = href?.split("/").filter(Boolean)[0] ?? null;
      }

      if (!tenant) {
        report.errors.push("Não foi possível resolver tenant para dashboard");
        console.warn("  WARN tenant não resolvido");
      } else {
        for (const theme of ["dark", "light"]) {
          await page.setViewportSize({ width: 1440, height: 900 });
          await page.goto(`${BASE_URL}/${tenant}/dashboard`, {
            waitUntil: "domcontentloaded",
            timeout: 90000,
          });
          await setTheme(page, theme);
          await page
            .waitForSelector("[data-dashboard-premium-v2561]", {
              timeout: 90000,
            })
            .catch(() => null);
          await page.waitForTimeout(2000);
          report.shots.push(
            await shot(page, `dashboard-1440-${theme}`),
          );
          report.checks.push({
            page: `dashboard-1440-${theme}`,
            ...(await measureOverflow(page)),
          });
        }

        for (const vp of VIEWPORTS) {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.goto(`${BASE_URL}/${tenant}/dashboard`, {
            waitUntil: "domcontentloaded",
            timeout: 90000,
          });
          await setTheme(page, "dark");
          await page
            .waitForSelector("[data-dashboard-premium-v2561]", {
              timeout: 90000,
            })
            .catch(() => null);
          // Tablet: garante sidebar icon/sheet (evita overflow do shell)
          if (vp.width <= 768) {
            await page.evaluate(() => {
              document.cookie =
                "sidebar_state=false; path=/; max-age=604800";
            });
            const trigger = page.locator('[data-sidebar="trigger"]').first();
            if (await trigger.count()) {
              // Se sidebar expandida em desktop estreito, colapsa
              const expanded = await page
                .locator('[data-state="expanded"][data-slot="sidebar"]')
                .count()
                .catch(() => 0);
              if (expanded > 0 && vp.width >= 768) {
                await trigger.click().catch(() => null);
                await page.waitForTimeout(400);
              }
            }
          }
          await page.waitForTimeout(1800);
          report.shots.push(await shot(page, `dashboard-${vp.name}-dark`));
          report.checks.push({
            page: `dashboard-${vp.name}-dark`,
            ...(await measureOverflow(page)),
          });
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
    const ok =
      !c.pageOverflow && !c.cashOverflow && !c.kpiBroken;
    console.log(
      `  ${ok ? "OK" : "ISSUE"} ${c.page} overflow=${c.pageOverflow} cash=${c.cashOverflow} kpiBroken=${c.kpiBroken}`,
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
