/**
 * Screenshot do dashboard — valida tabela RESUMO DE VENDAS DO MÊS.
 */
import { chromium } from "playwright";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH = path.join(__dirname, "../docs/testing/playwright/.auth/user.json");
const OUT_DIR = path.join(__dirname, "../docs/testing/screenshots");
const BASE = process.env.BASE_URL || "http://localhost:3000";
const TENANT = process.env.TENANT_SLUG || "teste-renato-01";

async function main() {
  if (!existsSync(AUTH)) {
    console.error("Sem auth Playwright. Rode npm run test:login primeiro.");
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: AUTH,
    viewport: { width: 1440, height: 1100 },
  });
  const page = await context.newPage();

  const url = `${BASE}/${TENANT}/dashboard`;
  console.log("Abrindo", url);
  await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });

  // Aguarda a tabela (data attribute + título)
  const table = page.locator("[data-dashboard-resumo-vendas]");
  await table.waitFor({ state: "visible", timeout: 60000 });
  await page.getByRole("heading", { name: /Resumo de Vendas do Mês/i }).waitFor({
    timeout: 30000,
  });

  const total = page.getByText("TOTAL GERAL").first();
  await total.waitFor({ state: "visible", timeout: 15000 });

  const outFull = path.join(OUT_DIR, "dashboard-resumo-vendas-mes-full.png");
  const outTable = path.join(OUT_DIR, "dashboard-resumo-vendas-mes-table.png");

  await page.screenshot({ path: outFull, fullPage: true });
  await table.screenshot({ path: outTable });

  const dayRows = await page.locator("table tbody tr").count();
  console.log("Linhas tbody (inclui TOTAL):", dayRows);
  console.log("Screenshot full:", outFull);
  console.log("Screenshot tabela:", outTable);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
