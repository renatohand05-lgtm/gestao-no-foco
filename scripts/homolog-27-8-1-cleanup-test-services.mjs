#!/usr/bin/env node
/**
 * Soft-delete apenas serviços de homologação 27.8.1 ainda ativos.
 * Não toca produtos. Não hard-delete.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "docs/testing/evidence/27-8-1");
mkdirSync(OUT, { recursive: true });

function loadEnvLocal() {
  const p = join(root, ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnvLocal();

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const { data: tenants } = await admin.from("tenants").select("id,slug").limit(10);
const tenant =
  (tenants ?? []).find((t) => t.slug === "teste-renato-01") ?? tenants?.[0];

const { data: active } = await admin
  .from("produtos")
  .select("id, nome, codigo_interno, tipo")
  .eq("tenant_id", tenant.id)
  .eq("tipo", "servico")
  .ilike("nome", "%TESTE 27.8.1%")
  .is("deleted_at", null);

const ids = (active ?? []).map((r) => r.id);
if (ids.length) {
  await admin
    .from("produtos")
    .update({
      deleted_at: new Date().toISOString(),
      ativo: false,
      observacoes: "sprint-27-8-1 — soft-deleted após homologação UI",
    })
    .in("id", ids)
    .eq("tenant_id", tenant.id)
    .eq("tipo", "servico");
}

const report = {
  at: new Date().toISOString(),
  softDeleted: active ?? [],
  count: ids.length,
};
writeFileSync(join(OUT, "cleanup-test-services.json"), JSON.stringify(report, null, 2));
console.log(`Soft-deleted ${ids.length} serviço(s) de teste 27.8.1`);
