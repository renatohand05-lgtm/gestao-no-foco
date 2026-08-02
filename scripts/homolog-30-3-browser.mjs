#!/usr/bin/env node
/**
 * Sprint 30.3 — Browser QA onboarding enterprise.
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

const OUT = resolve("docs/testing/evidence/30-3");
const TENANT = "teste-renato-01";
mkdirSync(resolve(OUT, "screenshots"), { recursive: true });

const report = {
  at: new Date().toISOString(),
  sprint: "30.3",
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

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    document.documentElement.style.colorScheme = t;
  }, theme);
}

if (!existsSync(AUTH_FILE)) {
  console.error("AUTH ausente — rode o fluxo de login Playwright antes.");
  process.exit(2);
}

ensureChromiumInstalled();
const browser = await chromium.launch({ headless: true });

try {
  const viewports = [
    { name: "desktop", width: 1440, height: 900 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    const ctx = await browser.newContext({
      storageState: AUTH_FILE,
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await ctx.newPage();
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        report.consoleErrors.push(`[${vp.name}] ${msg.text().slice(0, 200)}`);
      }
    });

    if (vp.name === "desktop") {
      await page.goto(`${BASE_URL}/login`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      push(await isAuthenticated(page), "sessão autenticada");
    }

    const res = await page.goto(`${BASE_URL}/${TENANT}/primeiro-acesso`, {
      waitUntil: "domcontentloaded",
      timeout: 180000,
    });
    await page.waitForTimeout(1200);
    push(res?.status() === 200, `${vp.name} GET primeiro-acesso ${res?.status()}`);

    const body = await page.locator("body").innerText();
    push(
      /Bem-vindo|Segmento|Onboarding enterprise|configurar sua empresa/i.test(body),
      `${vp.name} wizard enterprise visível`,
    );
    push(
      (await page.locator('[role="progressbar"]').count()) > 0,
      `${vp.name} progressbar presente`,
    );

    await setTheme(page, "light");
    await shot(page, `${vp.name}-light`);

    await setTheme(page, "dark");
    await shot(page, `${vp.name}-dark`);

    if (vp.name === "desktop") {
      await page.evaluate((slug) => {
        try {
          localStorage.removeItem(`gof-enterprise-onboarding:${slug}`);
        } catch {
          /* ignore */
        }
      }, TENANT);
      await page.goto(`${BASE_URL}/${TENANT}/primeiro-acesso`, {
        waitUntil: "domcontentloaded",
        timeout: 180000,
      });
      await page.waitForTimeout(1000);

      // Volta ao início do wizard (meta pode ter avançado em runs anteriores)
      for (let i = 0; i < 10; i++) {
        const atWelcome = /Vamos configurar sua empresa em poucos minutos/i.test(
          await page.locator("body").innerText(),
        );
        if (atWelcome) break;
        const back = page.getByRole("button", { name: /^Voltar$/i }).first();
        if ((await back.count()) === 0 || (await back.isDisabled())) break;
        await back.click();
        await page.waitForTimeout(400);
      }

      async function clickContinuar() {
        const btn = page.getByRole("button", { name: /^Continuar$/i }).first();
        await btn.waitFor({ state: "visible", timeout: 10000 });
        await expectEnabled(btn);
        await btn.click();
        await page.waitForTimeout(1200);
      }

      async function expectEnabled(btn) {
        for (let i = 0; i < 20; i++) {
          if (!(await btn.isDisabled())) return;
          await page.waitForTimeout(200);
        }
      }

      // welcome → segment
      await clickContinuar();
      try {
        await page.waitForSelector("#segment-search", { timeout: 15000 });
      } catch {
        /* checked below */
      }
      push(
        (await page.locator("#segment-search").count()) > 0,
        "etapa segmento acessível",
      );

      await page.fill("#segment-search", "oficina");
      await page.waitForTimeout(300);
      const oficina = page.getByRole("option", { name: /Oficina Mecânica/i }).first();
      if ((await oficina.count()) > 0) {
        await oficina.click();
        push(true, "segmento Oficina selecionável");
      } else {
        push(false, "segmento Oficina selecionável");
      }
      await shot(page, "segment-picker");

      await page.fill("#segment-search", "restaurante");
      await page.waitForTimeout(300);
      const rest = page.getByRole("option", { name: /Restaurante/i }).first();
      if ((await rest.count()) > 0) {
        await rest.click();
        push(true, "troca de segmento (restaurante)");
      } else {
        push(false, "troca de segmento (restaurante)");
      }

      await page.fill("#segment-search", "");
      await page.waitForTimeout(200);
      const of2 = page.getByRole("option", { name: /Oficina Mecânica/i }).first();
      if ((await of2.count()) > 0) await of2.click();

      await clickContinuar();
      try {
        await page.waitForSelector("#company-tradeName", { timeout: 15000 });
      } catch {
        /* checked below */
      }
      push(
        (await page.locator("#company-tradeName").count()) > 0 ||
          /Nome fantasia|Razão social|CNPJ/i.test(
            await page.locator("body").innerText(),
          ),
        "etapa dados da empresa",
      );
      await shot(page, "company-form");

      const seen = new Set();
      for (let i = 0; i < 12; i++) {
        const t = await page.locator("body").innerText();
        if (
          /Somente templates|Template Oficina|Template Restaurante|Entendi — aplicar estrutura/i.test(
            t,
          ) &&
          !seen.has("templates")
        ) {
          seen.add("templates");
          push(true, "templates visíveis");
          await shot(page, "templates");
          const ack = page.getByRole("checkbox").first();
          if ((await ack.count()) > 0) await ack.check();
        }
        if (
          /Progresso: \d+%|Checklist de implantação/i.test(t) &&
          !seen.has("checklist")
        ) {
          seen.add("checklist");
          push(true, "checklist visível");
          await shot(page, "checklist");
        }
        if (
          /Área preparada para importação|Excel|Arquitetura pronta/i.test(t) &&
          !seen.has("import")
        ) {
          seen.add("import");
          push(true, "import prep visível");
          await shot(page, "import-prep");
        }
        if (
          (/Parabéns!/i.test(t) || /Sua empresa está pronta/i.test(t)) &&
          !seen.has("complete")
        ) {
          seen.add("complete");
          push(true, "conclusão / assistente executivo");
          await shot(page, "complete");
          break;
        }

        const dash = page.getByRole("button", { name: /Ir ao Dashboard/i }).first();
        if ((await dash.count()) > 0 && /pronta/i.test(t)) {
          if (!seen.has("complete")) {
            seen.add("complete");
            push(true, "conclusão / assistente executivo");
            await shot(page, "complete");
          }
          break;
        }

        const btn = page.getByRole("button", { name: /^Continuar$/i }).first();
        if ((await btn.count()) === 0) break;
        await expectEnabled(btn);
        await btn.click();
        await page.waitForTimeout(1400);
      }
      for (const key of ["templates", "checklist", "import", "complete"]) {
        if (!seen.has(key)) {
          push(
            false,
            key === "complete"
              ? "conclusão / assistente executivo"
              : key === "import"
                ? "import prep visível"
                : `${key} visíveis`,
          );
        }
      }
    }

    await ctx.close();
  }

  const failed = report.checks.filter((c) => !c.ok).length;
  const passed = report.checks.filter((c) => c.ok).length;
  report.summary = { passed, failed, consoleErrors: report.consoleErrors.length };
  writeFileSync(resolve(OUT, "browser-qa.json"), JSON.stringify(report, null, 2));
  writeFileSync(
    resolve(OUT, "browser-run.log"),
    `PASS ${passed}\nFAIL ${failed}\nCONSOLE ${report.consoleErrors.length}\n`,
  );

  console.log(`\nBrowser QA: ${passed} PASS · ${failed} FAIL`);
  process.exit(failed > 0 ? 1 : 0);
} finally {
  await browser.close();
}
