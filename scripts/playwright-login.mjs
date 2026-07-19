/**
 * Captura sessão autenticada para testes Playwright.
 *
 * Uso:
 *   npm run test:login
 *
 * Abre o Chromium na tela de login, aguarda indefinidamente até o login
 * ser concluído e salva storageState em docs/testing/playwright/.auth/user.json
 */

import { existsSync } from "node:fs";
import {
  AUTH_FILE,
  BASE_URL,
  ensureChromiumInstalled,
  isAuthenticatedOnCurrentPage,
  launchForLogin,
  saveAuthState,
  waitForAuth,
} from "./playwright-auth.mjs";

async function main() {
  const executablePath = ensureChromiumInstalled();

  console.log("Playwright — captura de sessão");
  console.log(`App: ${BASE_URL}`);
  console.log(`Chromium: ${executablePath}`);
  console.log(`Destino: ${AUTH_FILE}`);
  console.log("");
  console.log("1. Faça login na janela do Chromium que vai abrir.");
  console.log("2. O script aguarda indefinidamente até detectar rota autenticada /[tenant]/*.");
  console.log("3. Ao concluir, o storageState é salvo e o navegador fecha.");
  console.log("   NÃO feche o Chromium manualmente antes do redirecionamento.");
  console.log("");

  const { browser, context, page } = await launchForLogin();

  try {
  try {
    await page.goto(`${BASE_URL}/login`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
  } catch (err) {
    const message = err?.message ?? String(err);
    if (message.includes("ERR_CONNECTION_REFUSED") || message.includes("ECONNREFUSED")) {
      throw new Error(
        [
          `Não foi possível conectar em ${BASE_URL}/login`,
          "Inicie o app em outro terminal: npm run dev",
          `Detalhe: ${message.split("\n")[0]}`,
        ].join("\n"),
      );
    }
    throw err;
  }
    console.log(`Aberto: ${page.url()}`);
    console.log("Aguardando login…");

    await waitForAuth(page);

    console.log(`Autenticado em: ${page.url()}`);

    if (!(await isAuthenticatedOnCurrentPage(page))) {
      throw new Error("Login detectado, mas rota autenticada não confirmada.");
    }

    await saveAuthState(context);

    if (!existsSync(AUTH_FILE)) {
      throw new Error(`Falha ao gravar storageState em ${AUTH_FILE}`);
    }

    console.log("");
    console.log(`Sessão salva em ${AUTH_FILE}`);
    console.log("Próximo passo: npm run test:walkthrough");
  } finally {
    await browser.close().catch(() => null);
  }
}

main().catch((err) => {
  const message = err?.message ?? String(err);
  console.error("\n=== FALHA test:login ===");
  console.error(message);
  if (err?.stack) {
    console.error("\nStack:");
    console.error(err.stack);
  }
  console.error("========================\n");
  process.exit(1);
});
