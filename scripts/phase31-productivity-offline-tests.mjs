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

console.log("\nPhase 31.9 — productivity offline\n");
const busca = readFileSync(join(root, "apps/mobile/app/(app)/busca.tsx"), "utf8");
const scanner = readFileSync(join(root, "apps/mobile/app/(app)/scanner.tsx"), "utf8");
const strip = readFileSync(
  join(root, "apps/mobile/src/productivity/productivity-strip.tsx"),
  "utf8",
);

check("busca remota só online", /enabled[\s\S]*online/.test(busca) || /online && debouncedQ/.test(busca));
check("mostra cache offline", /Offline|loadSearchCache/.test(busca));
check("scanner bloqueia resolução remota offline", /offline|Offline/.test(scanner));
check("favoritos/recentes locais na home", /loadFavorites/.test(strip) && /loadRecents/.test(strip));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
