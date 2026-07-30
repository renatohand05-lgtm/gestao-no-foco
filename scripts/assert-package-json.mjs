#!/usr/bin/env node
/** Fail-fast: package.json inválido/truncado quebra @import do Tailwind 4. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pkgPath = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
try {
  const raw = readFileSync(pkgPath, "utf8");
  if (!raw.trim()) throw new Error("package.json está vazio");
  const pkg = JSON.parse(raw);
  if (!pkg?.name) throw new Error("package.json sem name");
  console.log(`[assert-package-json] OK (${raw.length} bytes)`);
} catch (e) {
  console.error(
    `[assert-package-json] FALHA: ${e instanceof Error ? e.message : e}`,
  );
  console.error(
    "Tailwind 4 / PostCSS lê este arquivo ao processar app/globals.css.",
  );
  console.error(
    "Corrija package.json e não o edite enquanto `next dev` estiver rodando.",
  );
  process.exit(1);
}
