/**
 * Pós-walkthrough: valida venda/CR/estoque da OS faturada (service role, só leitura).
 * Uso: node scripts/sprint-1320-verify-os.mjs <osId>
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname ?? ".", "..");
const osId = process.argv[2];
if (!osId) {
  console.error("Uso: node scripts/sprint-1320-verify-os.mjs <osId>");
  process.exit(1);
}

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

const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: os, error } = await admin
  .from("ordens_servico")
  .select("id, numero, status, venda_id, faturado_em")
  .eq("id", osId)
  .maybeSingle();
if (error || !os) {
  console.error(error?.message || "OS não encontrada");
  process.exit(1);
}
console.log("OS", { numero: os.numero, status: os.status, venda: os.venda_id ? String(os.venda_id).slice(0, 8) : null });

if (!os.venda_id) {
  console.error("FAIL: OS sem venda_id");
  process.exit(1);
}

const { data: venda } = await admin
  .from("vendas")
  .select("id, numero, status, total")
  .eq("id", os.venda_id)
  .maybeSingle();
console.log("VENDA", { numero: venda?.numero, status: venda?.status, total: venda?.total });

const { data: crs, error: crErr } = await admin
  .from("contas_receber")
  .select("id, status, valor_original")
  .eq("venda_id", os.venda_id)
  .is("deleted_at", null);
if (crErr) console.error("CR_ERR", crErr.message);
console.log("CR_COUNT", crs?.length, "statuses", (crs ?? []).map((c) => c.status).join(","));

const { data: saidas } = await admin
  .from("estoque_movimentacoes")
  .select("id, produto_id, quantidade, observacoes")
  .eq("origem", "venda")
  .eq("tipo", "saida")
  .is("deleted_at", null)
  .ilike("observacoes", `%${os.venda_id}%`);
const byProd = new Map();
for (const s of saidas ?? []) {
  byProd.set(s.produto_id, (byProd.get(s.produto_id) || 0) + 1);
}
const dup = [...byProd.values()].some((n) => n > 1);
console.log("ESTOQUE_SAIDAS", saidas?.length ?? 0, "DUP", dup);

const ok =
  venda?.status === "faturado" &&
  (crs?.length ?? 0) === 1 &&
  !dup;
console.log(ok ? "VERIFY_OK" : "VERIFY_FAIL");
process.exit(ok ? 0 : 1);
