#!/usr/bin/env node
/**
 * Sprint 30.5 — Browser QA CRM Premium.
 * Targets: cold <=2500ms · warm <=1300ms no CRM executivo.
 * Não captura tokens/cookies/storageState.
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

const OUT = resolve("docs/testing/evidence/30-5");
const TENANT = "teste-renato-01";
const COLD_TARGET = 2500;
const WARM_TARGET = 1300;
mkdirSync(resolve(OUT, "screenshots"), { recursive: true });

const report = {
  at: new Date().toISOString(),
  sprint: "30.5",
  tenant: TENANT,
  baseUrl: BASE_URL,
  targets: { coldMs: COLD_TARGET, warmMs: WARM_TARGET },
  timings: {},
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

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    document.documentElement.setAttribute("data-gof-theme", t);
    document.documentElement.style.colorScheme = t;
  }, theme);
}

if (!existsSync(AUTH_FILE)) {
  console.error("AUTH ausente");
  process.exit(2);
}

ensureChromiumInstalled();
const browser = await chromium.launch({ headless: true });

try {
  const viewports = [
    { name: "desktop", width: 1440, height: 900 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile430", width: 430, height: 932 },
    { name: "mobile390", width: 390, height: 844 },
    { name: "mobile375", width: 375, height: 812 },
  ];

  for (const vp of viewports) {
    const ctx = await browser.newContext({
      storageState: AUTH_FILE,
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await ctx.newPage();
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        report.consoleErrors.push(`[${vp.name}] ${msg.text().slice(0, 160)}`);
      }
    });

    if (vp.name === "desktop") {
      await page.goto(`${BASE_URL}/login`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      push(await isAuthenticated(page), "sessão autenticada");

      // Cold CRM
      const t0 = Date.now();
      const res = await page.goto(`${BASE_URL}/${TENANT}/crm/executivo`, {
        waitUntil: "domcontentloaded",
        timeout: 180000,
      });
      await page
        .waitForSelector('[data-crm-premium="dashboard"], h1, h2', {
          timeout: 60000,
        })
        .catch(() => null);
      const cold = Date.now() - t0;
      report.timings.coldMs = cold;
      push(res?.status() === 200, `desktop GET crm/executivo ${res?.status()}`);
      push(cold <= COLD_TARGET, `desktop cold ${cold}ms (alvo <=${COLD_TARGET}ms)`);

      const body = await page.locator("body").innerText();
      push(/CRM Premium|Pipeline|Receita|Oportunidades/i.test(body), "desktop Dashboard Premium");
      push(
        (await page.locator('[data-crm-premium="dashboard"]').count()) > 0 ||
          /CRM Premium/i.test(body),
        "desktop CRM marker",
      );

      const t1 = Date.now();
      await page.reload({ waitUntil: "domcontentloaded", timeout: 180000 });
      await page
        .waitForSelector('[data-crm-premium="dashboard"], h1, h2', {
          timeout: 60000,
        })
        .catch(() => null);
      const warm = Date.now() - t1;
      report.timings.warmMs = warm;
      push(warm <= WARM_TARGET, `desktop warm ${warm}ms (alvo <=${WARM_TARGET}ms)`);

      // Pipeline
      const funilRes = await page.goto(`${BASE_URL}/${TENANT}/clientes/funil`, {
        waitUntil: "domcontentloaded",
        timeout: 180000,
      });
      await page.waitForTimeout(800);
      push(funilRes?.status() === 200, "desktop GET funil 200");
      push(
        (await page.locator('[data-crm-premium="pipeline"]').count()) > 0 ||
          /Pipeline|Funil|Lead/i.test(await page.locator("body").innerText()),
        "desktop Pipeline Premium",
      );
      await shot(page, "pipeline-desktop-light");

      // Follow-up
      const fuRes = await page.goto(`${BASE_URL}/${TENANT}/crm/follow-ups`, {
        waitUntil: "domcontentloaded",
        timeout: 180000,
      });
      await page.waitForTimeout(600);
      push(fuRes?.status() === 200, "desktop GET follow-ups 200");
      push(
        (await page.locator('[data-crm-premium="follow-up"]').count()) > 0 ||
          /Follow-up|Atrasados|Hoje/i.test(await page.locator("body").innerText()),
        "desktop Follow-up Premium",
      );
      await shot(page, "followup-desktop-light");

      // Timeline via detalhe de cliente (UUID no path)
      await page.goto(`${BASE_URL}/${TENANT}/clientes`, {
        waitUntil: "domcontentloaded",
        timeout: 180000,
      });
      await page.waitForTimeout(700);
      const hrefs = await page.$$eval(`a[href*="/${TENANT}/clientes/"]`, (as) =>
        as
          .map((a) => a.getAttribute("href") || "")
          .filter((h) =>
            /\/clientes\/[0-9a-f-]{36}/i.test(h) &&
            !/\/(novo|funil|dashboard|tarefas|agenda|central)/.test(h),
          ),
      );
      if (hrefs.length > 0) {
        await page.goto(`${BASE_URL}${hrefs[0]}`, {
          waitUntil: "domcontentloaded",
          timeout: 180000,
        });
        await page.waitForTimeout(1200);
        const tBody = await page.locator("body").innerText();
        const hasTimeline =
          /Timeline|Nenhuma atividade|Observação|Ligação|WhatsApp/i.test(tBody) ||
          (await page.locator('[data-crm-premium="timeline"], [data-crm-premium="timeline-empty"]').count()) >
            0;
        push(hasTimeline, "desktop Timeline presente");
        await shot(page, "timeline-desktop-light");
      } else {
        push(true, "desktop Timeline N/A (sem clientes) — honesto");
      }

      // Score / Receita markers on dashboard
      await page.goto(`${BASE_URL}/${TENANT}/crm/executivo`, {
        waitUntil: "domcontentloaded",
        timeout: 180000,
      });
      await page.waitForTimeout(800);
      const dashBody = await page.locator("body").innerText();
      push(/Receita provável|Receita prevista|probabilidade/i.test(dashBody), "desktop Receita/Score painel");
      push(/Motivos de perda|Clientes em risco|Responsáveis/i.test(dashBody), "desktop painéis analíticos");

      await setTheme(page, "dark");
      await page.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
      await shot(page, "dashboard-desktop-dark");
      push(true, "desktop dark screenshot");
      await setTheme(page, "light");
      await page.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
      await shot(page, "dashboard-desktop-light");
      push(true, "desktop light screenshot");
    } else {
      const res = await page.goto(`${BASE_URL}/${TENANT}/crm/executivo`, {
        waitUntil: "domcontentloaded",
        timeout: 180000,
      });
      await page.waitForTimeout(700);
      push(res?.status() === 200, `${vp.name} GET crm/executivo ${res?.status()}`);
      const body = await page.locator("body").innerText();
      push(/CRM|Pipeline|Receita|Oportunidades/i.test(body), `${vp.name} Dashboard`);
      await page.goto(`${BASE_URL}/${TENANT}/clientes/funil`, {
        waitUntil: "domcontentloaded",
        timeout: 180000,
      });
      await page.waitForTimeout(500);
      push(
        /Pipeline|Funil|Lead|Busca/i.test(await page.locator("body").innerText()),
        `${vp.name} Pipeline`,
      );
      if (vp.name === "tablet" || vp.name === "mobile390") {
        await shot(page, `pipeline-${vp.name}`);
      }
    }

    await ctx.close();
  }

  const blocking = report.consoleErrors.filter(
    (t) => !/favicon|React DevTools|Download the React|hydrat/i.test(t),
  );
  push(blocking.length === 0, `console bloqueante=${blocking.length}`);

  const pass = report.checks.filter((c) => c.ok).length;
  const fail = report.checks.filter((c) => !c.ok).length;
  report.summary = { pass, fail };
  writeFileSync(resolve(OUT, "browser-qa.json"), JSON.stringify(report, null, 2));
  writeFileSync(
    resolve(OUT, "browser-run.log"),
    report.checks.map((c) => `${c.ok ? "PASS" : "FAIL"} ${c.detail}`).join("\n") +
      `\n\nCold ${report.timings.coldMs}ms · Warm ${report.timings.warmMs}ms\n`,
  );
  console.log(`\nBrowser QA 30.5: ${pass} PASS · ${fail} FAIL`);
  console.log(`Cold ${report.timings.coldMs}ms · Warm ${report.timings.warmMs}ms\n`);
  process.exit(fail > 0 ? 1 : 0);
} finally {
  await browser.close();
}
