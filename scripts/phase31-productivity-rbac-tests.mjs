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

console.log("\nPhase 31.9 — productivity RBAC\n");
const compose = readFileSync(join(root, "lib/mobile/search-compose.ts"), "utf8");
const cmds = readFileSync(join(root, "apps/mobile/src/productivity/commands.ts"), "utf8");
const scanner = readFileSync(join(root, "apps/mobile/app/(app)/scanner.tsx"), "utf8");

check("search filtra tipos sem permissão", /canSeeType/.test(compose));
check("comandos exigem permissions", /listCommandsForPermissions/.test(cmds));
check("scanner gated SCAN_PERMS", /SCAN_PERMS|useHasAnyPermission/.test(scanner));
check("perfil sem cargo", !/jobTitle|cargo/.test(cmds));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
