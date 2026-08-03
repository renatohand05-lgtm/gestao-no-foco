#!/usr/bin/env node
/**
 * Phase 31.0 — Mobile design system (tokens + components).
 */
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

console.log("\nPhase 31.0 — mobile design system\n");

const tokensSrc = readFileSync(
  join(root, "packages/design-tokens/src/index.ts"),
  "utf8",
);
check("gofPalette.gold #C9A84C", /gold:\s*"#C9A84C"/.test(tokensSrc));
check("lightTheme exported", /export const lightTheme/.test(tokensSrc));
check("darkTheme exported", /export const darkTheme/.test(tokensSrc));

const componentsSrc = readFileSync(
  join(root, "apps/mobile/src/design/components/index.tsx"),
  "utf8",
);

const REQUIRED_COMPONENTS = [
  "Screen",
  "Button",
  "Input",
  "Card",
  "Badge",
  "Alert",
  "Text",
  "SafeAreaScreen",
  "ListItem",
  "EmptyState",
  "LoadingState",
];

for (const name of REQUIRED_COMPONENTS) {
  const defined = new RegExp(`export function ${name}\\b`).test(componentsSrc);
  const reexported = new RegExp(`export \\{[^}]*\\b${name}\\b`).test(componentsSrc);
  check(`component ${name}`, defined || reexported);
}

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
