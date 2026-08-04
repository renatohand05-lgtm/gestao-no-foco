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

console.log("\nPhase 31.9 — context actions\n");
const ctx = readFileSync(
  join(root, "apps/mobile/src/productivity/context-actions.ts"),
  "utf8",
);
const os = readFileSync(
  join(root, "apps/mobile/app/(app)/operacao/ordens/[id]/index.tsx"),
  "utf8",
);

check("contextActionsFor", /contextActionsFor/.test(ctx));
check("work-order actions", /work-order/.test(ctx));
check("filtra por permissão", /hasAny\(permissions/.test(ctx));
check("OS tem ações rápidas", /Ações rápidas/.test(os));
check("CTA portal honesto", /Abrir no portal/.test(os));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
