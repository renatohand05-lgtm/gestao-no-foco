#!/usr/bin/env node
/**
 * Sprint 31.0.1 — workspaces / single React tree.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

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

console.log("\nPhase 31.0.1 — workspaces\n");

check("sem apps/mobile/node_modules/react", !existsSync(join(root, "apps/mobile/node_modules/react")));
check("root react existe", existsSync(join(root, "node_modules/react/package.json")));

const reactVersion = JSON.parse(
  readFileSync(join(root, "node_modules/react/package.json"), "utf8"),
).version;
check(`root react === 19.2.3 (got ${reactVersion})`, reactVersion === "19.2.3");

const reactDomVersion = JSON.parse(
  readFileSync(join(root, "node_modules/react-dom/package.json"), "utf8"),
).version;
check(`root react-dom === 19.2.3 (got ${reactDomVersion})`, reactDomVersion === "19.2.3");

const ls = spawnSync("npm", ["ls", "react", "-w", "@gof/mobile", "--all"], {
  cwd: root,
  encoding: "utf8",
  shell: true,
});
const out = `${ls.stdout ?? ""}\n${ls.stderr ?? ""}`;
const hasNestedInvalid = /react@19\.2\.4/.test(out);
check("npm ls sem react@19.2.4", !hasNestedInvalid);
check("npm ls contém react@19.2.3", /react@19\.2\.3/.test(out));

const workspaces = spawnSync("npm", ["query", ".workspace"], {
  cwd: root,
  encoding: "utf8",
  shell: true,
});
const wout = workspaces.stdout ?? "";
check("workspace @gof/mobile listado", /@gof\/mobile/.test(wout) || existsSync(join(root, "apps/mobile/package.json")));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
