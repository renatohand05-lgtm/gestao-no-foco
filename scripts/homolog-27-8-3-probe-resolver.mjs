#!/usr/bin/env node
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
    )
      v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnvLocal();

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const { data: tenants } = await admin
  .from("tenants")
  .select("id,slug,name")
  .limit(30);
const tenant =
  (tenants ?? []).find((t) => t.slug === "teste-renato-01") ?? null;
if (!tenant) {
  console.error("Tenant teste-renato-01 não encontrado");
  process.exit(1);
}

function civilSP(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

const hoje = civilSP();
const competencia = `${hoje.slice(0, 7)}-01`;

async function resolveLikeDashboard(centroId) {
  let q = admin
    .from("metas_vendas_mensais")
    .select("valor_meta, centro_custo_id, updated_at, competencia")
    .eq("tenant_id", tenant.id)
    .eq("competencia", competencia)
    .is("deleted_at", null);
  if (centroId) q = q.eq("centro_custo_id", centroId);
  else q = q.is("centro_custo_id", null);
  const { data, error } = await q.maybeSingle();
  if (!error && data) {
    return { ok: true, valor: Number(data.valor_meta), row: data, via: "exact" };
  }
  if (centroId) {
    const geral = await admin
      .from("metas_vendas_mensais")
      .select("valor_meta, centro_custo_id, updated_at, competencia")
      .eq("tenant_id", tenant.id)
      .eq("competencia", competencia)
      .is("deleted_at", null)
      .is("centro_custo_id", null)
      .maybeSingle();
    if (!geral.error && geral.data) {
      return {
        ok: true,
        valor: Number(geral.data.valor_meta),
        row: geral.data,
        via: "fallback_geral",
      };
    }
  }
  return { ok: false, error: error?.message ?? null, data };
}

// Authenticated user path (anon + user JWT from playwright auth if possible)
let authProbe = null;
try {
  const authFile = join(root, "docs/testing/playwright/.auth/user.json");
  if (existsSync(authFile)) {
    const auth = JSON.parse(readFileSync(authFile, "utf8"));
    const cookie = (auth.cookies ?? []).find((c) =>
      c.name.includes("auth-token"),
    );
    if (cookie?.value) {
      let raw = cookie.value;
      if (raw.startsWith("base64-")) {
        raw = Buffer.from(raw.slice(7), "base64").toString("utf8");
      }
      const parsed = JSON.parse(raw);
      const access = parsed.access_token;
      if (access) {
        const userClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          {
            global: { headers: { Authorization: `Bearer ${access}` } },
            auth: { autoRefreshToken: false, persistSession: false },
          },
        );
        const { data, error } = await userClient
          .from("metas_vendas_mensais")
          .select("id, competencia, valor_meta, centro_custo_id")
          .eq("tenant_id", tenant.id)
          .eq("competencia", competencia)
          .is("deleted_at", null);
        authProbe = {
          ok: !error,
          error: error?.message ?? null,
          rows: data,
          count: data?.length ?? 0,
        };
      }
    }
  }
} catch (e) {
  authProbe = { ok: false, error: String(e) };
}

const report = {
  tenant,
  hoje,
  competencia,
  serviceRoleGeral: await resolveLikeDashboard(null),
  serviceRoleWithCentro: await resolveLikeDashboard(
    "30695788-5fe7-4685-a2b2-8bb50076478a",
  ),
  authProbe,
};

writeFileSync(join(OUT, "resolver-probe.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
