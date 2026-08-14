#!/usr/bin/env node
/**
 * Sprint 30.8 — Integration Hub: marketplace, compose, UI wiring.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  MARKETPLACE_CATALOG,
  assertNoActiveMarketplace,
} from "../lib/integracoes/marketplace-catalog.ts";
import { composeIntegrationHubSnapshot } from "../lib/integracoes/compose-hub.ts";

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

console.log("\nPhase 30.8 — integrations (marketplace / compose / UI)\n");

const coreFiles = [
  "lib/integracoes/types.ts",
  "lib/integracoes/marketplace-catalog.ts",
  "lib/integracoes/api-center.ts",
  "lib/integracoes/connection-manager.ts",
  "lib/integracoes/webhook-center.ts",
  "lib/integracoes/event-bus.ts",
  "lib/integracoes/scheduler.ts",
  "lib/integracoes/observability.ts",
  "lib/integracoes/compose-hub.ts",
  "lib/integracoes/guards.ts",
  "lib/integracoes/index.ts",
  "components/integracoes/integration-hub-view.tsx",
  "app/(app)/[tenant]/integracoes/page.tsx",
];

for (const f of coreFiles) {
  check(`arquivo ${f}`, existsSync(join(root, f)));
}

check("MARKETPLACE_CATALOG >= 40", MARKETPLACE_CATALOG.length >= 40);
check(
  `MARKETPLACE_CATALOG size=${MARKETPLACE_CATALOG.length}`,
  MARKETPLACE_CATALOG.length === 48,
);
check(
  "marketplace status catalog",
  MARKETPLACE_CATALOG.every((e) => e.status === "catalog"),
);
check("assertNoActiveMarketplace", assertNoActiveMarketplace());

const snapshot = composeIntegrationHubSnapshot("tenant-a");
check("compose tenantId", snapshot.tenantId === "tenant-a");
check("compose liveExternalCalls false", snapshot.liveExternalCalls === false);
check("compose credentialsStored false", snapshot.credentialsStored === false);
check("compose activeWebhooks false", snapshot.activeWebhooks === false);
check(
  "compose marketplace length",
  snapshot.marketplace.length === MARKETPLACE_CATALOG.length,
);
check(
  "compose dashboard integracoesAtivas 0",
  snapshot.dashboard.integracoesAtivas === 0,
);
check(
  "compose dashboard statusGeral arquitetura_pronta",
  snapshot.dashboard.statusGeral === "arquitetura_pronta",
);

const pageSrc = readFileSync(
  join(root, "app/(app)/[tenant]/integracoes/page.tsx"),
  "utf8",
);
check(
  "page piloto honesto (sem hub mock ativo)",
  /ComingSoonPanel|data-integration-hub="pilot"/.test(pageSrc),
);
check(
  "page aponta importação real",
  /integracoes\/importar|integrationsImportPath|Ir para importação/.test(pageSrc),
);
check(
  "IntegrationHubView permanece no código (não deletado)",
  existsSync(join(root, "components/integracoes/integration-hub-view.tsx")),
);

const hubSrc = readFileSync(
  join(root, "components/integracoes/integration-hub-view.tsx"),
  "utf8",
);
check("hub data-integration-hub", /data-integration-hub/.test(hubSrc));
check(
  "hub data-sprint 30.8 ou 30.8.1",
  /data-sprint="30\.8(\.1)?"/.test(hubSrc),
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
