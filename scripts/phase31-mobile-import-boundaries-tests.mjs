#!/usr/bin/env node
/**
 * Phase 31.0 — Mobile import boundaries (no Next/server in mobile; pure packages).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
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

const FORBIDDEN_MOBILE = [
  { name: "next/", re: /from\s+["']next\// },
  { name: "server-only", re: /["']server-only["']/ },
  { name: "react-dom", re: /from\s+["']react-dom/ },
  { name: "@/lib/supabase/server", re: /["']@\/lib\/supabase\/server["']/ },
  { name: "createServerClient", re: /createServerClient/ },
];

const FORBIDDEN_PACKAGES = [
  { name: "react-native", re: /from\s+["']react-native/ },
  { name: "expo", re: /from\s+["']expo/ },
];

function collectFiles(dir, acc = []) {
  if (!statSync(dir).isDirectory()) return acc;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) collectFiles(full, acc);
    else if (/\.(ts|tsx|mjs|js)$/.test(name)) acc.push(full);
  }
  return acc;
}

function scanDir(dir, patterns) {
  const hits = [];
  for (const file of collectFiles(dir)) {
    const rel = file.replace(root + "\\", "").replace(root + "/", "");
    const src = readFileSync(file, "utf8");
    for (const pat of patterns) {
      if (pat.re.test(src)) hits.push(`${rel} (${pat.name})`);
    }
  }
  return hits;
}

console.log("\nPhase 31.0 — mobile import boundaries\n");

const mobileHits = scanDir(join(root, "apps/mobile/src"), FORBIDDEN_MOBILE);
check("apps/mobile/src sem imports proibidos", mobileHits.length === 0);
if (mobileHits.length > 0) {
  for (const h of mobileHits.slice(0, 8)) console.log("    →", h);
}

const packageDirs = readdirSync(join(root, "packages")).map((name) =>
  join(root, "packages", name, "src"),
);
let packageHits = [];
for (const dir of packageDirs) {
  packageHits = packageHits.concat(scanDir(dir, FORBIDDEN_PACKAGES));
}
check("packages sem react-native/expo", packageHits.length === 0);
if (packageHits.length > 0) {
  for (const h of packageHits.slice(0, 8)) console.log("    →", h);
}

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
