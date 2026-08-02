#!/usr/bin/env node
/**
 * Sprint 30.1 — linguagem executiva Analytics.
 */
import {
  friendlyAnalyticsConfidence,
  friendlyAnalyticsMessage,
  friendlyAnalyticsSource,
  friendlyAnalyticsStatus,
} from "../lib/analytics/friendly-labels.ts";
// node --experimental-strip-types
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

check(
  "cash-intelligence → Financeiro — Caixa",
  friendlyAnalyticsSource("lib/finance/cash-intelligence") ===
    "Financeiro — Caixa",
);
check(
  "source empty → mensagem amigável",
  friendlyAnalyticsMessage("source empty") ===
    "Sem dados disponíveis para o período",
);
check(
  "confidence medium → moderada",
  friendlyAnalyticsConfidence("medium") === "Confiança moderada",
);
check(
  "status empty amigável",
  friendlyAnalyticsStatus("empty") === "Sem dados no período",
);

const dash = readFileSync(
  resolve("components/analytics/executive-analytics-dashboard.tsx"),
  "utf8",
);
check("dashboard importa friendly-labels", /friendlyAnalyticsSource/.test(dash));
check(
  "dashboard não exibe key crua no badge face",
  !/\{key\}:\s*\{h\.status\}/.test(dash),
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
