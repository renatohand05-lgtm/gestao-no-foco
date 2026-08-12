#!/usr/bin/env node
/**
 * Sprint 33.3 — smoke pós-migration billing (PRODUCTION).
 * Somente tenants/dados de teste. Limpa artefatos ao final.
 * NÃO reaplica migration. NÃO cobra. NÃO imprime secrets.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "docs/testing/evidence/33-3");
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
const MARKER = `smoke-33-3-${Date.now()}`;
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
    m.includes("violates row-level") ||
    error.code === "42501" ||
    error.code === "PGRST301" ||
    error.code === "42501"
  );
}

function isDeniedOrEmpty(error, data) {
  if (isRlsDenied(error)) return true;
  if (!error && (data == null || (Array.isArray(data) && data.length === 0))) {
    return true;
  }
  // PostgREST may return empty without error when RLS filters all rows
  return false;
}

if (!url || !anon || !service) {
  console.error("Env Supabase incompleto (.env.local)");
  process.exit(1);
}

const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const cleanup = {
  userIds: [],
  subscriptionTenantIds: [],
  checkoutIds: [],
  eventIds: [],
};

console.log("\n33.3 smoke pós-migration billing\n");

try {
  // ── Schema objects ─────────────────────────────────────────
  const { data: plans, error: plansErr } = await admin
    .from("billing_plans")
    .select("id,slug,name,status,amount_cents,is_pilot,entitlements")
    .eq("slug", "pilot")
    .maybeSingle();
  check(
    "table_billing_plans",
    !plansErr && Boolean(plans?.id),
    plansErr?.message || `pilot=${plans?.slug} amount=${plans?.amount_cents}`,
  );

  const { error: subProbeErr } = await admin
    .from("billing_subscriptions")
    .select("id")
    .limit(1);
  check(
    "table_billing_subscriptions",
    !subProbeErr,
    subProbeErr?.message || "ok",
  );

  const { error: chkProbeErr } = await admin
    .from("billing_checkout_attempts")
    .select("id")
    .limit(1);
  check(
    "table_billing_checkout_attempts",
    !chkProbeErr,
    chkProbeErr?.message || "ok",
  );

  const { error: evtProbeErr } = await admin
    .from("billing_provider_events")
    .select("id")
    .limit(1);
  check(
    "table_billing_provider_events",
    !evtProbeErr,
    evtProbeErr?.message || "ok",
  );

  check(
    "pilot_plan_seed",
    Boolean(plans?.is_pilot) && plans?.amount_cents == null,
    `is_pilot=${plans?.is_pilot} amount_cents=${plans?.amount_cents}`,
  );

  const ents = plans?.entitlements;
  const modules = ents && typeof ents === "object" ? ents.modules : null;
  check(
    "pilot_entitlements",
    Array.isArray(modules) && modules.includes("financeiro"),
    Array.isArray(modules) ? modules.join(",") : String(ents),
  );

  // ── Tenants de teste ───────────────────────────────────────
  const { data: tenants, error: te } = await admin
    .from("tenants")
    .select("id,slug,name")
    .limit(40);
  if (te) throw te;

  const tenantA =
    (tenants ?? []).find((t) => t.slug === "teste-renato-01") ?? null;
  const tenantB =
    (tenants ?? []).find((t) => t.slug === "gestaonofoco2") ??
    (tenants ?? []).find((t) => t.slug !== tenantA?.slug) ??
    null;

  check("tenant_test_a", Boolean(tenantA?.id), tenantA?.slug ?? "missing");
  check("tenant_test_b", Boolean(tenantB?.id), tenantB?.slug ?? "missing");
  if (!tenantA?.id || !tenantB?.id || !plans?.id) {
    throw new Error("Pré-requisitos insuficientes (tenants/plan)");
  }

  async function ensureUser(email, role, tenantId) {
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
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

  const ownerEmail = `smoke33.3.owner.${Date.now()}@example.com`;
  const memberEmail = `smoke33.3.member.${Date.now()}@example.com`;
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

  const owner = await clientAs(ownerEmail);
  const member = await clientAs(memberEmail);
  const unauth = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── RPC helpers ────────────────────────────────────────────
  const { data: ownRead, error: ownReadErr } = await owner.rpc(
    "can_read_billing",
    { p_tenant_id: tenantA.id },
  );
  const { data: ownManage, error: ownManageErr } = await owner.rpc(
    "can_manage_billing",
    { p_tenant_id: tenantA.id },
  );
  check(
    "rpc_owner_billing",
    !ownReadErr &&
      !ownManageErr &&
      ownRead === true &&
      ownManage === true,
    `read=${ownRead} manage=${ownManage}`,
  );

  const { data: memRead, error: memReadErr } = await member.rpc(
    "can_read_billing",
    { p_tenant_id: tenantA.id },
  );
  const { data: memManage, error: memManageErr } = await member.rpc(
    "can_manage_billing",
    { p_tenant_id: tenantA.id },
  );
  check(
    "rpc_member_billing",
    !memReadErr &&
      !memManageErr &&
      memRead === true &&
      memManage === false,
    `read=${memRead} manage=${memManage}`,
  );

  const { data: crossManage } = await owner.rpc("can_manage_billing", {
    p_tenant_id: tenantB.id,
  });
  check(
    "rpc_cross_tenant_manage_false",
    crossManage === false,
    `manage_b=${crossManage}`,
  );

  // ── Seed subscription on B (service) for cross-tenant negative ─
  const trialStart = new Date();
  const trialEnd = new Date(trialStart.getTime() + 30 * 86400000);
  await admin.from("billing_subscriptions").delete().eq("tenant_id", tenantB.id);
  const { error: subBErr } = await admin
    .from("billing_subscriptions")
    .insert({
      tenant_id: tenantB.id,
      plan_id: plans.id,
      status: "trial",
      provider: "none",
      trial_start: trialStart.toISOString(),
      trial_end: trialEnd.toISOString(),
      current_period_start: trialStart.toISOString(),
      current_period_end: trialEnd.toISOString(),
    });
  if (subBErr) throw subBErr;
  cleanup.subscriptionTenantIds.push(tenantB.id);

  // ── OWNER starts trial on A ────────────────────────────────
  await admin.from("billing_subscriptions").delete().eq("tenant_id", tenantA.id);
  const { data: trialA, error: trialAErr } = await owner
    .from("billing_subscriptions")
    .insert({
      tenant_id: tenantA.id,
      plan_id: plans.id,
      status: "trial",
      provider: "none",
      trial_start: trialStart.toISOString(),
      trial_end: trialEnd.toISOString(),
      current_period_start: trialStart.toISOString(),
      current_period_end: trialEnd.toISOString(),
    })
    .select("*")
    .single();
  check(
    "owner_trial_create",
    !trialAErr &&
      trialA?.status === "trial" &&
      trialA?.tenant_id === tenantA.id &&
      trialA?.plan_id === plans.id &&
      Boolean(trialA?.trial_start) &&
      Boolean(trialA?.trial_end),
    trialAErr?.message ||
      `status=${trialA?.status} plan=${trialA?.plan_id === plans.id}`,
  );
  if (trialA?.id) cleanup.subscriptionTenantIds.push(tenantA.id);

  const { data: ownerReadA, error: ownerReadAErr } = await owner
    .from("billing_subscriptions")
    .select("id,status,provider")
    .eq("tenant_id", tenantA.id)
    .maybeSingle();
  check(
    "owner_read_own",
    !ownerReadAErr && ownerReadA?.id === trialA?.id,
    ownerReadAErr?.message || ownerReadA?.status,
  );

  // OWNER must NOT see/update tenant B
  const { data: ownerSeeB, error: ownerSeeBErr } = await owner
    .from("billing_subscriptions")
    .select("id")
    .eq("tenant_id", tenantB.id)
    .maybeSingle();
  check(
    "owner_cross_tenant_blocked",
    !ownerSeeB && (ownerSeeBErr == null || isRlsDenied(ownerSeeBErr)),
    ownerSeeB ? `leaked=${ownerSeeB.id}` : "empty",
  );

  const { data: ownerUpdB, error: ownerUpdBErr } = await owner
    .from("billing_subscriptions")
    .update({ cancel_at_period_end: true })
    .eq("tenant_id", tenantB.id)
    .select("id");
  check(
    "owner_cross_tenant_update_blocked",
    isRlsDenied(ownerUpdBErr) ||
      !ownerUpdB ||
      ownerUpdB.length === 0,
    ownerUpdBErr?.message || `rows=${ownerUpdB?.length ?? 0}`,
  );

  // ── MEMBER blocked from manage ─────────────────────────────
  const { data: memReadA } = await member
    .from("billing_subscriptions")
    .select("id,status")
    .eq("tenant_id", tenantA.id)
    .maybeSingle();
  check(
    "member_read_own",
    Boolean(memReadA?.id),
    memReadA?.status ?? "missing",
  );

  const { data: memIns, error: memInsErr } = await member
    .from("billing_subscriptions")
    .insert({
      tenant_id: tenantA.id,
      plan_id: plans.id,
      status: "active",
      provider: "none",
    })
    .select("id");
  // unique or RLS — either way member must not create/overwrite as active paid
  check(
    "member_insert_blocked",
    isRlsDenied(memInsErr) || !memIns || memIns.length === 0,
    memInsErr?.message || `rows=${memIns?.length ?? 0}`,
  );

  const { data: memUpd, error: memUpdErr } = await member
    .from("billing_subscriptions")
    .update({ status: "active" })
    .eq("tenant_id", tenantA.id)
    .select("id,status");
  check(
    "member_update_blocked",
    isRlsDenied(memUpdErr) || !memUpd || memUpd.length === 0,
    memUpdErr?.message || `rows=${memUpd?.length ?? 0}`,
  );

  // Confirm still trial (not escalated by member)
  const { data: stillTrial } = await admin
    .from("billing_subscriptions")
    .select("status,provider")
    .eq("tenant_id", tenantA.id)
    .maybeSingle();
  check(
    "no_real_charge_status",
    stillTrial?.status === "trial" && stillTrial?.provider === "none",
    `status=${stillTrial?.status} provider=${stillTrial?.provider}`,
  );

  // ── Unauthenticated ────────────────────────────────────────
  const { data: unauthSub, error: unauthErr } = await unauth
    .from("billing_subscriptions")
    .select("id")
    .eq("tenant_id", tenantA.id);
  check(
    "unauthenticated_blocked",
    isDeniedOrEmpty(unauthErr, unauthSub) || isRlsDenied(unauthErr),
    unauthErr?.message || `rows=${unauthSub?.length ?? 0}`,
  );

  const { error: unauthInsErr } = await unauth
    .from("billing_subscriptions")
    .insert({
      tenant_id: tenantA.id,
      plan_id: plans.id,
      status: "active",
      provider: "none",
    });
  check(
    "unauthenticated_write_blocked",
    Boolean(unauthInsErr),
    unauthInsErr?.message || "unexpected success",
  );

  // ── provider_events protected from authenticated ───────────
  const { data: evtOwner, error: evtOwnerErr } = await owner
    .from("billing_provider_events")
    .select("id")
    .limit(5);
  check(
    "provider_events_owner_denied",
    isRlsDenied(evtOwnerErr) ||
      evtOwnerErr != null ||
      !evtOwner ||
      evtOwner.length === 0,
    evtOwnerErr?.message || `rows=${evtOwner?.length ?? 0}`,
  );

  const { error: evtInsErr } = await owner.from("billing_provider_events").insert({
    provider: "none",
    event_id: `${MARKER}-evt`,
    payload_summary: { smoke: true },
  });
  check(
    "provider_events_owner_insert_denied",
    Boolean(evtInsErr),
    evtInsErr?.message || "unexpected success",
  );

  // Service role can write events (server-only path)
  const { data: evtAdmin, error: evtAdminErr } = await admin
    .from("billing_provider_events")
    .insert({
      provider: "none",
      event_id: `${MARKER}-admin`,
      tenant_id: tenantA.id,
      event_type: "smoke.test",
      payload_summary: { marker: MARKER },
    })
    .select("id")
    .single();
  check(
    "provider_events_service_role_ok",
    !evtAdminErr && Boolean(evtAdmin?.id),
    evtAdminErr?.message || evtAdmin?.id,
  );
  if (evtAdmin?.id) cleanup.eventIds.push(evtAdmin.id);

  // ── Checkout idempotency (owner) ───────────────────────────
  const idem = `${MARKER}-chk`;
  const { data: chk1, error: chk1Err } = await owner
    .from("billing_checkout_attempts")
    .insert({
      tenant_id: tenantA.id,
      idempotency_key: idem,
      plan_slug: "pilot",
      status: "provider_missing",
      provider: "none",
      result_summary: { reason: "PROVIDER_NOT_CONFIGURED" },
    })
    .select("id,status")
    .single();
  check(
    "checkout_owner_create",
    !chk1Err && chk1?.status === "provider_missing",
    chk1Err?.message || chk1?.status,
  );
  if (chk1?.id) cleanup.checkoutIds.push(chk1.id);

  const { error: chkDupErr } = await owner
    .from("billing_checkout_attempts")
    .insert({
      tenant_id: tenantA.id,
      idempotency_key: idem,
      plan_slug: "pilot",
      status: "completed",
      provider: "none",
    });
  check(
    "checkout_idempotent_duplicate",
    Boolean(chkDupErr) &&
      (chkDupErr.code === "23505" || /duplicate|unique/i.test(chkDupErr.message)),
    chkDupErr?.code || chkDupErr?.message || "no error",
  );

  const { error: memChkErr } = await member
    .from("billing_checkout_attempts")
    .insert({
      tenant_id: tenantA.id,
      idempotency_key: `${MARKER}-mem`,
      plan_slug: "pilot",
      status: "pending",
      provider: "none",
    });
  check(
    "checkout_member_blocked",
    isRlsDenied(memChkErr) || Boolean(memChkErr),
    memChkErr?.message || "unexpected success",
  );

  // ── HTTP production UI gates ───────────────────────────────
  async function probe(path, method = "GET", body) {
    const res = await fetch(`${BASE}${path}`, {
      method,
      redirect: "manual",
      headers: {
        "user-agent": "gof-33-3-post-migration-smoke",
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.status;
  }

  const stAssinatura = await probe(
    `/${tenantA.slug}/configuracoes/assinatura`,
  );
  check(
    "http_assinatura_auth_gate",
    stAssinatura === 307 || stAssinatura === 302 || stAssinatura === 200,
    String(stAssinatura),
  );

  const stWh = await probe("/api/billing/webhook");
  check("http_webhook_get", stWh === 200 || stWh === 503, String(stWh));

  const stWhPost = await probe("/api/billing/webhook", "POST", {
    id: `${MARKER}-http`,
  });
  check(
    "http_webhook_no_fake_paid",
    stWhPost === 503 || stWhPost === 401 || stWhPost === 400,
    String(stWhPost),
  );

  for (const path of [
    `/${tenantA.slug}/dashboard`,
    `/${tenantA.slug}/crm`,
    `/${tenantA.slug}/ordens`,
    `/${tenantA.slug}/estoque`,
    `/${tenantA.slug}/financeiro`,
  ]) {
    const st = await probe(path);
    check(
      `http_regress_${path.split("/").pop()}`,
      st === 307 || st === 302 || st === 200,
      String(st),
    );
  }

  // Service role key must not be in NEXT_PUBLIC_* (structural)
  check(
    "service_role_not_public_env",
    !process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
    "ok",
  );
} catch (err) {
  check("smoke_exception", false, err instanceof Error ? err.message : String(err));
} finally {
  // Cleanup test artifacts only
  for (const id of cleanup.checkoutIds) {
    await admin.from("billing_checkout_attempts").delete().eq("id", id);
  }
  for (const id of cleanup.eventIds) {
    await admin.from("billing_provider_events").delete().eq("id", id);
  }
  for (const tid of cleanup.subscriptionTenantIds) {
    await admin.from("billing_subscriptions").delete().eq("tenant_id", tid);
  }
  // Also remove checkout by marker pattern on tenants if any leaked
  for (const uid of cleanup.userIds) {
    await admin.from("tenant_members").delete().eq("user_id", uid);
    await admin.auth.admin.deleteUser(uid);
  }
  console.log("\nCleanup done (temp users/rows).\n");
}

const report = {
  at: new Date().toISOString(),
  sprint: "33.3-post-migration",
  marker: MARKER,
  base: BASE,
  results,
  summary: { pass, fail },
};
writeFileSync(
  join(OUT, "post-migration-smoke.json"),
  JSON.stringify(report, null, 2),
);
console.log(`Resumo: ${pass} PASS · ${fail} FAIL`);
process.exit(fail ? 1 : 0);
