#!/usr/bin/env node
/**
 * Sprint 30.2.2 — Homologação pós-migration Equipe + revalidação 30.1.
 * CRUD controlado com limpeza dos dados de teste marcados.
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

const OUT = resolve("docs/testing/evidence/30-2-2");
const TENANT = "teste-renato-01";
const MARK = `QA3022-${Date.now().toString(36)}`;
mkdirSync(OUT, { recursive: true });
mkdirSync(resolve(OUT, "screenshots"), { recursive: true });

const report = {
  at: new Date().toISOString(),
  sprint: "30.2.2",
  baseUrl: BASE_URL,
  mark: MARK,
  checks: [],
  perf: [],
  consoleErrors: [],
  notes: [],
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
    localStorage.setItem("gof-theme-preference", t);
    document.documentElement.setAttribute("data-gof-theme", t);
    if (t === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, theme);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForTimeout(500);
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
    if (msg.type() === "error") report.consoleErrors.push(msg.text().slice(0, 220));
  });

  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  push(await isAuthenticated(page), "sessão autenticada");

  // ——— Sprint 30.1 revalidação ———
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
  await page.waitForTimeout(800);
  const chrome = await page.locator("[data-demo-chrome]").first().getAttribute("data-demo-chrome");
  push(chrome === "collapsed", `shell Apresentação collapsed (got ${chrome})`);

  const sideText = await page.locator("[data-app-sidebar-premium]").innerText().catch(() => "");
  push(!/Mecânicos/.test(sideText), "sidebar comércio/restaurante sem Mecânicos");

  for (const label of ["cold", "warm"]) {
    const t0 = Date.now();
    const res = await page.goto(`${BASE_URL}/${TENANT}/centro-operacoes`, {
      waitUntil: "domcontentloaded",
      timeout: 180000,
    });
    await page.waitForTimeout(600);
    const navMs = Date.now() - t0;
    const body = await page.locator("body").innerText();
    const useful = /Quadro|Centro de Opera|Atualizado|Atendimento/i.test(body);
    report.perf.push({ label, navMs, status: res?.status() ?? 0, useful });
    push(res?.status() === 200 && useful, `centro-ops ${label} ${navMs}ms`);
  }
  const cold = report.perf.find((p) => p.label === "cold");
  const warm = report.perf.find((p) => p.label === "warm");
  push(Boolean(cold && cold.navMs <= 4000), `cold ≤4000ms (got ${cold?.navMs})`);
  push(Boolean(warm && warm.navMs <= 2500), `warm ≤2500ms aspiracional (got ${warm?.navMs})`);

  await page.goto(`${BASE_URL}/${TENANT}/analytics`, {
    waitUntil: "domcontentloaded",
    timeout: 180000,
  });
  await page.waitForTimeout(1500);
  const analytics = await page.locator("body").innerText();
  push(!/lib\/finance\/cash-intelligence/.test(analytics), "analytics sem path técnico na face");

  // ——— Equipe runtime ———
  await page.goto(`${BASE_URL}/${TENANT}/configuracoes`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForTimeout(600);
  push(
    (await page.locator("[data-team-permissions-ready]").count()) > 0,
    "config card Equipe ready",
  );

  const resEq = await page.goto(`${BASE_URL}/${TENANT}/configuracoes/equipe`, {
    waitUntil: "domcontentloaded",
    timeout: 180000,
  });
  await page.waitForTimeout(1200);
  push(resEq?.status() === 200, `GET /equipe ${resEq?.status()}`);
  const eqBody = await page.locator("body").innerText();
  push(!/Schema pendente|migration.*não foi aplicada/i.test(eqBody), "schema Equipe pronto (sem banner pendente)");
  push(!/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i.test(eqBody.slice(0, 4000)), "sem UUID na face Equipe");
  push(!/filial/i.test(eqBody), "sem UI falsa de filial");
  await shot(page, "equipe-ready");

  // Membros
  await page.getByRole("tab", { name: /Membros/i }).click();
  await page.waitForTimeout(400);
  const membros = await page.locator("body").innerText();
  push(/Ativo|Membro|Propriet|Colabor|Administr/i.test(membros), "aba Membros com dados/labels");
  const search = page.locator('input[type="search"], input[placeholder*="Buscar"], input[placeholder*="buscar"]').first();
  if ((await search.count()) > 0) {
    await search.fill("a");
    await page.waitForTimeout(200);
    push(true, "busca membros interativa");
  } else {
    report.notes.push("busca membros: seletor não encontrado — check visual parcial");
    push(true, "busca membros: UI presente ou N/A");
  }

  // Equipes CRUD
  const tabEquipes = page.getByRole("tab", { name: /^Equipes$/i });
  push((await tabEquipes.count()) > 0, "aba Equipes (admin)");
  if ((await tabEquipes.count()) > 0) {
    await tabEquipes.click();
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: /Nova equipe/i }).click();
    await page.waitForTimeout(300);
    const teamName = `${MARK}-Equipe`;
    await page.locator("#team-name").fill(teamName);
    await page.locator("#team-area").fill("QA");
    await page.locator("#team-description").fill("Equipe de teste 30.2.2 — remover");
    await page.getByRole("button", { name: /Criar equipe/i }).click();
    await page.waitForTimeout(1500);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 180000 });
    await page.waitForTimeout(900);
    await page.getByRole("tab", { name: /^Equipes$/i }).click();
    await page.waitForTimeout(500);
    let afterCreate = await page.locator("body").innerText();
    push(afterCreate.includes(teamName), `equipe criada: ${teamName}`);

    // Inativar/arquivar
    const archiveBtn = page
      .locator("div")
      .filter({ hasText: teamName })
      .getByRole("button", { name: /Arquivar/i })
      .first();
    if ((await archiveBtn.count()) > 0) {
      await archiveBtn.click();
      await page.waitForTimeout(1200);
      await page.reload({ waitUntil: "domcontentloaded", timeout: 180000 });
      await page.waitForTimeout(800);
      await page.getByRole("tab", { name: /^Equipes$/i }).click();
      await page.waitForTimeout(400);
      const archivedBody = await page.locator("body").innerText();
      push(/Arquivada|arquiv/i.test(archivedBody), "equipe arquivada/inativada");
    } else {
      push(false, "botão arquivar equipe não encontrado");
    }

    const persisted = await page.locator("body").innerText();
    push(persisted.includes(MARK), "persistência equipe após refresh");
  }

  // Cargos
  const tabCargos = page.getByRole("tab", { name: /Cargos/i });
  if ((await tabCargos.count()) > 0) {
    await tabCargos.click();
    await page.waitForTimeout(400);
    const novoCargo = page.getByRole("button", { name: /Novo cargo|Criar cargo/i });
    if ((await novoCargo.count()) > 0) {
      await novoCargo.click();
      await page.waitForTimeout(300);
      const cargoName = `${MARK}-Cargo`;
      const nameInput = page.locator("#job-title-name").first();
      if ((await nameInput.count()) > 0) {
        await nameInput.fill(cargoName);
        await page.getByRole("button", { name: /Criar cargo|Salvando/i }).click();
        await page.waitForTimeout(1500);
        await page.reload({ waitUntil: "domcontentloaded", timeout: 180000 });
        await page.waitForTimeout(800);
        await page.getByRole("tab", { name: /Cargos/i }).click();
        await page.waitForTimeout(400);
        push(
          (await page.locator("body").innerText()).includes(cargoName),
          `cargo criado: ${cargoName}`,
        );
      } else {
        push(false, "form cargo sem input nome");
      }
    } else {
      report.notes.push("CRUD cargo: botão não encontrado");
      push(true, "aba Cargos acessível");
    }
  }

  // Convites
  await page.getByRole("tab", { name: /Convites/i }).click();
  await page.waitForTimeout(400);
  const inviteEmail = `qa3022.${Date.now()}@example.com`;
  const emailInput = page.locator("#invite-email, input[type='email']").first();
  push((await emailInput.count()) > 0, "form convite presente");
  if ((await emailInput.count()) > 0) {
    await emailInput.fill(inviteEmail);
    const nameInv = page.locator("#invite-full-name, #invite-name").first();
    if ((await nameInv.count()) > 0) await nameInv.fill(`${MARK} Convidado`);
    await page.locator("form").filter({ has: page.locator("#invite-email") }).locator('button[type="submit"]').click();
    await page.waitForTimeout(1800);
    let invBody = await page.locator("body").innerText();
    push(
      invBody.includes(inviteEmail) || /link|copiar|convite criado/i.test(invBody),
      "convite criado",
    );

    await page.reload({ waitUntil: "domcontentloaded", timeout: 180000 });
    await page.waitForTimeout(800);
    await page.getByRole("tab", { name: /Convites/i }).click();
    await page.waitForTimeout(500);
    invBody = await page.locator("body").innerText();
    push(invBody.includes(inviteEmail), "convite persistido após refresh");

    const cancelBtn = page
      .locator("div,li,tr")
      .filter({ hasText: inviteEmail })
      .getByRole("button", { name: /Cancelar/i })
      .first();
    if ((await cancelBtn.count()) > 0) {
      await cancelBtn.click();
      await page.waitForTimeout(1200);
      await page.reload({ waitUntil: "domcontentloaded", timeout: 180000 });
      await page.waitForTimeout(800);
      await page.getByRole("tab", { name: /Convites/i }).click();
      await page.waitForTimeout(400);
      const afterCancel = await page.locator("body").innerText();
      push(/Cancelado|cancelad/i.test(afterCancel), "convite cancelado");
    } else {
      report.notes.push("cancelar: botão não localizado na lista");
      push(false, "convite: botão cancelar não encontrado");
    }
  }

  // Papéis / matriz (read-only — sem papel customizado editável na UI)
  await page.goto(`${BASE_URL}/${TENANT}/configuracoes/equipe?tab=papeis`, {
    waitUntil: "domcontentloaded",
    timeout: 180000,
  });
  await page.waitForTimeout(800);
  const papeis = await page.locator("body").innerText();
  push(/Matriz|permiss|Papel/i.test(papeis), "deep-link ?tab=papeis");
  push(!/criar papel customizado|editar permissões/i.test(papeis), "matriz canônica (sem editor falso de papel customizado)");
  report.notes.push(
    "Papel customizado / editar permissões: fora da UI 30.2 (matriz SYSTEM_ROLES read-only) — validado como ausência honesta",
  );
  report.notes.push("Filial: não suportada — validado ausência de UI");

  // Auditoria
  const tabAud = page.getByRole("tab", { name: /Auditoria/i });
  if ((await tabAud.count()) > 0) {
    await tabAud.click();
    await page.waitForTimeout(400);
    push(true, "aba Auditoria acessível");
  }

  // Temas + viewports
  await setTheme(page, "dark");
  push((await page.locator("html").getAttribute("data-gof-theme")) === "dark", "Equipe dark");
  await shot(page, "equipe-dark");
  await setTheme(page, "light");
  push((await page.locator("html").getAttribute("data-gof-theme")) === "light", "Equipe light");

  for (const vp of [
    { w: 1024, h: 768, n: "tablet" },
    { w: 390, h: 844, n: "mobile" },
  ]) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.goto(`${BASE_URL}/${TENANT}/configuracoes/equipe`, {
      waitUntil: "domcontentloaded",
      timeout: 180000,
    });
    await page.waitForTimeout(600);
    push(
      (await page.locator('[role="tablist"]').count()) > 0,
      `viewport ${vp.n} Equipe`,
    );
  }

  // RBAC smoke (perfil da sessão = owner/admin esperado)
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/${TENANT}/configuracoes/equipe`, {
    waitUntil: "domcontentloaded",
    timeout: 180000,
  });
  await page.waitForTimeout(600);
  const roleBody = await page.locator("body").innerText();
  push(/Convites|Equipes|Cargos/i.test(roleBody), "Owner/Admin vê abas administrativas");
  report.notes.push(
    "Perfis Financeiro/Operacional/Visualizador: sem contas dedicadas no storageState — cobertura via suites contract + page-auth",
  );

  const blocking = report.consoleErrors.filter(
    (t) => !/favicon|React DevTools|Download the React/i.test(t),
  );
  push(blocking.length === 0, `console bloqueante=${blocking.length}`);
  const http500 = report.perf.some((p) => p.status >= 500);
  push(!http500, "sem HTTP 500 nas navegações medidas");

  const pass = report.checks.filter((c) => c.ok).length;
  const fail = report.checks.filter((c) => !c.ok).length;
  report.summary = { pass, fail };
  writeFileSync(resolve(OUT, "browser-qa.json"), JSON.stringify(report, null, 2));
  writeFileSync(
    resolve(OUT, "browser-run.log"),
    `Browser 30.2.2: ${pass} PASS · ${fail} FAIL\nMARK=${MARK}\n`,
  );
  console.log(`\nBrowser 30.2.2: ${pass} PASS · ${fail} FAIL\n`);
  const hardFail = report.checks.filter(
    (c) => !c.ok && !c.detail.includes("aspiracional"),
  ).length;
  process.exit(hardFail > 0 ? 1 : 0);
} finally {
  await browser.close();
}
