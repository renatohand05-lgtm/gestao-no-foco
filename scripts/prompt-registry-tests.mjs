#!/usr/bin/env node
/** Prompt Registry — 27.2 */
import {
  getPromptByIntent,
  listActivePrompts,
  renderPromptUserTemplate,
} from "../lib/intelligence/enterprise/prompt/registry.ts";

let pass = 0, fail = 0;
const assert = (c, m) => { if (c) { pass++; console.log("  PASS ", m); } else { fail++; console.log("  FAIL ", m); } };

console.log("\nPrompt Registry — 27.2\n");
const list = listActivePrompts();
assert(list.length >= 10, "prompts mínimos");
const dre = getPromptByIntent("explain_dre");
assert(dre?.active === true, "explain_dre");
assert(dre.systemInstruction.includes("Não invente"), "anti-hallucination");
const rendered = renderPromptUserTemplate(dre, { period: "2026-07" });
assert(rendered.includes("2026-07"), "template render");
console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
