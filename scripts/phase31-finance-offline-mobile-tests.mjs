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

console.log("\nPhase 31.3 — finance offline mobile\n");
const offline = readFileSync(
  join(root, "apps/mobile/src/finance/offline-snapshot.ts"),
  "utf8",
);
const home = readFileSync(join(root, "apps/mobile/app/(app)/financeiro/index.tsx"), "utf8");
const aprov = readFileSync(
  join(root, "apps/mobile/app/(app)/financeiro/aprovacoes.tsx"),
  "utf8",
);

check("saveFinanceSnapshot", /saveFinanceSnapshot/.test(offline));
check("loadFinanceSnapshot", /loadFinanceSnapshot/.test(offline));
check("home lê snapshot", /loadFinanceSnapshot/.test(home));
check("banner desatualizado", /desatualizado|offlineMinutes/.test(home));
check("aprovações bloqueadas offline", /bloqueadas offline|Offline/.test(aprov));
check("sem fila de mutação", !/mutationQueue|offlineQueue|enqueueMutation/.test(offline + home));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
