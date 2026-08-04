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

console.log("\nPhase 31.8 — gallery\n");
const field = readFileSync(join(root, "lib/mobile/field-compose.ts"), "utf8");
const ui = readFileSync(join(root, "apps/mobile/src/operacao/field-sections.tsx"), "utf8");
check("mapEtapaToGalleryGroup", /mapEtapaToGalleryGroup/.test(field));
check("grupos antes/durante/depois/documentos", /antes/.test(field) && /durante/.test(field) && /depois/.test(field) && /documentos/.test(field));
check("GallerySection UI", /GallerySection/.test(ui));
check("visualizar/excluir/legenda/data", /onOpen/.test(ui) && /onDelete/.test(ui) && /legenda|label/.test(ui));
check("signed URL temporária", /createSignedUrl|signedUrl/.test(field));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
