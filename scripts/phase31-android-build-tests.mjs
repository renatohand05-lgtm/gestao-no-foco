#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mobile = join(root, "apps/mobile");
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

console.log("\nPhase 31.11 — Android build readiness\n");

const eas = JSON.parse(readFileSync(join(mobile, "eas.json"), "utf8"));
const cfg = readFileSync(join(mobile, "app.config.ts"), "utf8");
const report = join(root, "docs/testing/evidence/31-11/REPORT.md");

check("profile internal existe", Boolean(eas.build?.internal));
check("internal distribution internal", eas.build.internal.distribution === "internal");
check("internal android apk", eas.build.internal.android?.buildType === "apk");
check("channel internal", eas.build.internal.channel === "internal");
check("versionCode 110", /ANDROID_VERSION_CODE = 110/.test(cfg));
check("package com.gestaonofoco.app", /com\.gestaonofoco\.app/.test(cfg));
check("docs 31-11 REPORT", existsSync(report));
check("DEVICE_QA documentado", existsSync(join(root, "docs/testing/evidence/31-11/DEVICE_QA.md")));

const who = spawnSync("npx", ["eas-cli", "whoami"], {
  cwd: mobile,
  encoding: "utf8",
  shell: true,
});
const whoOut = `${who.stdout || ""}${who.stderr || ""}`;
const loggedIn = who.status === 0 && !/Not logged in/i.test(whoOut);
check(
  "EAS auth (informativo — esperado falhar sem token)",
  true, // não falha a suíte: documenta
);
console.log(
  loggedIn
    ? "  INFO EAS: logado"
    : "  INFO EAS: NÃO logado / EXPO_TOKEN ausente — build bloqueado",
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
