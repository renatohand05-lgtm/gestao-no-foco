/**
 * Utilitários compartilhados de autenticação Playwright.
 * Sessão persistida em docs/testing/playwright/.auth/user.json
 */

import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

export const ROOT = resolve(import.meta.dirname ?? ".", "..");
export const AUTH_DIR = resolve(ROOT, "docs/testing/playwright/.auth");
export const AUTH_FILE = resolve(AUTH_DIR, "user.json");
export const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const POLL_MS = 2000;
const TENANT_ROUTE_RE =
  /^\/[^/]+\/(dashboard|ordens|clientes|financeiro|vendas|configuracoes|relatorios|busca|primeiro-acesso)/;

mkdirSync(AUTH_DIR, { recursive: true });

export function authFileExists() {
  return existsSync(AUTH_FILE);
}

function isTenantRoute(url) {
  try {
    return TENANT_ROUTE_RE.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

function isAuthPage(url) {
  return url.includes("/login") || url.includes("/register");
}

async function hasAuthToken(page) {
  return page
    .evaluate(() => Object.keys(localStorage).some((k) => k.includes("auth-token")))
    .catch(() => false);
}

/**
 * Verifica autenticação na página atual, sem navegar (seguro durante login manual).
 */
export async function isAuthenticatedOnCurrentPage(page) {
  const url = page.url();
  if (isAuthPage(url)) return false;
  if (isTenantRoute(url)) return true;
  if (await hasAuthToken(page)) return true;
  return false;
}

/**
 * Verifica autenticação navegando para /onboarding (uso pós-storageState).
 */
export async function isAuthenticated(page) {
  if (await isAuthenticatedOnCurrentPage(page)) {
    return true;
  }

  await page.goto(`${BASE_URL}/onboarding`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(1200);

  const url = page.url();
  if (isAuthPage(url)) return false;
  if (isTenantRoute(url)) return true;
  return !url.includes("/login");
}

export function ensureChromiumInstalled() {
  let executablePath = "";
  try {
    executablePath = chromium.executablePath();
  } catch {
    executablePath = "";
  }

  if (executablePath && existsSync(executablePath)) {
    return executablePath;
  }

  console.log("Chromium não encontrado. Executando: npx playwright install chromium");
  execSync("npx playwright install chromium", {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });

  const installedPath = chromium.executablePath();
  if (!existsSync(installedPath)) {
    throw new Error(
      [
        "Chromium ainda indisponível após install.",
        `Esperado em: ${installedPath}`,
        "Rode manualmente: npx playwright install chromium",
      ].join("\n"),
    );
  }

  return installedPath;
}

export function attachPopupHandlers(context, page) {
  const acceptDialog = async (dialog) => {
    try {
      await dialog.accept();
    } catch {
      // popup fechado ou já tratado
    }
  };

  page.on("dialog", acceptDialog);
  page.on("popup", async (popup) => {
    popup.on("dialog", acceptDialog);
    await popup.waitForLoadState("domcontentloaded").catch(() => null);
  });

  context.on("page", async (newPage) => {
    if (newPage === page) return;
    newPage.on("dialog", acceptDialog);
    await newPage.waitForLoadState("domcontentloaded").catch(() => null);
  });
}

/**
 * Aguarda indefinidamente até o usuário concluir o login em /[tenant]/*.
 * Não navega para fora da tela durante a espera e não usa timeout curto.
 */
export async function waitForAuth(page) {
  // Preferência: waitForURL sem timeout (0 = infinito no Playwright)
  try {
    await page.waitForURL(
      (url) => {
        try {
          return TENANT_ROUTE_RE.test(url.pathname);
        } catch {
          return false;
        }
      },
      { timeout: 0 },
    );
    return;
  } catch {
    if (page.isClosed()) {
      throw new Error(
        "Navegador fechado antes de concluir o login.\nRode npm run test:login novamente e mantenha a janela do Chromium aberta até o redirecionamento para /[tenant]/*.",
      );
    }
    // Fallback por polling se waitForURL falhar por outro motivo
  }

  while (true) {
    if (page.isClosed()) {
      throw new Error(
        "Navegador fechado antes de concluir o login.\nRode npm run test:login novamente e mantenha a janela do Chromium aberta até o redirecionamento para /[tenant]/*.",
      );
    }

    if (isTenantRoute(page.url())) {
      return;
    }

    await page.waitForTimeout(POLL_MS).catch(() => {
      if (page.isClosed()) {
        throw new Error(
          "Navegador fechado antes de concluir o login.\nRode npm run test:login novamente e mantenha a janela do Chromium aberta.",
        );
      }
    });
  }
}

export async function saveAuthState(context) {
  mkdirSync(AUTH_DIR, { recursive: true });
  await context.storageState({ path: AUTH_FILE });
}

async function launchBrowser(options = {}) {
  const executablePath = ensureChromiumInstalled();

  try {
    return await chromium.launch({
      headless: options.headless ?? false,
      slowMo: options.slowMo ?? 50,
      executablePath,
    });
  } catch (err) {
    const message = err?.message ?? String(err);
    console.error("\n=== ERRO AO ABRIR CHROMIUM ===");
    console.error(message);
    console.error("==============================\n");

    if (message.includes("Executable doesn't exist")) {
      console.log("Tentando reinstalar Chromium…");
      execSync("npx playwright install chromium", {
        cwd: ROOT,
        stdio: "inherit",
        env: process.env,
      });
      const retryPath = chromium.executablePath();
      return await chromium.launch({
        headless: options.headless ?? false,
        slowMo: options.slowMo ?? 50,
        executablePath: retryPath,
      });
    }

    throw new Error(`Falha ao abrir Chromium (launchForLogin):\n${message}`);
  }
}

export async function launchForLogin() {
  const browser = await launchBrowser({ headless: false, slowMo: 50 });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
  });
  const page = await context.newPage();
  attachPopupHandlers(context, page);
  return { browser, context, page };
}

export async function launchWithAuth(options = {}) {
  const headless = options.headless ?? process.env.HEADLESS === "1";
  const slowMo = options.slowMo ?? (headless ? 0 : 100);

  if (!authFileExists()) {
    throw new Error(
      `Sessão não encontrada em ${AUTH_FILE}\nRode: npm run test:login`,
    );
  }

  const browser = await launchBrowser({ headless, slowMo });
  const context = await browser.newContext({
    storageState: AUTH_FILE,
    viewport: { width: 1366, height: 900 },
  });
  const page = await context.newPage();
  attachPopupHandlers(context, page);
  return { browser, context, page };
}

export async function ensureAuthFromFile(page) {
  if (await isAuthenticated(page)) {
    return;
  }
  throw new Error(
    `Sessão expirada ou inválida em ${AUTH_FILE}\nRode: npm run test:login`,
  );
}

export async function loginWithCredentials(page, context, email, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel(/e-mail|email/i).fill(email);
  await page.getByLabel(/^senha$/i).fill(password);
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForTimeout(4000);

  if (!(await isAuthenticated(page))) {
    throw new Error("Login com credenciais de ambiente falhou.");
  }

  await saveAuthState(context);
}
