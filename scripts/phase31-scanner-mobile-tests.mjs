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

console.log("\nPhase 31.9 — scanner mobile\n");
const scanner = readFileSync(join(root, "apps/mobile/src/productivity/scanner.ts"), "utf8");
const ui = readFileSync(join(root, "apps/mobile/app/(app)/scanner.tsx"), "utf8");
const cfg = readFileSync(join(root, "apps/mobile/app.config.ts"), "utf8");

check("interpretScanPayload", /interpretScanPayload/.test(scanner));
check("bloqueia URL externa", /URL externa bloqueada/.test(scanner));
check("CameraView + barcode", /CameraView/.test(ui) && /onBarcodeScanned/.test(ui));
check("confirma antes de abrir", /Alert\.alert/.test(ui) && /Confirmar|Abrir item/.test(ui));
check("permissão contextual", /useCameraPermissions|requestPermission/.test(ui));
check("entrada manual", /manual/.test(ui));
check("pausa câmera", /active=\{active\}/.test(ui) || /setActive\(false\)/.test(ui));
check("plugin expo-camera", /expo-camera/.test(cfg));
check("NSCameraUsageDescription", /NSCameraUsageDescription/.test(cfg));
check("sem log do código", !/console\.log\(.*data/.test(ui));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
