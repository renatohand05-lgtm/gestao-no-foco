/**
 * Captura sessão autenticada para testes Playwright.
 *
 * Pré-requisito OBRIGATÓRIO:
 *   O app Next.js deve estar rodando em localhost (ou NEXT_PUBLIC_APP_URL).
 *
 *   Terminal A:  npm run dev
 *   Terminal B:  npm run test:login
 *
 * Sem o servidor ativo, este script FALHA com mensagem clara
 * (não é regressão de autenticação).
 *
 * Uso:
 *   npm run test:login
 *
 * Abre o Chromium na tela de login, aguarda indefinidamente até o login
 * ser concluído e salva storageState em docs/testing/playwright/.auth/user.json
 *
 * Não altera autenticação da aplicação — apenas captura storageState.
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

async function assertDevServerUp() {
  const loginUrl = `${BASE_URL}/login`;
  try {
    const res = await fetch(loginUrl, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok && res.status >= 500) {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      [
        "SKIP/FAIL ambiente: servidor local indisponível.",
        `Esperado: ${loginUrl}`,
        "Inicie em outro terminal: npm run dev",
        "Opcional: defina NEXT_PUBLIC_APP_URL se a porta não for 3000.",
        `Detalhe: ${detail.split("\n")[0]}`,
      ].join("\n"),
    );
  }
}

async function main() {
  console.log("Playwright — captura de sessão (Gate 19.4.1)");
  console.log(`App: ${BASE_URL}`);
  console.log("");
  console.log("Pré-requisito: npm run dev ativo em outro terminal.");
  console.log("");

  await assertDevServerUp();

  const executablePath = ensureChromiumInstalled();
  console.log(`Chromium: ${executablePath}`);
  console.log(`Destino: ${AUTH_FILE}`);
  console.log("");
  console.log("1. Faça login na janela do Chromium que vai abrir.");
  console.log("2. O script aguarda até detectar rota autenticada /[tenant]/*.");
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
      if (
        message.includes("ERR_CONNECTION_REFUSED") ||
        message.includes("ECONNREFUSED") ||
        message.includes("Timeout")
      ) {
        throw new Error(
          [
            `Não foi possível abrir ${BASE_URL}/login`,
            "Confirme: npm run dev está rodando e a porta responde.",
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
