#!/usr/bin/env node
/**
 * Sprint 30.8 — Event Bus + Scheduler capabilities (sem dispatch externo).
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  EVENT_BUS_CAPABILITIES,
  EVENT_BUS_MOCK,
} from "../lib/integracoes/event-bus.ts";
import { SCHEDULER_CAPABILITIES } from "../lib/integracoes/scheduler.ts";

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

console.log("\nPhase 30.8 — eventbus + scheduler\n");

check("arquivo event-bus.ts", existsSync(join(root, "lib/integracoes/event-bus.ts")));
check("arquivo scheduler.ts", existsSync(join(root, "lib/integracoes/scheduler.ts")));

check(
  "EVENT_BUS_CAPABILITIES.externalDispatch false",
  EVENT_BUS_CAPABILITIES.externalDispatch === false,
);
check("EVENT_BUS_MOCK length >= 3", EVENT_BUS_MOCK.length >= 3);
check(`EVENT_BUS_MOCK length=${EVENT_BUS_MOCK.length}`, EVENT_BUS_MOCK.length === 4);

check(
  "EVENT_BUS idempotencyKey em todos",
  EVENT_BUS_MOCK.every((e) => typeof e.idempotencyKey === "string" && e.idempotencyKey.length > 0),
);
check(
  "EVENT_BUS publisher/consumer true",
  EVENT_BUS_CAPABILITIES.publisher === true &&
    EVENT_BUS_CAPABILITIES.consumer === true,
);
check(
  "EVENT_BUS deadLetter/replay true",
  EVENT_BUS_CAPABILITIES.deadLetter === true &&
    EVENT_BUS_CAPABILITIES.replay === true,
);

check(
  "SCHEDULER_CAPABILITIES.executesExternally false",
  SCHEDULER_CAPABILITIES.executesExternally === false,
);
check(
  "SCHEDULER sync/queue/jobs true",
  SCHEDULER_CAPABILITIES.sync === true &&
    SCHEDULER_CAPABILITIES.queue === true &&
    SCHEDULER_CAPABILITIES.jobs === true,
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
