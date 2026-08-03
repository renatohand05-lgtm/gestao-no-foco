#!/usr/bin/env node
/**
 * Sprint 30.8.1 — Integration Hub no external I/O guarantees.
 */
import { auditIntegrationSecurity } from "../lib/integracoes/security.ts";
import { composeIntegrationHubSnapshot } from "../lib/integracoes/compose-hub.ts";
import { EVENT_BUS_CAPABILITIES } from "../lib/integracoes/event-bus.ts";
import { SCHEDULER_CAPABILITIES } from "../lib/integracoes/scheduler.ts";
import { WEBHOOK_MOCKS } from "../lib/integracoes/webhook-center.ts";
import { CONFIG_KNOBS } from "../lib/integracoes/observability.ts";

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

console.log("\nPhase 30.8.1 — integrations no external I/O\n");

const report = auditIntegrationSecurity("no-io-tenant");
check("auditIntegrationSecurity ok", report.ok === true);
check(
  "EVENT_BUS_CAPABILITIES.externalDispatch false",
  EVENT_BUS_CAPABILITIES.externalDispatch === false,
);
check(
  "SCHEDULER_CAPABILITIES.executesExternally false",
  SCHEDULER_CAPABILITIES.executesExternally === false,
);

const webhookJson = JSON.stringify(WEBHOOK_MOCKS);
check(
  "WEBHOOK_MOCKS sem http(s)://",
  !/https?:\/\//.test(webhookJson),
);

const circuit = CONFIG_KNOBS.find((k) => k.id === "circuit");
const flags = CONFIG_KNOBS.find((k) => k.id === "flags");
check("CONFIG_KNOBS circuit open_for_external", circuit?.value === "open_for_external");
check("CONFIG_KNOBS flags EXTERNAL_OFF", flags?.value === "EXTERNAL_OFF");

const snap = composeIntegrationHubSnapshot("guarantee-tenant");
check("snapshot liveExternalCalls false", snap.liveExternalCalls === false);
check("snapshot credentialsStored false", snap.credentialsStored === false);
check("snapshot activeWebhooks false", snap.activeWebhooks === false);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
