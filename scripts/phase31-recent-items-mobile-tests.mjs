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

console.log("\nPhase 31.9 — recent items\n");
const storage = readFileSync(join(root, "apps/mobile/src/productivity/storage.ts"), "utf8");
const session = readFileSync(join(root, "apps/mobile/src/auth/session-store.ts"), "utf8");
check("pushRecent", /pushRecent/.test(storage));
check("MAX_RECENT", /MAX_RECENT/.test(storage));
check("scope isolado", /@gof\/prod\//.test(storage) && /kind: "recent"/.test(storage) || /"recent"/.test(storage));
check("clearRecents", /clearRecents/.test(storage));
check("logout limpa produtividade", /clearProductivityCaches/.test(session));
check("title truncado", /slice\(0, 80\)/.test(storage));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
