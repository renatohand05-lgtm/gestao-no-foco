#!/usr/bin/env node
/**
 * Phase 31.1 — Mobile deep links (scheme gof, auth paths, no open redirect).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mobileRoot = join(root, "apps/mobile");
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

console.log("\nPhase 31.1 — mobile deep links\n");

const appConfigSrc = readFileSync(join(mobileRoot, "app.config.ts"), "utf8");
check("app.config scheme gof", /scheme:\s*"gof"/.test(appConfigSrc));

const layoutSrc = readFileSync(join(mobileRoot, "app/_layout.tsx"), "utf8");
check("_layout uses Linking", /Linking/.test(layoutSrc));
check("_layout handles auth/reset", /auth\/reset/.test(layoutSrc));
check(
  "_layout handles auth/callback or deep link handler",
  /auth\/callback|handleAuthDeepLink/.test(layoutSrc),
);

const deepLinkDoc = join(root, "docs/architecture/MOBILE_DEEP_LINKS.md");
check("MOBILE_DEEP_LINKS.md doc exists", existsSync(deepLinkDoc));
if (existsSync(deepLinkDoc)) {
  const docSrc = readFileSync(deepLinkDoc, "utf8");
  check("doc mentions gof://", /gof:\/\//.test(docSrc));
}

const mobileSources = [
  layoutSrc,
  readFileSync(join(mobileRoot, "app/(auth)/reset.tsx"), "utf8"),
  readFileSync(join(mobileRoot, "app/(auth)/recover.tsx"), "utf8"),
].join("\n");

check(
  "no Linking.openURL with arbitrary http",
  !/Linking\.openURL\s*\(\s*[`'"]https?:\/\//.test(mobileSources),
);
check(
  "no open redirect via window.location",
  !/window\.location/.test(mobileSources),
);
check(
  "deep link handler routes to internal reset screen",
  /router\.(push|replace)\s*\(\s*["']\/\(auth\)\/reset["']\)/.test(layoutSrc),
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
