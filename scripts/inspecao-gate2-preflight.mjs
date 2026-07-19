/**
 * Gate 2 preflight — Inspeção Digital 13.19.3
 *
 * NÃO aplica migration. Verifica se o schema/RPCs já estão disponíveis
 * e se SUPABASE_SERVICE_ROLE_KEY está configurada.
 *
 * Exit codes:
 *  0 — ambiente pronto para testes live
 *  2 — aguardando CTO (schema/service role ausentes)
 *  1 — erro de configuração
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
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

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260724_digital_vehicle_inspection.sql",
);

console.log("=== Gate 2 preflight — Inspeção Digital 13.19.3 ===\n");

if (!existsSync(migrationPath)) {
  console.error("FAIL: migration file ausente:", migrationPath);
  process.exit(1);
}
console.log("OK  migration file presente");

if (!url || !anon) {
  console.error("FAIL: NEXT_PUBLIC_SUPABASE_URL / ANON_KEY ausentes");
  process.exit(1);
}
console.log("OK  Supabase URL + anon key");

if (!service) {
  console.warn("WAIT SUPABASE_SERVICE_ROLE_KEY ausente (signed URLs Gate 2)");
} else {
  console.log("OK  SUPABASE_SERVICE_ROLE_KEY configurada");
}

const supabase = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const requiredTables = [
  "oficina_textos",
  "ordem_servico_orcamento_versoes",
  "ordem_servico_orcamento_itens",
  "ordem_servico_compartilhamentos",
  "ordem_servico_aprovacoes",
  "ordem_servico_aprovacao_itens",
];

let missing = 0;
for (const table of requiredTables) {
  const { error } = await supabase.from(table).select("id").limit(1);
  if (error && /Could not find the table|schema cache|does not exist/i.test(error.message)) {
    console.warn(`WAIT tabela ausente (migration não aplicada): ${table}`);
    missing += 1;
  } else if (error) {
    // RLS pode bloquear select anônimo — presença da tabela já é sinal
    console.log(`OK  tabela acessível/conhecida: ${table} (${error.code ?? "rls"})`);
  } else {
    console.log(`OK  tabela presente: ${table}`);
  }
}

const { data: rpcData, error: rpcError } = await supabase.rpc(
  "inspecao_publica_por_token",
  { p_token: "x".repeat(32) },
);

const rpcMissing =
  rpcError &&
  (/Could not find the function|schema cache/i.test(rpcError.message) ||
    rpcError.code === "PGRST202" ||
    rpcError.code === "PGRST204");

const rpcBrokenDigest =
  rpcError &&
  (rpcError.code === "42883" ||
    /function digest\(/i.test(rpcError.message));

if (rpcMissing) {
  console.warn("WAIT RPC inspecao_publica_por_token ausente no schema remoto");
  missing += 1;
} else if (rpcBrokenDigest) {
  console.warn(
    "WAIT RPC inspecao_publica_por_token presente mas quebrada (digest/pgcrypto). Aplique 20260724_fix_inspecao_publica_rpc.sql",
  );
  missing += 1;
} else if (rpcError) {
  console.warn(
    "WAIT RPC inspecao_publica_por_token erro:",
    rpcError.code ?? "",
    rpcError.message,
  );
  missing += 1;
} else {
  console.log(
    "OK  RPC inspecao_publica_por_token responde:",
    rpcData?.error ?? rpcData?.ok ?? "ok",
  );
}

console.log("\n--- Checklist de 30 testes ---");
console.log("Ver docs/testing/INSPECAO_DIGITAL_30_TESTES_13_19_3.md");
console.log("Ver docs/architecture/GATE2_DIGITAL_INSPECTION_13_19_3.md");

if (missing > 0 || !service) {
  console.log(
    "\nBLOCKED_AWAITING_CTO: aplique a migration e configure service role antes dos testes live.",
  );
  process.exit(2);
}

console.log("\nREADY: ambiente Gate 2 pronto para os 30 testes live.");
process.exit(0);
