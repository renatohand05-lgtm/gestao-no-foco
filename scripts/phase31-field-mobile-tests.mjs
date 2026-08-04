#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
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

console.log("\nPhase 31.8 — field mobile\n");
const compose = join(root, "lib/mobile/field-compose.ts");
const detail = join(root, "apps/mobile/app/(app)/operacao/ordens/[id]/index.tsx");
check("field-compose existe", existsSync(compose));
check("OS detail expandida existe", existsSync(detail));
const src = readFileSync(compose, "utf8");
check("reusa InspecaoStorageService", /InspecaoStorageService/.test(src));
check("reusa OrdemServicoService", /OrdemServicoService/.test(src));
check("reusa osAnexoUploadMetaSchema", /osAnexoUploadMetaSchema/.test(src));
check("reusa osChecklistUpdateSchema", /osChecklistUpdateSchema/.test(src));
check("sem service_role no client", !/SERVICE_ROLE/.test(src));
const ui = readFileSync(detail, "utf8");
check("UI checklist/galeria/assinatura", /ChecklistSection/.test(ui) && /GallerySection/.test(ui) && /SignatureSection/.test(ui));
check("offline snapshot", /saveWorkOrderSnapshot|loadWorkOrderSnapshot/.test(ui));
check("ImagePicker", /expo-image-picker|ImagePicker/.test(ui));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
