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

console.log("\nPhase 31.10 — RC permissions\n");
const cfg = readFileSync(join(root, "apps/mobile/app.config.ts"), "utf8");

check("CAMERA declarada", /android\.permission\.CAMERA/.test(cfg));
check("biometria USE_BIOMETRIC", /USE_BIOMETRIC/.test(cfg));
check("INTERNET", /android\.permission\.INTERNET/.test(cfg));
check("bloqueia RECORD_AUDIO", /blockedPermissions[\s\S]*RECORD_AUDIO/.test(cfg));
check("bloqueia WRITE_EXTERNAL_STORAGE", /WRITE_EXTERNAL_STORAGE/.test(cfg));
check("NSCameraUsageDescription", /NSCameraUsageDescription/.test(cfg));
check("NSPhotoLibraryUsageDescription", /NSPhotoLibraryUsageDescription/.test(cfg));
check("NSFaceIDUsageDescription", /NSFaceIDUsageDescription/.test(cfg));
check("sem plugin expo-notifications", !/"expo-notifications"/.test(cfg));
check("image-picker + camera plugins", /expo-image-picker/.test(cfg) && /expo-camera/.test(cfg));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
