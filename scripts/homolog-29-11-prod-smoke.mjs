#!/usr/bin/env node
/**
 * Fase 29.11 — Smoke HTTP em produção (sem sessão Vercel).
 * Valida alias Ready, login e redirects de rotas tenant.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const OUT = resolve("docs/testing/evidence/release-v29");
mkdirSync(OUT, { recursive: true });
const BASE = process.env.PROD_URL ?? "https://gestao-no-foco.vercel.app";
const TENANT = "teste-renato-01";

const routes = [
  "/",
  "/login",
  `/${TENANT}/dashboard`,
  `/${TENANT}/financeiro`,
  `/${TENANT}/financeiro/dre`,
  `/${TENANT}/crm`,
  `/${TENANT}/compras`,
  `/${TENANT}/estoque`,
  `/${TENANT}/agenda`,
  `/${TENANT}/analytics`,
  `/${TENANT}/inteligencia`,
  `/${TENANT}/financeiro/fluxo-caixa`,
  `/${TENANT}/configuracoes`,
];

const report = {
  at: new Date().toISOString(),
  base: BASE,
  checks: [],
};

function push(ok, detail) {
  report.checks.push({ ok: Boolean(ok), detail });
  console.log(ok ? "  PASS" : "  FAIL", detail);
}

async function probe(path, { follow = false } = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    redirect: follow ? "follow" : "manual",
    headers: { "user-agent": "gof-release-v29-smoke" },
  });
  const status = res.status;
  const loc = res.headers.get("location") ?? "";
  return { status, loc, finalUrl: res.url };
}

for (const path of routes) {
  const noFollow = await probe(path, { follow: false });
  const follow = await probe(path, { follow: true });
  const isPublic = path === "/" || path === "/login";
  const okNoFollow = isPublic
    ? noFollow.status === 200
    : noFollow.status === 307 || noFollow.status === 302 || noFollow.status === 200;
  const okFollow = follow.status === 200;
  const not500 = noFollow.status < 500 && follow.status < 500;
  const not404 = noFollow.status !== 404 && follow.status !== 404;
  push(
    okNoFollow && okFollow && not500 && not404,
    `${path} noFollow=${noFollow.status} follow=${follow.status} loc=${noFollow.loc.slice(0, 80)}`,
  );
}

const pass = report.checks.filter((c) => c.ok).length;
const fail = report.checks.filter((c) => !c.ok).length;
report.summary = { pass, fail };
writeFileSync(resolve(OUT, "smoke-prod.json"), JSON.stringify(report, null, 2));
console.log(`\nProd smoke: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
