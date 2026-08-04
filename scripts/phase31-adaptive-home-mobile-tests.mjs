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

console.log("\nPhase 31.9 — adaptive home\n");
const cmds = readFileSync(join(root, "apps/mobile/src/productivity/commands.ts"), "utf8");
const strip = readFileSync(
  join(root, "apps/mobile/src/productivity/productivity-strip.tsx"),
  "utf8",
);
const home = readFileSync(join(root, "apps/mobile/app/(app)/index.tsx"), "utf8");

check("perfis GESTOR/MECANICO/…", /GESTOR/.test(cmds) && /MECANICO/.test(cmds) && /FINANCEIRO/.test(cmds));
check("perfil por permissions", /resolveAdaptiveProfile/.test(cmds) && /hasAny\(permissions/.test(cmds));
check("strip favoritos+recentes", /loadFavorites/.test(strip) && /loadRecents/.test(strip));
check("strip atalhos", /shortcutsForProfile/.test(strip));
check("home inclui strip", /ProductivityStrip/.test(home));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
