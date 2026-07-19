import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const tables = [
  "veiculos",
  "ordens_servico",
  "ordem_servico_itens",
  "ordem_servico_checklist",
  "ordem_servico_diagnosticos",
  "ordem_servico_anexos",
  "ordem_servico_eventos",
  "ordem_servico_previsoes",
  "retornos_servico",
  "clientes_veiculos",
  "frota_veiculos",
  "ordem_servico",
];

const columns = {
  veiculos: ["tenant_id", "cliente_id", "placa", "ativo", "deleted_at", "versao"],
  ordens_servico: [
    "tenant_id",
    "status",
    "veiculo_id",
    "previsao_entrega",
    "venda_id",
    "deleted_at",
  ],
  ordem_servico_itens: [
    "aprovacao_status",
    "estoque_status",
    "execucao_status",
    "categoria_item",
  ],
};

let failed = 0;
for (const t of tables) {
  const { error } = await sb.from(t).select("id").limit(0);
  const missing =
    !!error && /could not find|does not exist|schema cache/i.test(error.message);
  const ok = !error || !missing;
  if (!ok) failed += 1;
  console.log(
    JSON.stringify({
      table: t,
      ok,
      missing,
      msg: error?.message ?? "visible_in_postgrest",
    }),
  );
}

for (const [table, cols] of Object.entries(columns)) {
  for (const col of cols) {
    const { error } = await sb.from(table).select(col).limit(0);
    const missing =
      !!error && /could not find|does not exist|schema cache/i.test(error.message);
    if (missing) {
      failed += 1;
      console.log(JSON.stringify({ table, column: col, ok: false, msg: error.message }));
    }
  }
}

console.log(`PROBE_FAILED=${failed}`);
process.exit(failed > 0 ? 2 : 0);
