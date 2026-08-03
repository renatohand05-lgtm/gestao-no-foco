#!/usr/bin/env node
/**
 * Sprint 30.8 — Monitor, config knobs, connection blueprints.
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { CONNECTION_BLUEPRINTS } from "../lib/integracoes/connection-manager.ts";
import {
  CONFIG_KNOBS,
  buildMonitorMetrics,
} from "../lib/integracoes/observability.ts";

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

console.log("\nPhase 30.8 — monitor / config / connections\n");

check(
  "arquivo observability.ts",
  existsSync(join(root, "lib/integracoes/observability.ts")),
);
check(
  "arquivo connection-manager.ts",
  existsSync(join(root, "lib/integracoes/connection-manager.ts")),
);

const metrics = buildMonitorMetrics();
check("buildMonitorMetrics >= 7", metrics.length >= 7);
check(
  "metric health",
  metrics.some((m) => m.id === "health"),
);
check(
  "metric webhook",
  metrics.some((m) => m.id === "webhook"),
);
check(
  "metric api",
  metrics.some((m) => m.id === "api"),
);

const circuit = CONFIG_KNOBS.find((k) => k.id === "circuit");
check("CONFIG_KNOBS circuit existe", Boolean(circuit));
check(
  "CONFIG_KNOBS circuit open_for_external",
  circuit?.value === "open_for_external",
);
check(
  "CONFIG_KNOBS flags EXTERNAL_OFF",
  CONFIG_KNOBS.some((k) => k.id === "flags" && k.value.includes("EXTERNAL_OFF")),
);

check(
  "CONNECTION_BLUEPRINTS storesSecrets false",
  CONNECTION_BLUEPRINTS.every((c) => c.storesSecrets === false),
);
check("CONNECTION_BLUEPRINTS >= 5", CONNECTION_BLUEPRINTS.length >= 5);
check(
  "blueprints oauth/api_key/webhook_secret",
  ["oauth", "api_key", "webhook_secret"].every((method) =>
    CONNECTION_BLUEPRINTS.some((c) => c.method === method),
  ),
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
