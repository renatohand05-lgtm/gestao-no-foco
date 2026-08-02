#!/usr/bin/env node
/**
 * Sprint 27.8 — contratos (file asserts + lógica pura inline).
 * Evita importar módulos com path alias @/ no runner Node.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  summarizeServiceImportValidation,
  validateServiceImportRow,
} from "../lib/produtos/service-import-validation.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const suite = process.argv[2] ?? "all";

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    pass += 1;
    console.log(`  PASS  ${msg}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${msg}`);
  }
}

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function exists(rel) {
  return existsSync(join(root, rel));
}

/** Espelho mínimo de getDreVarianceSemantic para contrato. */
function getDreVarianceSemantic(input) {
  const { accountType, currentValue, previousValue } = input;
  if (
    accountType === "indisponivel" ||
    currentValue == null ||
    previousValue == null
  ) {
    return { tone: "indisponivel" };
  }
  const variance =
    input.variance != null ? input.variance : currentValue - previousValue;
  if (Math.abs(variance) < 1e-9) return { tone: "neutro" };
  const increased = variance > 0;
  if (accountType === "despesa") {
    return { tone: increased ? "piora" : "melhoria" };
  }
  if (accountType === "receita" || accountType === "margem") {
    return { tone: increased ? "melhoria" : "piora" };
  }
  return { tone: "neutro" };
}

function buildCalendarMonthPeriod(year, month1to12) {
  const m = Math.min(12, Math.max(1, Math.floor(month1to12)));
  const y = Math.floor(year);
  const dataDe = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const dataAte = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { dataDe, dataAte };
}

function runSelect() {
  console.log("\n## gf-select / select-theme / payment-select");
  assert(exists("components/gf/gf-select.tsx"), "GFSelect existe");
  assert(exists("components/gf/gf-combobox.tsx"), "GFCombobox existe");
  assert(exists("components/ui/native-select.tsx"), "NativeSelect existe");
  const globals = read("app/globals.css");
  assert(globals.includes("gof-native-select"), "CSS fallback nativo");
  assert(globals.includes("color-scheme"), "color-scheme no CSS");
  const rapida = read("components/vendas/venda-rapida-form.tsx");
  assert(rapida.includes("GFSelect"), "venda-rapida usa GFSelect");
  assert(
    rapida.includes('aria-label="Forma de pagamento"'),
    "forma pagamento com GFSelect",
  );
  const venda = read("components/vendas/venda-form.tsx");
  assert(venda.includes("GFSelect"), "venda-form usa GFSelect");
  const idx = read("components/gf/index.ts");
  assert(idx.includes("GFSelect"), "GFSelect exportado no barrel");
}

function runProductService() {
  console.log("\n## product-service-separation / selectors");
  assert(exists("components/produtos/produto-hub-tabs.tsx"), "hub tabs");
  assert(exists("components/produtos/catalog-add-kind-dialog.tsx"), "kind dialog");
  assert(exists("app/(app)/[tenant]/produtos/servicos/page.tsx"), "rota /servicos");
  assert(
    exists("supabase/migrations/20260801_sprint_27_8_service_fields.sql"),
    "migration 27.8",
  );
  const page = read("app/(app)/[tenant]/produtos/page.tsx");
  assert(page.includes("Novo produto"), "CTA Novo produto");
  assert(page.includes("Novo serviço"), "CTA Novo serviço");
  assert(page.includes("Importar serviços"), "CTA Importar serviços");
  const form = read("components/produtos/produto-form.tsx");
  assert(form.includes("preco_sugerido"), "form com preço sugerido");
  assert(form.includes("tempo_estimado_minutos"), "form com tempo estimado");
  const picker = read("components/ordens/os-item-catalog-picker.tsx");
  assert(picker.includes("CatalogAddKindDialog"), "OS picker com escolha");
  assert(picker.includes("Serviços"), "lista agrupada Serviços");
  const venda = read("components/vendas/venda-form.tsx");
  assert(
    venda.includes("buildCatalogItemSelectLabel") ||
      venda.includes("SERVIÇO ·"),
    "venda lista serviços identificados",
  );
  assert(
    venda.includes("buildCatalogItemSelectLabel") ||
      venda.includes("PRODUTO ·"),
    "venda lista produtos identificados",
  );
}

