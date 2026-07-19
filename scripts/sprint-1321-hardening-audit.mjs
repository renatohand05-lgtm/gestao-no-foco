/**
 * Sprint 13.21 — auditoria de hardening (rotas auth, RLS spot-check, perf notes).
 * Uso: node scripts/sprint-1321-hardening-audit.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";

const ROOT = resolve(import.meta.dirname ?? ".", "..");
const OUT = resolve(ROOT, "docs/testing/evidence/13-21");
const results = [];

function loadEnv() {
  const path = resolve(ROOT, ".env.local");
  const env = { ...process.env };
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const m = t.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[m[1]] = v;
  }
  return env;
}

function push(area, check, ok, evidence = "", note = "") {
  results.push({ area, check, ok, evidence, note });
  console.log(`${ok ? "✓" : "✗"} [${area}] ${check}${evidence ? ` — ${evidence}` : ""}`);
}

function fileExists(rel) {
  return existsSync(resolve(ROOT, rel));
}

function read(rel) {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

function walkTsFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === ".next-build") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walkTsFiles(full, acc);
    else if (/\.(ts|tsx)$/.test(name)) acc.push(full);
  }
  return acc;
}

const env = loadEnv();

// --- Structural files ---
const required = [
  "lib/observability/logger.ts",
  "lib/observability/perf.ts",
  "lib/platform/maintenance.ts",
  "lib/platform/health.ts",
  "app/global-error.tsx",
  "app/error.tsx",
  "app/not-found.tsx",
  "app/loading.tsx",
  "app/manutencao/page.tsx",
  "app/api/health/route.ts",
  "app/api/status/route.ts",
  "components/platform/toast-provider.tsx",
  "components/platform/global-loader.tsx",
  "components/platform/maintenance-screen.tsx",
  "components/platform/app-providers.tsx",
];
for (const rel of required) {
  push("Estrutura", rel, fileExists(rel), fileExists(rel) ? "presente" : "ausente");
}

// --- Auth routes review ---
{
  const routes = read("lib/auth/routes.ts");
  const constants = read("lib/constants.ts");
  const mw = read("lib/supabase/middleware.ts");
  push(
    "Rotas autenticadas",
    "manutencao reservado + PUBLIC_ROUTES",
    routes.includes("manutencao") && constants.includes("/manutencao"),
  );
  push(
    "Rotas autenticadas",
    "health/status bypass no middleware",
    mw.includes("OPERATIONAL_API_ROUTES") && mw.includes("isMaintenanceMode"),
  );
  push(
    "Rotas autenticadas",
    "isProtectedRoute cobre onboarding + tenant",
    routes.includes("isProtectedRoute") && mw.includes("isProtectedRoute"),
  );
  push(
    "Rotas autenticadas",
    "isolamento de slug de tenant no proxy",
    mw.includes("getUserTenantSlugs") && mw.includes("tenantSlugs.includes"),
  );
}

// --- RLS spot checks via migrations + live anon ---
{
  const migs = [
    "supabase/migrations/20260724_digital_vehicle_inspection.sql",
    "supabase/migrations/20260708_create_estoque_movimentacoes.sql",
    "supabase/migrations/20260719_master_data_foundation.sql",
  ].filter((p) => fileExists(p));
  let rlsCount = 0;
  for (const p of migs) {
    const txt = read(p);
    const matches = txt.match(/ENABLE ROW LEVEL SECURITY/gi) || [];
    rlsCount += matches.length;
  }
  push(
    "RLS",
    "Migrations com ENABLE ROW LEVEL SECURITY",
    rlsCount > 0,
    `ocorrências=${rlsCount} em ${migs.length} arquivos`,
  );

  if (env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const anon = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } },
    );
    const tables = ["clientes", "vendas", "ordens_servico", "contas_receber"];
    for (const table of tables) {
      const { data, error } = await anon.from(table).select("id").limit(3);
      const leaked = (data ?? []).length > 0;
      push(
        "RLS",
        `Anon sem sessão não lê ${table}`,
        !leaked,
        leaked ? `leak=${data.length}` : error?.message || "0 rows",
      );
    }
  } else {
    push("RLS", "Probe live anon", false, "env supabase ausente");
  }
}

// --- Performance / slow query audit (static) ---
{
  const perfDoc = fileExists("docs/architecture/PERFORMANCE.md");
  push("Performance", "Documento PERFORMANCE.md presente", perfDoc);
  const withTiming = fileExists("lib/observability/perf.ts") &&
    read("lib/observability/perf.ts").includes("slow_operation");
  push("Performance", "withTiming / slow_operation disponível", withTiming);

  // Heurística: serviços com Promise.all (paralelismo)
  const services = walkTsFiles(resolve(ROOT, "lib")).filter((f) =>
    /service\.ts$/i.test(f),
  );
  let parallel = 0;
  for (const f of services) {
    if (readFileSync(f, "utf8").includes("Promise.all")) parallel += 1;
  }
  push(
    "Performance",
    "Serviços com Promise.all (paralelismo)",
    parallel > 0,
    `${parallel}/${services.length} services`,
  );

  // Patterns de select * em app/lib (alerta, não bloqueio)
  let selectStar = 0;
  for (const f of walkTsFiles(resolve(ROOT, "lib")).slice(0, 400)) {
    const txt = readFileSync(f, "utf8");
    if (/\.select\(\s*["'`]\*\s*["'`]/.test(txt)) selectStar += 1;
  }
  push(
    "Queries",
    "Arquivos lib com .select('*')",
    true,
    `count=${selectStar}`,
    selectStar > 0
      ? "Revisar candidatos a projeção explícita (melhoria contínua)"
      : "nenhum select * óbvio",
  );
}

// --- Dead code / standardization markers ---
{
  push(
    "Componentes",
    "FeedbackMessage com variantes padronizadas",
    read("components/ui/feedback-message.tsx").includes("warning"),
  );
  push(
    "Componentes",
    "ToastProvider + AppProviders no layout",
    read("app/layout.tsx").includes("AppProviders"),
  );
  push(
    "Observabilidade",
    "friendly-error usa logger",
    read("lib/supabase/friendly-error.ts").includes("logger.exception"),
  );
}

mkdirSync(OUT, { recursive: true });
const summary = {
  at: new Date().toISOString(),
  pass: results.filter((r) => r.ok).length,
  fail: results.filter((r) => !r.ok).length,
  results,
};
writeFileSync(resolve(OUT, "HARDENING_AUDIT.json"), JSON.stringify(summary, null, 2));
console.log("\n=== RESUMO ===");
console.log(`PASS=${summary.pass} FAIL=${summary.fail}`);
console.log(`Relatório JSON: ${relative(ROOT, resolve(OUT, "HARDENING_AUDIT.json"))}`);
if (summary.fail > 0) process.exitCode = 1;
