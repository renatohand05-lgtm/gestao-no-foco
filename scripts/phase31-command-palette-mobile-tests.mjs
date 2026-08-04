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

console.log("\nPhase 31.9 — command palette\n");
const cmds = readFileSync(join(root, "apps/mobile/src/productivity/commands.ts"), "utf8");
const ui = readFileSync(join(root, "apps/mobile/app/(app)/comandos.tsx"), "utf8");

check("listCommandsForPermissions", /listCommandsForPermissions/.test(cmds));
check("filtra por permissions", /cmd\.permissions\.length > 0/.test(cmds));
check("resolveAdaptiveProfile", /resolveAdaptiveProfile/.test(cmds));
check("shortcutsForProfile", /shortcutsForProfile/.test(cmds));
check("UI filtrável", /filter/.test(ui) && /Input/.test(ui));
check("ações logout/tema/tenant", /switch-tenant/.test(ui) && /toggle-theme/.test(ui) && /logout/.test(ui));
check("accessibilityLabel", /accessibilityLabel/.test(ui));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
