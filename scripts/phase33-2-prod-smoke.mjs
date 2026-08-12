#!/usr/bin/env node
/**
 * Sprint 33.2 — smoke HTTP production (dados de teste / rotas públicas).
 * Não altera dados de cliente. Não imprime secrets.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "docs/testing/evidence/33-2");
mkdirSync(OUT, { recursive: true });

const BASE = process.env.PROD_URL ?? "https://gestao-no-foco.vercel.app";
const TENANT_A = "teste-renato-01";
const TENANT_B = "gestaonofoco2";

const report = {
  at: new Date().toISOString(),
  sprint: "33.2",
  base: BASE,
  checks: [],
};

function push(ok, detail) {
  report.checks.push({ ok: Boolean(ok), detail });
  console.log(ok ? "  PASS" : "  FAIL", detail);
}

async function probe(path, { follow = false } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    redirect: follow ? "follow" : "manual",
    headers: { "user-agent": "gof-33-2-prod-smoke" },
  });
  return {
    status: res.status,
    loc: res.headers.get("location") ?? "",
    requestId: res.headers.get("x-request-id") ?? "",
  };
}

const health = await probe("/api/health", { follow: true });
push(health.status === 200, `/api/health status=${health.status}`);

for (const path of ["/login", "/register", "/onboarding", "/empresas/nova"]) {
  const noFollow = await probe(path, { follow: false });
  const follow = await probe(path, { follow: true });
  const authGate =
    path === "/login" || path === "/register"
      ? noFollow.status === 200
      : noFollow.status === 307 ||
        noFollow.status === 302 ||
        noFollow.status === 200;
  push(
    authGate && follow.status < 500 && noFollow.status !== 404,
    `${path} noFollow=${noFollow.status} follow=${follow.status}`,
  );
}

for (const slug of [TENANT_A, TENANT_B]) {
  for (const suffix of [
    "dashboard",
    "crm",
    "ordens",
    "estoque",
    "financeiro",
    "configuracoes/equipe",
    "perfil",
  ]) {
    const path = `/${slug}/${suffix}`;
    const noFollow = await probe(path, { follow: false });
    const ok =
      (noFollow.status === 307 ||
        noFollow.status === 302 ||
        noFollow.status === 200) &&
      noFollow.status !== 404 &&
      noFollow.status < 500;
    push(ok, `${path} noFollow=${noFollow.status} loc=${noFollow.loc.slice(0, 80)}`);
  }
}

// Slug sem membership típica deve redirecionar (auth gate), nunca 500.
const evil = await probe("/empresa-inexistente-xyz/dashboard", { follow: false });
push(
  evil.status === 307 || evil.status === 302 || evil.status === 200,
  `evil-slug noFollow=${evil.status}`,
);

const pass = report.checks.filter((c) => c.ok).length;
const fail = report.checks.filter((c) => !c.ok).length;
report.summary = { pass, fail };

writeFileSync(join(OUT, "prod-smoke.json"), JSON.stringify(report, null, 2));
console.log(`\nResumo: ${pass} PASS · ${fail} FAIL`);
process.exit(fail ? 1 : 0);
