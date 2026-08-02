#!/usr/bin/env node
/**
 * Sprint 27.8.3 — Trace meta real no banco vs resolução do Dashboard.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "docs/testing/evidence/27-8-3");
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

const { data: tenants } = await admin.from("tenants").select("id,slug,name").limit(20);
const tenant =
  (tenants ?? []).find((t) => t.slug === "teste-renato-01") ?? tenants?.[0];

const now = new Date();
const spParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).formatToParts(now);
const y = spParts.find((p) => p.type === "year")?.value;
const m = spParts.find((p) => p.type === "month")?.value;
const d = spParts.find((p) => p.type === "day")?.value;
const competenciaSp = `${y}-${m}-01`;
const hojeSp = `${y}-${m}-${d}`;

const { data: allMetas, error: allErr } = await admin
  .from("metas_vendas_mensais")
  .select(
    "id, tenant_id, competencia, valor_meta, centro_custo_id, observacao, deleted_at, created_at, updated_at, created_by",
  )
  .eq("tenant_id", tenant.id)
  .order("competencia", { ascending: false })
  .limit(50);

const { data: augMetas } = await admin
  .from("metas_vendas_mensais")
  .select("*")
  .eq("tenant_id", tenant.id)
  .eq("competencia", competenciaSp)
  .is("deleted_at", null);

const { data: augAnyDate } = await admin
  .from("metas_vendas_mensais")
  .select("*")
  .eq("tenant_id", tenant.id)
  .like("competencia", `${y}-${m}%`)
  .is("deleted_at", null);

// Also check if competencia stored as YYYY-MM without day
const { data: augMonthOnly } = await admin
  .from("metas_vendas_mensais")
  .select("*")
  .eq("tenant_id", tenant.id)
  .eq("competencia", `${y}-${m}`)
  .is("deleted_at", null);

const gerais = (augMetas ?? []).filter((r) => !r.centro_custo_id);
const comCentro = (augMetas ?? []).filter((r) => r.centro_custo_id);

// Simulate old resolver (geral only)
const oldResolver = gerais[0] ? Number(gerais[0].valor_meta) : null;
// Simulate: if only centro metas exist, old returns null
const onlyCentroWouldMiss = gerais.length === 0 && comCentro.length > 0;

const report = {
  at: new Date().toISOString(),
  tenant: { id: tenant.id, slug: tenant.slug },
  timezoneProbe: {
    serverUtc: now.toISOString(),
    americaSaoPaulo: { hoje: hojeSp, competencia: competenciaSp },
  },
  queryError: allErr?.message ?? null,
  metasCount: allMetas?.length ?? 0,
  metas: allMetas ?? [],
  augustExact: augMetas ?? [],
  augustLike: augAnyDate ?? [],
  augustMonthOnlyString: augMonthOnly ?? [],
  diagnosis: {
    hasGeralAugust: gerais.length > 0,
    hasCentroAugust: comCentro.length > 0,
    oldResolverValor: oldResolver,
    onlyCentroWouldMissDashboard: onlyCentroWouldMiss,
    rootCauseHint: onlyCentroWouldMiss
      ? "Meta só com centro_custo_id — query geral (IS NULL) retorna null"
      : gerais.length === 0 && (augAnyDate?.length ?? 0) === 0
        ? "Nenhuma meta ativa para competência atual America/Sao_Paulo"
        : gerais.length > 0
          ? "Meta geral existe — investigar path UI/cache/KPI mapping"
          : "Investigar formato competencia / timezone",
  },
};

writeFileSync(join(OUT, "meta-trace.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.diagnosis, null, 2));
console.log("competencia SP", competenciaSp, "metas aug", (augMetas ?? []).length);
console.log(
  "sample",
  (allMetas ?? []).slice(0, 5).map((r) => ({
    competencia: r.competencia,
    valor: r.valor_meta,
    centro: r.centro_custo_id,
    deleted: r.deleted_at,
  })),
);
