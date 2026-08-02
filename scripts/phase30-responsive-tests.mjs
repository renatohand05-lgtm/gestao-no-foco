#!/usr/bin/env node
/**
 * Sprint 30.1 — contratos de responsividade do shell.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

const demo = readFileSync(
  resolve("components/demo/demo-mode-controls.tsx"),
  "utf8",
);
const shell = readFileSync(resolve("components/layout/app-shell.tsx"), "utf8");

check("grid 2 cols mobile / 4 sm+", /grid-cols-2[\s\S]*sm:grid-cols-4/.test(demo));
check("min-h reduzido no mobile (10)", /min-h-10/.test(demo));
check("shell overflow-x-hidden", /overflow-x-hidden/.test(shell));
check("chrome colapsado por padrão no shell", /defaultCollapsed/.test(shell));
check(
  "DemoNavRail só quando active (menos chrome)",
  /active \? <DemoNavRail/.test(shell),
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
