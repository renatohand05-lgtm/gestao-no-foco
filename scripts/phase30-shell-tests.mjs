#!/usr/bin/env node
/**
 * Sprint 30.1 — contratos shell / demo chrome colapsável.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
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

const shell = readFileSync(resolve(root, "components/layout/app-shell.tsx"), "utf8");
const demo = readFileSync(
  resolve(root, "components/demo/demo-mode-controls.tsx"),
  "utf8",
);

check("shell usa defaultCollapsed", /defaultCollapsed/.test(shell));
check("shell não renderiza DemoNavRail sempre", /active \? <DemoNavRail/.test(shell));
check("DemoModeControls colapsável (aria-expanded)", /aria-expanded/.test(demo));
check("DemoModeControls data-demo-chrome", /data-demo-chrome/.test(demo));
check("DemoModeControls sessionStorage collapse key", /gnf_demo_chrome_expanded/.test(demo));
check("shell mantém DemoModeControls", /DemoModeControls/.test(shell));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
