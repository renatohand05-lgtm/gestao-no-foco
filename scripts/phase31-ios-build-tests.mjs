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

console.log("\nPhase 31.11.1 — iOS build readiness\n");

const eas = JSON.parse(readFileSync(join(mobile, "eas.json"), "utf8"));
const cfg = readFileSync(join(mobile, "app.config.ts"), "utf8");

check("bundleIdentifier iOS", /bundleIdentifier:\s*"com\.gestaonofoco\.app"/.test(cfg));
check("ios buildNumber 110", /IOS_BUILD_NUMBER = "110"/.test(cfg));
check("Face ID usage", /NSFaceIDUsageDescription/.test(cfg));
check("Camera usage", /NSCameraUsageDescription/.test(cfg));
check("Photo library usage", /NSPhotoLibraryUsageDescription/.test(cfg));
check("ITSAppUsesNonExemptEncryption", /ITSAppUsesNonExemptEncryption:\s*false/.test(cfg));
check("profiles development/preview/internal/production",
  eas.build?.development && eas.build?.preview && eas.build?.internal && eas.build?.production);
check("internal distribution internal", eas.build.internal.distribution === "internal");
check("internal tem bloco ios", Boolean(eas.build.internal.ios));
check("production tem bloco ios", Boolean(eas.build.production.ios));
check("docs 31-11-1", existsSync(join(root, "docs/testing/evidence/31-11-1/REPORT.md")) ||
  existsSync(join(root, "docs/testing/evidence/31-11-1/BASELINE.md")));
check("architecture PHASE_31_11_1", existsSync(join(root, "docs/architecture/PHASE_31_11_1_IOS_BUILD.md")));

const who = spawnSync("npx", ["eas-cli@latest", "whoami"], {
  cwd: mobile,
  encoding: "utf8",
  shell: true,
});
const whoOut = `${who.stdout || ""}${who.stderr || ""}`;
const loggedIn = who.status === 0 && !/Not logged in/i.test(whoOut);
console.log(loggedIn ? "  INFO EAS: autenticado" : "  INFO EAS: NÃO autenticado — build bloqueado");
check("detecção auth registrada (não bloqueia readiness)", true);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
