#!/usr/bin/env node
/**
 * Sprint 31.0.1 — monorepo structure gates.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
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

console.log("\nPhase 31.0.1 — monorepo\n");

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
check("workspaces apps/*", Array.isArray(pkg.workspaces) && pkg.workspaces.includes("apps/*"));
check("workspaces packages/*", Array.isArray(pkg.workspaces) && pkg.workspaces.includes("packages/*"));
check("overrides.react", pkg.overrides?.react === "19.2.3");
check("overrides.react-dom", pkg.overrides?.["react-dom"] === "19.2.3");
check("turbo.json", existsSync(join(root, "turbo.json")));
check("tsconfig.base.json", existsSync(join(root, "tsconfig.base.json")));
check(".prettierrc.json", existsSync(join(root, ".prettierrc.json")));
check("metro.config.js", existsSync(join(root, "apps/mobile/metro.config.js")));
check("docs PHASE_31_0_1", existsSync(join(root, "docs/architecture/PHASE_31_0_1_MONOREPO_HARDENING.md")));
check("mobile package @gof/mobile", JSON.parse(readFileSync(join(root, "apps/mobile/package.json"), "utf8")).name === "@gof/mobile");

const metro = readFileSync(join(root, "apps/mobile/metro.config.js"), "utf8");
check("metro watchFolders", /watchFolders/.test(metro));
check("metro sem disableHierarchicalLookup", !/disableHierarchicalLookup\s*[:=]\s*true/.test(metro));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
