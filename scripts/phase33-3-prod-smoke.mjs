#!/usr/bin/env node
/**
 * Sprint 33.3 — smoke HTTP production (test tenants only).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "docs/testing/evidence/33-3");
mkdirSync(OUT, { recursive: true });

const BASE = process.env.PROD_URL ?? "https://gestao-no-foco.vercel.app";
const TENANT = "teste-renato-01";

const report = {
  at: new Date().toISOString(),
  sprint: "33.3",
  base: BASE,
  checks: [],
};

function push(ok, detail) {
  report.checks.push({ ok: Boolean(ok), detail });
  console.log(ok ? "  PASS" : "  FAIL", detail);
}

async function probe(path, { follow = false, method = "GET", body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    redirect: follow ? "follow" : "manual",
    headers: {
      "user-agent": "gof-33-3-prod-smoke",
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, loc: res.headers.get("location") ?? "" };
}

const health = await probe("/api/health", { follow: true });
push(health.status === 200, `/api/health ${health.status}`);

const whGet = await probe("/api/billing/webhook", { follow: true });
push(
  whGet.status === 200 || whGet.status === 503,
  `GET /api/billing/webhook ${whGet.status}`,
);

const whPost = await probe("/api/billing/webhook", {
  method: "POST",
  body: { id: "smoke-no-secret" },
});
push(
  whPost.status === 503 || whPost.status === 401 || whPost.status === 400,
  `POST webhook sem secret ${whPost.status} (não 200 paid)`,
);

for (const path of [
  `/${TENANT}/dashboard`,
  `/${TENANT}/crm`,
  `/${TENANT}/ordens`,
  `/${TENANT}/estoque`,
  `/${TENANT}/financeiro`,
  `/${TENANT}/configuracoes`,
  `/${TENANT}/configuracoes/assinatura`,
  `/${TENANT}/configuracoes/equipe`,
]) {
  const r = await probe(path, { follow: false });
  push(
    (r.status === 307 || r.status === 302 || r.status === 200) && r.status < 500,
    `${path} ${r.status}`,
  );
}

const pass = report.checks.filter((c) => c.ok).length;
const fail = report.checks.filter((c) => !c.ok).length;
report.summary = { pass, fail };
writeFileSync(join(OUT, "prod-smoke.json"), JSON.stringify(report, null, 2));
console.log(`\nResumo: ${pass} PASS · ${fail} FAIL`);
process.exit(fail ? 1 : 0);
