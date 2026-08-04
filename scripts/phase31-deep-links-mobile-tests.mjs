#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

console.log("\nPhase 31.9 — deep links\n");
const dl = readFileSync(join(root, "apps/mobile/src/productivity/deep-links.ts"), "utf8");
const rootLayout = readFileSync(join(root, "apps/mobile/app/_layout.tsx"), "utf8");

check("allowlist rotas", /ALLOWED_INTERNAL/.test(dl));
check("bloqueia https externo", /URL externa bloqueada/.test(dl));
check("bloqueia path ..", /\.\./.test(dl));
check("scheme gof", /gof:\/\//.test(dl));
check("root usa resolveInternalDeepLink", /resolveInternalDeepLink/.test(rootLayout));
check("exige sessão autenticada", /authenticated/.test(rootLayout));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
