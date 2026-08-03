#!/usr/bin/env node
/**
 * Sprint 30.8.1 — Integration Hub security audit.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { auditIntegrationSecurity } from "../lib/integracoes/security.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0;
let fail = 0;

function check(name, cond) {
  if (cond) {
    pass += 1;
    console.log("  PASS", name);
  } else {
    fail += 1;
    console.log("  FAIL", name);
  }
}

const FORBIDDEN = [
  { name: "sk_live", re: /sk_live/i },
  { name: "eyJ", re: /eyJ/i },
  { name: "BEGIN PRIVATE", re: /BEGIN PRIVATE/i },
  { name: "password=", re: /password=/i },
  { name: "secret=", re: /secret=/i },
  { name: "AWS_SECRET", re: /AWS_SECRET/i },
];

function isRedactedContext(line) {
  return /\[redacted\]|redacted/i.test(line);
}

function collectFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      collectFiles(full, acc);
    } else if (/\.(ts|tsx|mjs|js)$/.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

function scanForbiddenPatterns() {
  const dirs = [
    join(root, "lib/integracoes"),
    join(root, "components/integracoes"),
  ];
  const hits = [];
  for (const dir of dirs) {
    for (const file of collectFiles(dir)) {
      const rel = file.replace(root + "\\", "").replace(root + "/", "");
      const lines = readFileSync(file, "utf8").split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const pat of FORBIDDEN) {
          if (pat.re.test(line) && !isRedactedContext(line)) {
            hits.push(`${rel}:${i + 1} (${pat.name})`);
          }
        }
      }
    }
  }
  return hits;
}

console.log("\nPhase 30.8.1 — integrations security\n");

const report = auditIntegrationSecurity("audit-tenant");
check("auditIntegrationSecurity ok", report.ok === true);
check("liveExternalCalls false", report.liveExternalCalls === false);
check("credentialsStored false", report.credentialsStored === false);
check("activeWebhooks false", report.activeWebhooks === false);

const forbiddenHits = scanForbiddenPatterns();
check(
  "sem padrões proibidos (sk_live, eyJ, secrets)",
  forbiddenHits.length === 0,
);
if (forbiddenHits.length > 0) {
  for (const h of forbiddenHits.slice(0, 8)) {
    console.log("    →", h);
  }
}

const pageAuthSrc = readFileSync(
  join(root, "lib/integracoes/page-auth.ts"),
  "utf8",
);
check(
  "page-auth importa requireTenant",
  /requireTenant/.test(pageAuthSrc),
);
check(
  "requireIntegracoesAccess chama requireTenant",
  /requireIntegracoesAccess[\s\S]*?requireTenant\s*\(/.test(pageAuthSrc),
);

const actionsSrc = readFileSync(join(root, "lib/integracoes/actions.ts"), "utf8");
check('actions.ts "use server"', /^["']use server["'];?\s*$/m.test(actionsSrc));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
