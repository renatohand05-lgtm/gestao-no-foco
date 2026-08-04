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

console.log("\nPhase 31.8 — field offline\n");
const offline = join(root, "apps/mobile/src/operacao/field-offline.ts");
check("field-offline existe", existsSync(offline));
const src = readFileSync(offline, "utf8");
check("snapshot detail key", /@gof\/cache\/ops-workorder\//.test(src));
check("pending upload queue", /ops-upload-pending|enqueuePendingUpload/.test(src));
check("sem tokens", !/access_token|refresh_token|service_role/.test(src));
check("thumbs null no snapshot", /thumbUrl: null/.test(src));
check("somente leitura no snapshot", /Snapshot RO|sem blobs/i.test(src));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
