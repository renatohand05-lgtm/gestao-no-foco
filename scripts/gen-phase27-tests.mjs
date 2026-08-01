#!/usr/bin/env node
/**
 * Gera suíte de testes Fase 27 (contratos + engines + domínios).
 * Executar: node scripts/gen-phase27-tests.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const scripts = join(root, "scripts");

function write(name, body) {
  writeFileSync(join(scripts, name), body, "utf8");
  console.log("wrote", name);
}

const helper = `
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass=0, fail=0;
function assert(c,m){ if(c){pass++; console.log("  PASS ",m);} else {fail++; console.log("  FAIL ",m);} }
function read(p){ return readFileSync(join(root,p),"utf8"); }
function exists(p){ return existsSync(join(root,p)); }
`;

write(
  "intelligence-contracts-tests.mjs",
  `#!/usr/bin/env node
${helper}
console.log("\\nIntelligence Contracts — 27.0\\n");
const t = read("lib/intelligence/enterprise/types.ts");
for (const k of ["IntelligenceRequest","IntelligenceResponse","EvidenceItem","ConfidenceResult","Recommendation","ActionPlan","SimulationScenario","IntelligenceMode"]) {
  assert(t.includes(k), k);
}
assert(t.includes('"deterministic"'), "mode deterministic");
assert(t.includes('"provider_assisted"'), "mode provider");
assert(t.includes('"unavailable"'), "mode unavailable");
console.log("\\nResultado:", pass, "PASS ·", fail, "FAIL\\n");
process.exit(fail>0?1:0);
`,
);

write(
  "intelligence-provider-gateway-tests.mjs",
  `#!/usr/bin/env node
${helper}
import { resolveIntelligenceProvider, providerGatewayHealth, DETERMINISTIC_PROVIDER } from "../lib/intelligence/enterprise/provider/gateway.ts";
console.log("\\nProvider Gateway — 27.0\\n");
const r = resolveIntelligenceProvider("deterministic");
assert(r.mode === "deterministic", "default deterministic");
assert(r.provider.id === "deterministic", "provider id");
assert(DETERMINISTIC_PROVIDER.isExternal === false, "not external");
const assisted = resolveIntelligenceProvider("provider_assisted");
assert(assisted.mode === "deterministic" || assisted.mode === "unavailable", "assisted não finge live");
assert(assisted.fallbackReason != null || assisted.mode !== "provider_assisted", "fallback explícito");
const health = await providerGatewayHealth();
assert(health.length >= 2, "health det+ext");
assert(health.some(h => h.providerId === "deterministic" && h.ok), "det healthy");
console.log("\\nResultado:", pass, "PASS ·", fail, "FAIL\\n");
process.exit(fail>0?1:0);
`,
);

write(
  "intelligence-feature-flags-tests.mjs",
  `#!/usr/bin/env node
${helper}
import { getIntelligenceFeatureFlags } from "../lib/intelligence/enterprise/feature-flags.ts";
console.log("\\nFeature Flags — 27.0\\n");
const f = getIntelligenceFeatureFlags();
assert(f.deterministic === true, "deterministic default on");
assert(f.externalProvider === false, "external default off");
assert(f.enabled === true, "enabled default on");
assert(typeof f.executiveCopilot === "boolean", "copilot flag");
console.log("\\nResultado:", pass, "PASS ·", fail, "FAIL\\n");
process.exit(fail>0?1:0);
`,
);

write(
  "intelligence-rbac-tests.mjs",
  `#!/usr/bin/env node
${helper}
console.log("\\nIntelligence RBAC — 27.0\\n");
const perms = read("lib/rbac/permissions.ts");
const types = read("lib/rbac/types.ts");
assert(types.includes('"inteligencia"'), "module inteligencia");
for (const k of [
  "inteligencia.visualizar","inteligencia.executivo","inteligencia.perguntar",
  "inteligencia.explicar","inteligencia.simular","inteligencia.recomendar",
  "inteligencia.criar_plano","inteligencia.aprovar_plano","inteligencia.executar_acao",
  "inteligencia.configurar_provider","inteligencia.ver_auditoria","inteligencia.ver_custos",
  "inteligencia.feedback",
]) assert(perms.includes(k), k);
const roles = read("lib/rbac/role-permissions.ts");
assert(roles.includes("inteligencia.visualizar"), "roles wired");
console.log("\\nResultado:", pass, "PASS ·", fail, "FAIL\\n");
process.exit(fail>0?1:0);
`,
);

write(
  "intelligence-privacy-tests.mjs",
  `#!/usr/bin/env node
${helper}
import { redactSensitiveText, stripSecretsFromObject, assertNoCrossTenantPayload } from "../lib/intelligence/enterprise/privacy/redact.ts";
console.log("\\nPrivacy — 27.0\\n");
const r = redactSensitiveText("email test@example.com cpf 123.456.789-09 sk-abcdefghijklmnop");
assert(r.text.includes("[REDACTED_EMAIL]"), "email");
assert(r.text.includes("[REDACTED_CPF]"), "cpf");
assert(r.text.includes("[REDACTED_SECRET]"), "secret");
const o = stripSecretsFromObject({ password: "x", ok: "y" });
assert(o.password === "[REDACTED]", "strip password");
let threw = false;
try { assertNoCrossTenantPayload("a","b"); } catch { threw = true; }
assert(threw, "tenant isolation throw");
console.log("\\nResultado:", pass, "PASS ·", fail, "FAIL\\n");
process.exit(fail>0?1:0);
`,
);

write(
  "intelligence-audit-tests.mjs",
  `#!/usr/bin/env node
${helper}
import { recordIntelligenceAudit, listIntelligenceAudit, clearIntelligenceAuditForTests } from "../lib/intelligence/enterprise/audit/recorder.ts";
console.log("\\nAudit — 27.0\\n");
clearIntelligenceAuditForTests();
const e = recordIntelligenceAudit({
  correlationId: "abc", userId: "u1", tenantId: "t1", module: "inteligencia",
  intent: "daily_brief", mode: "deterministic", providerId: "deterministic",
  confidenceLevel: "media", limitations: [], sources: ["cash"], answer: "secret sk-abcdefghijklmnop",
  recommendationCount: 0, latencyMs: 10, status: "ok",
});
assert(e.auditId.length > 0, "audit id");
assert(!e.answerPreview.includes("sk-"), "sem secret no preview");
assert(listIntelligenceAudit({ tenantId: "t1" }).length === 1, "list tenant");
assert(listIntelligenceAudit({ tenantId: "other" }).length === 0, "isolation");
console.log("\\nResultado:", pass, "PASS ·", fail, "FAIL\\n");
process.exit(fail>0?1:0);
`,
);

write(
  "context-engine-tests.mjs",
  `#!/usr/bin/env node
${helper}
import { buildContextSnapshot, summarizeSnapshot } from "../lib/intelligence/enterprise/context/engine.ts";
console.log("\\nContext Engine — 27.1\\n");
const snap = buildContextSnapshot({
  request: { tenantId: "t1", companyId: null, branchId: null, period: { preset: "30d" } },
  metrics: [
    { key: "saldoAtual", value: 100, source: "cash", available: true },
    { key: "lucro", value: null, source: "dre", available: false },
  ],
});
assert(snap.tenantId === "t1", "tenant");
assert(snap.missingData.includes("lucro"), "missing");
assert(snap.coverage > 0 && snap.coverage < 1, "partial coverage");
assert(Object.isFrozen(snap), "immutable");
assert(summarizeSnapshot(snap).includes("métricas"), "summary");
console.log("\\nResultado:", pass, "PASS ·", fail, "FAIL\\n");
process.exit(fail>0?1:0);
`,
);

write(
  "evidence-engine-tests.mjs",
  `#!/usr/bin/env node
${helper}
import { makeMetricEvidence, assertEvidencePresent, clearEvidenceForTests, getEvidence } from "../lib/intelligence/enterprise/evidence/registry.ts";
console.log("\\nEvidence Engine — 27.1\\n");
clearEvidenceForTests();
const e = makeMetricEvidence({ tenantId: "t1", module: "financeiro", source: "cash", metric: "saldo", value: 10, deepLink: "/x" });
assert(getEvidence(e.id)?.value === 10, "registered");
assert(assertEvidencePresent("ok", [e.id]).ok, "present");
assert(!assertEvidencePresent("bad", []).ok, "required");
console.log("\\nResultado:", pass, "PASS ·", fail, "FAIL\\n");
process.exit(fail>0?1:0);
`,
);

write(
  "confidence-engine-tests.mjs",
  `#!/usr/bin/env node
${helper}
import { computeConfidence } from "../lib/intelligence/enterprise/confidence/engine.ts";
console.log("\\nConfidence Engine — 27.1\\n");
const empty = computeConfidence({ evidence: [] });
assert(empty.level === "indisponivel", "empty => indisponivel");
const ev = [{
  id: "1", source: "s", sourceType: "metric", module: "financeiro", calculatedAt: new Date().toISOString(),
  freshness: "fresh", reliability: "alta", tenantId: "t",
}];
const ok = computeConfidence({ evidence: ev, sampleSize: 5 });
assert(ok.level === "alta" || ok.level === "media", "with evidence");
assert(ok.score != null, "score");
console.log("\\nResultado:", pass, "PASS ·", fail, "FAIL\\n");
process.exit(fail>0?1:0);
`,
);

console.log("partial gen done — more in next write");
