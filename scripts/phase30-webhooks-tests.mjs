#!/usr/bin/env node
/**
 * Sprint 30.8 — Webhook Center mock (inbound/outbound/dlq, sem entrega real).
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { WEBHOOK_MOCKS } from "../lib/integracoes/webhook-center.ts";

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

console.log("\nPhase 30.8 — webhooks\n");

check(
  "arquivo webhook-center.ts",
  existsSync(join(root, "lib/integracoes/webhook-center.ts")),
);
check("WEBHOOK_MOCKS >= 3", WEBHOOK_MOCKS.length >= 3);

check(
  "inbound presente",
  WEBHOOK_MOCKS.some((w) => w.direction === "inbound"),
);
check(
  "outbound presente",
  WEBHOOK_MOCKS.some((w) => w.direction === "outbound"),
);
check(
  "dlq presente",
  WEBHOOK_MOCKS.some(
    (w) => w.status === "dlq_mock" || w.status.includes("dlq"),
  ),
);

const serialized = JSON.stringify(WEBHOOK_MOCKS);
check("sem https://", !serialized.includes("https://"));
check("sem http://", !serialized.includes("http://"));
check(
  "payloadPreview mock",
  WEBHOOK_MOCKS.every((w) => w.payloadPreview.includes("mock")),
);
check(
  "status mock suffix",
  WEBHOOK_MOCKS.every(
    (w) =>
      w.status.endsWith("_mock") ||
      w.status === "queued" ||
      w.status.includes("dlq"),
  ),
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
