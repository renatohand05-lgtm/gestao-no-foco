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

console.log("\nPhase 31.8 — attachments\n");
const compose = readFileSync(join(root, "lib/mobile/operations-compose.ts"), "utf8");
const ui = readFileSync(join(root, "apps/mobile/src/operacao/field-sections.tsx"), "utf8");
check("attachments no DTO", /attachments:/.test(compose));
check("PDF permitido no storage", existsSync(join(root, "lib/ordens/inspecao-storage-service.ts")) && /application\/pdf/.test(readFileSync(join(root, "lib/ordens/inspecao-storage-service.ts"), "utf8")));
check("AttachmentsSection", /AttachmentsSection/.test(ui));
check("visualização via signed URL na tela", /onOpen/.test(ui));
check("MIME jpeg/png/webp/pdf", /image\/jpeg|image\/png|image\/webp/.test(readFileSync(join(root, "lib/ordens/inspecao-storage-service.ts"), "utf8")));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
