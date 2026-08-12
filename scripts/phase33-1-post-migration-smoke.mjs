#!/usr/bin/env node
/**
 * Sprint 33.1 — smoke pós-migration RLS financeiro (PRODUCTION).
 * Somente tenant/dados de teste. Limpa artefatos ao final.
 * Não imprime secrets. Não altera schema.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "docs/testing/evidence/33-1");
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = process.env.PROD_URL ?? "https://gestao-no-foco.vercel.app";
const MARKER = `smoke-33-1-${Date.now()}`;
const PASSWORD = `Tmp!${Date.now()}Aa1`;

let pass = 0;
let fail = 0;
const results = {};

function check(key, cond, detail = "") {
  results[key] = { ok: Boolean(cond), detail };
  if (cond) {
    pass += 1;
    console.log("  PASS", key, detail);
  } else {
    fail += 1;
    console.log("  FAIL", key, detail);
  }
}

function isRlsDenied(error) {
  if (!error) return false;
  const m = `${error.message || ""} ${error.code || ""} ${error.details || ""}`.toLowerCase();
  return (
    m.includes("row-level security") ||
    m.includes("rls") ||
    m.includes("42501") ||
    m.includes("permission denied") ||
    m.includes("new row violates") ||
    error.code === "42501" ||
    error.code === "PGRST301"
  );
}

if (!url || !anon || !service) {
  console.error("Env Supabase incompleto (.env.local)");
  process.exit(1);
}

const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const report = {
  at: new Date().toISOString(),
  sprint: "33.1-post-migration",
  marker: MARKER,
  base: BASE,
  results: {},
  summary: null,
};

console.log("\n33.1 smoke pós-migration RLS financeiro\n");

const cleanup = {
  userIds: [],
  rowIds: [],
  tenantA: null,
  tenantB: null,
};

try {
  const { data: tenants, error: te } = await admin
    .from("tenants")
    .select("id,slug,name")
    .limit(30);
  if (te) throw te;

  const tenantA =
    (tenants ?? []).find((t) => t.slug === "teste-renato-01") ?? null;
  const tenantB =
    (tenants ?? []).find(
      (t) => t.slug !== "teste-renato-01" && /teste|demo|smoke/i.test(t.slug),
    ) ??
    (tenants ?? []).find((t) => t.slug !== tenantA?.slug) ??
    null;

  check("tenant_test_a", Boolean(tenantA?.id), tenantA?.slug ?? "missing");
  check("tenant_test_b", Boolean(tenantB?.id), tenantB?.slug ?? "missing");
  cleanup.tenantA = tenantA;
  cleanup.tenantB = tenantB;

  if (!tenantA?.id || !tenantB?.id) {
    throw new Error("Tenants de teste insuficientes para smoke cross-tenant");
  }

  // Seed row in B via service role (bypasses RLS) for cross-tenant negative read.
  const { data: seedB, error: seedErr } = await admin
    .from("contas_pagar")
    .insert({
      tenant_id: tenantB.id,
      descricao: `${MARKER}-tenant-b`,
      data_vencimento: "2099-12-31",
      valor_original: 1.11,
      status: "aberto",
    })
    .select("id")
    .single();
  if (seedErr) throw seedErr;
  cleanup.rowIds.push({ tenantId: tenantB.id, id: seedB.id });

  async function ensureUser(email, role, tenantId) {
    const { data: created, error: cErr } =
      await admin.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
      });
    if (cErr) throw cErr;
    const userId = created.user.id;
    cleanup.userIds.push(userId);

    const { error: mErr } = await admin.from("tenant_members").upsert(
      {
        tenant_id: tenantId,
        user_id: userId,
        role,
        status: "active",
      },
      { onConflict: "tenant_id,user_id" },
    );
    if (mErr) throw mErr;
    return userId;
  }

  const ownerEmail = `smoke33.1.owner.${Date.now()}@example.com`;
  const memberEmail = `smoke33.1.member.${Date.now()}@example.com`;
  await ensureUser(ownerEmail, "owner", tenantA.id);
  await ensureUser(memberEmail, "member", tenantA.id);

  async function clientAs(email) {
    const c = createClient(url, anon, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await c.auth.signInWithPassword({
      email,
      password: PASSWORD,
    });
    if (error) throw error;
    if (!data.session) throw new Error("sem session");
    return c;
  }

  // 1) Policy evidence via behavior + function grant probe as authenticated
  const owner = await clientAs(ownerEmail);
  const { data: canWrite, error: cwErr } = await owner.rpc("can_write_finance", {
    p_tenant_id: tenantA.id,
  });
  const { data: canRead, error: crErr } = await owner.rpc("can_read_finance", {
    p_tenant_id: tenantA.id,
  });
  check(
    "policies_functions_active",
    !cwErr && !crErr && canWrite === true && canRead === true,
    `write=${canWrite} read=${canRead} err=${cwErr?.message || crErr?.message || ""}`,
  );

  // 2) OWNER write
  const { data: ownerRow, error: insOwnerErr } = await owner
    .from("contas_pagar")
    .insert({
      tenant_id: tenantA.id,
      descricao: `${MARKER}-owner`,
      data_vencimento: "2099-12-31",
      valor_original: 2.22,
      status: "aberto",
    })
    .select("id")
    .single();
  check("owner_insert", !insOwnerErr && Boolean(ownerRow?.id), insOwnerErr?.message || "");
  if (ownerRow?.id) cleanup.rowIds.push({ tenantId: tenantA.id, id: ownerRow.id });

  const { data: ownerUpd, error: updOwnerErr } = await owner
    .from("contas_pagar")
    .update({ observacoes: `${MARKER}-upd` })
    .eq("id", ownerRow.id)
    .eq("tenant_id", tenantA.id)
    .select("id")
    .maybeSingle();
  check(
    "owner_update",
    !updOwnerErr && ownerUpd?.id === ownerRow.id,
    updOwnerErr?.message || "",
  );

  // 3-5) MEMBER blocked
  const member = await clientAs(memberEmail);
  const { data: memberCanWrite } = await member.rpc("can_write_finance", {
    p_tenant_id: tenantA.id,
  });
  const { data: memberCanRead } = await member.rpc("can_read_finance", {
    p_tenant_id: tenantA.id,
  });
  check(
    "member_write_fn_false",
    memberCanWrite === false && memberCanRead === true,
    `write=${memberCanWrite} read=${memberCanRead}`,
  );

  const { data: memIns, error: memInsErr } = await member
    .from("contas_pagar")
    .insert({
      tenant_id: tenantA.id,
      descricao: `${MARKER}-member-blocked`,
      data_vencimento: "2099-12-31",
      valor_original: 3.33,
      status: "aberto",
    })
    .select("id")
    .maybeSingle();
  check(
    "member_insert_blocked",
    Boolean(memInsErr) && !memIns?.id,
    memInsErr?.message || "unexpected success",
  );
  if (memIns?.id) cleanup.rowIds.push({ tenantId: tenantA.id, id: memIns.id });

  const { data: memUpd, error: memUpdErr } = await member
    .from("contas_pagar")
    .update({ observacoes: `${MARKER}-member-upd` })
    .eq("id", ownerRow.id)
    .eq("tenant_id", tenantA.id)
    .select("id");
  const updBlocked =
    Boolean(memUpdErr) || !memUpd || memUpd.length === 0;
  check(
    "member_update_blocked",
    updBlocked,
    memUpdErr?.message || `rows=${memUpd?.length ?? 0}`,
  );

  const { data: memDel, error: memDelErr } = await member
    .from("contas_pagar")
    .delete()
    .eq("id", ownerRow.id)
    .eq("tenant_id", tenantA.id)
    .select("id");
  const delBlocked =
    Boolean(memDelErr) || !memDel || memDel.length === 0;
  check(
    "member_delete_blocked",
    delBlocked,
    memDelErr?.message || `rows=${memDel?.length ?? 0}`,
  );

  // Confirm owner row still exists
  const { data: stillThere } = await admin
    .from("contas_pagar")
    .select("id")
    .eq("id", ownerRow.id)
    .maybeSingle();
  check("owner_row_survived_member_delete", stillThere?.id === ownerRow.id);

  // 6) Cross-tenant
  const { data: leakRead } = await owner
    .from("contas_pagar")
    .select("id")
    .eq("id", seedB.id)
    .maybeSingle();
  check("cross_tenant_read_blocked", !leakRead?.id, leakRead?.id || "none");

  const { data: leakIns, error: leakInsErr } = await owner
    .from("contas_pagar")
    .insert({
      tenant_id: tenantB.id,
      descricao: `${MARKER}-cross-write`,
      data_vencimento: "2099-12-31",
      valor_original: 4.44,
      status: "aberto",
    })
    .select("id")
    .maybeSingle();
  check(
    "cross_tenant_write_blocked",
    Boolean(leakInsErr) && !leakIns?.id,
    leakInsErr?.message || "unexpected success",
  );
  if (leakIns?.id) cleanup.rowIds.push({ tenantId: tenantB.id, id: leakIns.id });

  // 7) Unauthenticated
  const anonClient = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: anonIns, error: anonErr } = await anonClient
    .from("contas_pagar")
    .insert({
      tenant_id: tenantA.id,
      descricao: `${MARKER}-anon`,
      data_vencimento: "2099-12-31",
      valor_original: 5.55,
      status: "aberto",
    })
    .select("id")
    .maybeSingle();
  check(
    "unauth_write_blocked",
    Boolean(anonErr) && !anonIns?.id,
    anonErr?.message || "unexpected success",
  );
  if (anonIns?.id) cleanup.rowIds.push({ tenantId: tenantA.id, id: anonIns.id });

  // OWNER delete cleanup of own row (authorized write path)
  const { error: ownerDelErr } = await owner
    .from("contas_pagar")
    .delete()
    .eq("id", ownerRow.id)
    .eq("tenant_id", tenantA.id);
  check("owner_delete", !ownerDelErr, ownerDelErr?.message || "");
  // remove from cleanup list if deleted
  cleanup.rowIds = cleanup.rowIds.filter((r) => r.id !== ownerRow.id);

  // HTTP smoke production (auth redirect expected for app routes)
  async function probe(path) {
    const res = await fetch(`${BASE}${path}`, {
      redirect: "manual",
      headers: { "user-agent": "gof-33-1-rls-smoke" },
    });
    return res.status;
  }
  const health = await fetch(`${BASE}/api/health`, { cache: "no-store" });
  const healthJson = await health.json();
  check(
    "prod_health",
    health.ok && healthJson.ok === true && healthJson.env === "production",
    `status=${health.status}`,
  );

  for (const path of [
    `/${tenantA.slug}/dashboard`,
    `/${tenantA.slug}/financeiro`,
    `/${tenantA.slug}/crm`,
    `/${tenantA.slug}/ordens`,
    `/${tenantA.slug}/estoque`,
  ]) {
    const st = await probe(path);
    check(
      `http_${path.split("/").pop()}`,
      st === 307 || st === 302 || st === 200,
      `status=${st}`,
    );
  }
} catch (err) {
  check("runner_exception", false, err instanceof Error ? err.message : String(err));
} finally {
  // Cleanup temp rows (service role)
  for (const row of cleanup.rowIds) {
    await admin.from("contas_pagar").delete().eq("id", row.id);
  }
  // Cleanup memberships + users
  for (const userId of cleanup.userIds) {
    if (cleanup.tenantA?.id) {
      await admin
        .from("tenant_members")
        .delete()
        .eq("tenant_id", cleanup.tenantA.id)
        .eq("user_id", userId);
    }
    await admin.auth.admin.deleteUser(userId);
  }
}

report.results = results;
report.summary = { pass, fail };
writeFileSync(join(OUT, "post-migration-smoke.json"), JSON.stringify(report, null, 2));
console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
console.log(`Evidence: docs/testing/evidence/33-1/post-migration-smoke.json\n`);
process.exit(fail > 0 ? 1 : 0);
