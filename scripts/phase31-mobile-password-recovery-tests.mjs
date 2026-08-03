#!/usr/bin/env node
/**
 * Phase 31.1 — Mobile password recovery (neutral messaging, no enumeration).
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

console.log("\nPhase 31.1 — mobile password recovery\n");

check("recover.tsx exists", existsSync(join(mobileRoot, "app/(auth)/recover.tsx")));
check("reset.tsx exists", existsSync(join(mobileRoot, "app/(auth)/reset.tsx")));

const recoverSrc = readFileSync(join(mobileRoot, "app/(auth)/recover.tsx"), "utf8");
check(
  "recover uses resetPasswordForEmail",
  /resetPasswordForEmail/.test(recoverSrc),
);
check(
  "recover uses gof://auth/reset redirect",
  /gof:\/\/auth\/reset/.test(recoverSrc),
);

const enumerationPatterns = [
  /email não cadastrado/i,
  /não cadastrado/i,
  /not registered/i,
  /user not found/i,
  /usuário não encontrado/i,
];
for (const pattern of enumerationPatterns) {
  check(
    `recover neutral messaging (no ${pattern.source})`,
    !pattern.test(recoverSrc),
  );
}
check(
  "recover shows neutral success message",
  /Verifique sua caixa de entrada|E-mail enviado/.test(recoverSrc),
);

const resetSrc = readFileSync(join(mobileRoot, "app/(auth)/reset.tsx"), "utf8");
check("reset uses updateUser password", /updateUser[\s\S]*password/.test(resetSrc));

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
