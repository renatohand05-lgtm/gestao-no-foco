/**
 * Gate 2 NF-e — auditoria live do schema (somente leitura).
 * Exit 0 somente quando tabelas, bucket, RLS e RPC existem.
 *
 * Uso: npm run audit:nfe
 *
 * NÃO aplica migrations. NÃO imprime secrets.
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname ?? ".", "..");
const EVIDENCE = resolve(ROOT, "docs/testing/evidence/13-22");
mkdirSync(EVIDENCE, { recursive: true });

function loadEnvLocal() {
  const path = resolve(ROOT, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** @type {Array<{name:string,ok:boolean,detail:string}>} */
const checks = [];
function ok(name, detail = "") {
  checks.push({ name, ok: true, detail });
  console.log(`OK   ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, detail = "") {
  checks.push({ name, ok: false, detail });
  console.log(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

function finish(code) {
  const report = {
    at: new Date().toISOString(),
    exit: code,
    pass: checks.filter((c) => c.ok).length,
    fail: checks.filter((c) => !c.ok).length,
    checks,
  };
  writeFileSync(
    resolve(EVIDENCE, "GATE2_SCHEMA_AUDIT.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );
  console.log(`\nPASS=${report.pass} FAIL=${report.fail}`);
  if (code === 0) console.log("READY: schema NF-e live completo.");
  else
    console.log(
      "BLOCKED: schema incompleto — aplicar migrations faltantes e reexecutar.",
    );
  process.exit(code);
}

console.log("=== Gate 2 NF-e — auditoria live schema ===\n");

const migBase = resolve(
  ROOT,
  "supabase/migrations/20260725_nfe_entrada_importacao.sql",
);
const migRpc = resolve(
  ROOT,
  "supabase/migrations/20260725_nfe_processar_rpc.sql",
);

if (!existsSync(migBase)) fail("migration base file");
else ok("migration base file");

if (!existsSync(migRpc)) fail("migration RPC file");
else ok("migration RPC file");

const envExample = resolve(ROOT, ".env.example");
if (existsSync(envExample)) {
  const text = readFileSync(envExample, "utf8");
  if (/^```/m.test(text)) fail(".env.example sem cercas Markdown", "encontrou ```");
  else ok(".env.example somente # e variáveis");
} else {
  fail(".env.example presente");
}

if (!url || !anon) {
  fail("env supabase url/anon");
  finish(1);
}
ok("env supabase url/anon");

if (!service) fail("SUPABASE_SERVICE_ROLE_KEY");
else ok("SUPABASE_SERVICE_ROLE_KEY configurada");

const anonSb = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const admin = service
  ? createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

const tables = [
  "notas_fiscais_entrada",
  "notas_fiscais_entrada_itens",
  "notas_fiscais_entrada_eventos",
  "fornecedor_produto_vinculos",
];

for (const table of tables) {
  const { error } = await anonSb.from(table).select("id").limit(1);
  if (
    error &&
    /Could not find the table|schema cache|does not exist/i.test(error.message)
  ) {
    fail(`tabela ${table}`, error.message);
  } else {
    ok(`tabela ${table}`, error ? `code=${error.code ?? "rls"}` : "presente");
  }
}

const columns = {
  notas_fiscais_entrada: [
    "tenant_id",
    "chave_acesso",
    "xml_hash",
    "fornecedor_id",
    "status",
    "deleted_at",
    "conta_pagar_id",
  ],
  notas_fiscais_entrada_itens: [
    "tenant_id",
    "destino",
    "quantidade",
    "quantidade_estoque",
    "quantidade_os",
    "produto_id",
    "ordem_servico_id",
    "custo_unitario_final",
    "deleted_at",
  ],
};

for (const [table, cols] of Object.entries(columns)) {
  for (const col of cols) {
    const { error } = await anonSb.from(table).select(col).limit(0);
    if (
      error &&
      /could not find|does not exist|schema cache/i.test(error.message)
    ) {
      fail(`${table}.${col}`, error.message);
    } else {
      ok(`${table}.${col}`);
    }
  }
}

const { error: rpcError } = await anonSb.rpc("processar_nfe_entrada_atomico", {
  p_tenant_id: "00000000-0000-0000-0000-000000000000",
  p_nota_id: "00000000-0000-0000-0000-000000000000",
  p_user_id: null,
});
const rpcMsg = (rpcError?.message ?? "").toLowerCase();
const rpcAbsent =
  /could not find the function|schema cache|does not exist/i.test(rpcMsg) ||
  rpcError?.code === "PGRST202" ||
  rpcError?.code === "PGRST204";
if (rpcAbsent) {
  fail(
    "RPC processar_nfe_entrada_atomico",
    "Ausente — aplicar 20260725_nfe_processar_rpc.sql",
  );
} else {
  ok(
    "RPC processar_nfe_entrada_atomico",
    rpcError ? `responde (${rpcError.code ?? "err"})` : "ok",
  );
}

if (admin) {
  const { data: bucket, error: bucketErr } = await admin.storage.getBucket(
    "nfe-entrada",
  );
  if (bucketErr || !bucket) {
    fail("bucket nfe-entrada", bucketErr?.message ?? "ausente");
  } else if (bucket.public !== false) {
    fail("bucket nfe-entrada privado", "bucket público");
  } else {
    ok("bucket nfe-entrada privado", `size_limit=${bucket.file_size_limit ?? "?"}`);
  }

  for (const table of tables) {
    const { data, error } = await anonSb.from(table).select("id").limit(5);
    if (error) {
      ok(`RLS ${table}`, error.code ?? "protegido");
    } else if (Array.isArray(data) && data.length === 0) {
      ok(`RLS ${table}`, "vazio/sem vazamento");
    } else {
      fail(`RLS ${table}`, "anon leu dados sem autenticação");
    }
  }
} else {
  fail("probe bucket/RLS admin", "service role ausente");
}

const migText = readFileSync(migBase, "utf8");
for (const needle of [
  "uq_notas_fiscais_entrada_chave_ativa",
  "uq_notas_fiscais_entrada_xml_hash_ativa",
  "quantidade_estoque + quantidade_os = quantidade",
  "deleted_at",
  "nfe-entrada",
]) {
  if (migText.includes(needle)) ok(`migration docs: ${needle}`);
  else fail(`migration docs: ${needle}`);
}

finish(checks.some((c) => !c.ok) ? 1 : 0);
