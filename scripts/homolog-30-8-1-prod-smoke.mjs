#!/usr/bin/env node
/**
 * Sprint 30.8.1 — Smoke HTTP produção (Integration Hub + rotas Fase 30).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const OUT = resolve("docs/testing/evidence/30-final-release");
mkdirSync(OUT, { recursive: true });
const BASE = process.env.PROD_URL ?? "https://gestao-no-foco.vercel.app";
const TENANT = "teste-renato-01";

const routes = [
  "/",
  "/login",
  `/${TENANT}/dashboard`,
  `/${TENANT}/integracoes`,
  `/${TENANT}/integracoes?tab=api`,
  `/${TENANT}/integracoes?tab=marketplace`,
  `/${TENANT}/integracoes?tab=connections`,
  `/${TENANT}/integracoes?tab=webhooks`,
  `/${TENANT}/integracoes?tab=scheduler`,
  `/${TENANT}/integracoes?tab=events`,
  `/${TENANT}/integracoes?tab=logs`,
  `/${TENANT}/integracoes?tab=monitor`,
  `/${TENANT}/integracoes?tab=config`,
  `/${TENANT}/automacoes`,
  `/${TENANT}/crm`,
  `/${TENANT}/analytics`,
];

const report = {
  at: new Date().toISOString(),
  sprint: "30.8.1",
  base: BASE,
  commitHint: "2c107f5",
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
    headers: { "user-agent": "gof-30-8-1-prod-smoke" },
  });
  return {
    status: res.status,
    loc: res.headers.get("location") ?? "",
  };
}

const root = await probe("/", { follow: true });
push(root.status === 200, `alias / follow=${root.status}`);

for (const path of routes) {
  const noFollow = await probe(path, { follow: false });
  const follow = await probe(path, { follow: true });
  const isPublic = path === "/" || path === "/login";
  const okNoFollow = isPublic
    ? noFollow.status === 200
    : noFollow.status === 307 ||
      noFollow.status === 302 ||
      noFollow.status === 200;
  const okFollow = follow.status === 200;
  const not500 = noFollow.status < 500 && follow.status < 500;
  const not404 = noFollow.status !== 404 && follow.status !== 404;
  push(
    okNoFollow && okFollow && not500 && not404,
    `${path} noFollow=${noFollow.status} follow=${follow.status}`,
  );
}

const pass = report.checks.filter((c) => c.ok).length;
const fail = report.checks.filter((c) => !c.ok).length;
report.summary = { pass, fail };
writeFileSync(resolve(OUT, "smoke-prod.json"), JSON.stringify(report, null, 2));
console.log(`\nProd smoke: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
