#!/usr/bin/env node
/**
 * Testes de regras de venda no faturamento (reutiliza o suite do dashboard).
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const result = spawnSync(
  process.execPath,
  [
    "--experimental-strip-types",
    path.join(dir, "dashboard-faturamento-tests.mjs"),
  ],
  { stdio: "inherit", shell: false },
);
process.exit(result.status ?? 1);
