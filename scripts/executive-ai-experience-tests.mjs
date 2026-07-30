#!/usr/bin/env node
/** Sprint 25.7 — Executive AI experience */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) {
    pass++;
    console.log(`  PASS  ${msg}`);
  } else {
    fail++;
    console.log(`  FAIL  ${msg}`);
  }
}

console.log("\nExecutive AI Experience — Sprint 25.7\n");
assert(
  existsSync(join(root, "components/ai/executive-copilot/executive-copilot-panel.tsx")),
  "copilot panel",
);
const panel = readFileSync(
  join(root, "components/ai/executive-copilot/executive-copilot-panel.tsx"),
  "utf8",
);
assert(panel.includes("data-premium-v257"), "marker 25.7");
assert(panel.includes("sem IA generativa") || panel.includes("evidências"), "disclaimer");
assert(panel.includes("ExecutiveCopilotSuggestions"), "sugestões");
assert(panel.includes("ExecutiveCopilotInput"), "input");
assert(panel.includes("history"), "histórico sessão");
assert(!/openai|anthropic|fetch\(.*ai/i.test(panel), "sem provider externo no panel");

const sugg = readFileSync(
  join(root, "components/ai/executive-copilot/executive-copilot-suggestions.tsx"),
  "utf8",
);
assert(sugg.includes("suggestions") || sugg.includes("EXECUTIVE_COPILOT"), "lista sugestões");

const eic = readFileSync(
  join(root, "components/dashboard/executive/executive-intelligence-center.tsx"),
  "utf8",
);
assert(eic.includes("executive-briefing"), "briefing executivo");
assert(eic.includes("Análise baseada em regras"), "disclaimer regras");
assert(eic.includes("data-premium-v257"), "EIC marker");

const view = readFileSync(
  join(root, "components/dashboard/premium/premium-dashboard-view.tsx"),
  "utf8",
);
assert(view.includes('data-premium-block="ask-ai"'), "ask-ai no dashboard");
assert(view.includes("Análise baseada em regras"), "disclaimer disclosure");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
