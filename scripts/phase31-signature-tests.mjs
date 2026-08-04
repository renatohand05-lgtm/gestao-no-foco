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

console.log("\nPhase 31.8 — signature\n");
const compose = readFileSync(join(root, "lib/mobile/field-compose.ts"), "utf8");
const route = join(root, "app/api/mobile/v1/tenants/[tenantId]/operacao/work-orders/[id]/assinatura/route.ts");
const screen = join(root, "apps/mobile/app/(app)/operacao/ordens/[id]/assinatura.tsx");
check("uploadFieldSignature", /uploadFieldSignature/.test(compose));
check("etapa entrega + legenda Assinatura", /entrega/.test(compose) && /Assinatura do cliente/.test(compose));
check("rota assinatura", existsSync(route));
check("screen assinatura", existsSync(screen));
const ui = readFileSync(screen, "utf8");
check("preview + confirmar", /preview|Pré-visualizar|Confirmar/.test(ui));
check("sem certificado jurídico inventado", /não certificado|nao certificado|não certificado jurídico/i.test(compose + ui));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