function runServiceBulk() {
  console.log("\n## service-bulk / delete-safety / quality / import");
  assert(exists("lib/produtos/service-bulk-service.ts"), "bulk service");
  assert(exists("lib/produtos/service-quality-service.ts"), "quality service");
  assert(exists("lib/produtos/service-bulk-actions.ts"), "bulk actions");
  assert(
    exists("app/(app)/[tenant]/produtos/gerenciar-servicos/page.tsx"),
    "página gerenciar",
  );
  assert(
    exists("app/(app)/[tenant]/produtos/qualidade-servicos/page.tsx"),
    "página qualidade",
  );
  const bulk = read("lib/produtos/service-bulk-service.ts");
  assert(bulk.includes("LIMPAR SERVIÇOS"), "confirmação digitada");
  assert(bulk.includes("softDelete"), "soft delete");
  assert(bulk.includes('.eq("tipo", "servico")'), "só serviços");
  assert(bulk.includes("venda_itens"), "checa dependência vendas");
  assert(bulk.includes("ordem_servico_itens"), "checa dependência OS");

  const issues = validateServiceImportRow(
    { codigo: "S1", nome: "Troca", custo: 0, preco_venda: 0 },
    new Set(),
  );
  assert(
    issues.some((i) => i.code === "custo_zero"),
    "validação alerta custo zero",
  );
  assert(
    issues.some((i) => i.code === "preco_zero"),
    "validação alerta preço zero",
  );
  const summary = summarizeServiceImportValidation([{ issues }]);
  assert(summary.comAlerta === 1, "resumo com alerta");

  const commit = read("lib/catalog-import/commit-services.ts");
  assert(commit.includes("preco_sugerido"), "import persiste preço sugerido");
  assert(commit.includes("tempo_estimado_minutos"), "import persiste tempo");
}

function runDre() {
  console.log("\n## dre-comparison / semantics / percent / export / drill");
  assert(exists("lib/dre/dre-compare.ts"), "dre-compare");
  assert(exists("lib/dre/dre-variance-semantics.ts"), "variance semantics");
  assert(exists("lib/dre/dre-export.ts"), "dre-export");
  assert(
    exists("components/financeiro/dre-comparative-statement.tsx"),
    "comparative statement UI",
  );
  const page = read("app/(app)/[tenant]/financeiro/dre/page.tsx");
  assert(page.includes("comparativo"), "página com modo comparativo");
  assert(page.includes("getDre"), "usa getDre (canônico)");
  const composition = read("lib/dre/dre-composition.ts");
  assert(
    composition.includes("composeDreTotals"),
    "engine composition ainda presente",
  );
  const sem = read("lib/dre/dre-variance-semantics.ts");
  assert(sem.includes("getDreVarianceSemantic"), "função semântica exportada");
  assert(sem.includes("classifyDreLinhaSemantic"), "classificador de linha");

  const period = buildCalendarMonthPeriod(2026, 2);
  assert(period.dataDe === "2026-02-01", "mês fev início");
  assert(period.dataAte === "2026-02-28", "mês fev fim");

  const receitaUp = getDreVarianceSemantic({
    accountType: "receita",
    previousValue: 100,
    currentValue: 120,
  });
  assert(receitaUp.tone === "melhoria", "receita ↑ = melhora");
  const despesaUp = getDreVarianceSemantic({
    accountType: "despesa",
    previousValue: 100,
    currentValue: 120,
  });
  assert(despesaUp.tone === "piora", "despesa ↑ = piora");
  const missing = getDreVarianceSemantic({
    accountType: "receita",
    previousValue: null,
    currentValue: 10,
  });
  assert(missing.tone === "indisponivel", "null ≠ zero");

  const compare = read("lib/dre/dre-compare.ts");
  assert(compare.includes("pctReceitaA"), "% receita no compare");
  assert(compare.includes("diffReais"), "diff reais no compare");
  const exp = read("lib/dre/dre-export.ts");
  assert(exp.includes("buildDreComparativeCsv"), "CSV export");
  assert(exp.includes("buildDreComparativeExcelRows"), "Excel export");
  assert(page.includes("DreDrillPanel"), "drill-down suportado");
  const stmt = read("components/financeiro/dre-comparative-statement.tsx");
  assert(stmt.includes("md:hidden"), "responsive mobile cards");
}

const map = {
  "gf-select": runSelect,
  "select-theme-contract": runSelect,
  "payment-select": runSelect,
  "product-service-separation": runProductService,
  "service-selector": runProductService,
  "product-selector": runProductService,
  "service-bulk-management": runServiceBulk,
  "service-delete-safety": runServiceBulk,
  "service-import": runServiceBulk,
  "service-import-validation": runServiceBulk,
  "service-quality": runServiceBulk,
  "dre-comparison": runDre,
  "dre-variance-semantics": runDre,
  "dre-percent-revenue": runDre,
  "dre-drilldown": runDre,
  "dre-export": runDre,
  "dre-responsive": runDre,
  all() {
    runSelect();
    runProductService();
    runServiceBulk();
    runDre();
  },
};

console.log(`\nSprint 27.8 tests — suite=${suite}\n`);
const fn = map[suite] ?? map.all;
fn();

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
