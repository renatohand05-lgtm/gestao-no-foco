"use server";

import { createClient } from "@/lib/supabase/server";
import {
  requireActiveTenantIdMutation,
  requireTenantMutationPermission,
} from "@/lib/rbac/mutation-auth";
import type { PermissionKey } from "@/lib/rbac";
import { probeTaxSchema } from "./persistence/schema.ts";
import {
  createNewVersionFromPublished,
  createTaxRuleDraft,
  createTaxSimulation,
  ensureDemoRegime,
  ensureStructuralTaxType,
  getTaxRule,
  listTaxAuditEvents,
  listTaxRuleVersions,
  listTaxRules,
  mapRuleRow,
  softDeleteTaxRule,
  transitionTaxRule,
  updateTaxRuleDraft,
} from "./persistence/repositories.ts";
import { resolveTaxRulePrecedence } from "./precedence.ts";
import { diffTaxRules } from "./versioning.ts";
import {
  buildScenario,
  createSimulationShell,
  runScenarioCalculation,
  compareRegimesLanguage,
} from "./simulation.ts";
import {
  answerTaxIntelligence,
  buildExecutiveCockpitSkeleton,
  buildTaxCalendar,
  detectTaxAlerts,
  projectTax,
  draftTaxActionPlan,
} from "./executive.ts";
import type { TaxIntelligenceIntent, TaxRuleStatus } from "./types.ts";

async function guardTax(
  tenantId: string,
  required: PermissionKey | readonly PermissionKey[],
) {
  return requireActiveTenantIdMutation(tenantId, required);
}

export async function getTaxPersistenceStatusAction() {
  const client = await createClient();
  return probeTaxSchema(client);
}

export async function listTaxRulesAction(tenantId: string) {
  await guardTax(tenantId, ["tax.visualizar", "financeiro.tributos.visualizar"]);
  const client = await createClient();
  const res = await listTaxRules(client, tenantId);
  if (!res.ok) return { ready: false as const, message: res.message, rules: [] };
  return {
    ready: true as const,
    message: "ok",
    rules: res.data.map(mapRuleRow),
  };
}

export async function getTaxRuleAction(tenantId: string, ruleId: string) {
  await guardTax(tenantId, ["tax.visualizar", "financeiro.tributos.visualizar"]);
  const client = await createClient();
  const res = await getTaxRule(client, tenantId, ruleId);
  if (!res.ok) return { ready: false as const, message: res.message, rule: null };
  return {
    ready: true as const,
    message: "ok",
    rule: res.data ? mapRuleRow(res.data) : null,
  };
}

export async function bootstrapTaxDemoRefsAction(tenantId: string) {
  const { userId } = await guardTax(tenantId, [
    "tax.configurar",
    "tax.criar_regra",
  ]);
  void userId;
  const client = await createClient();
  const type = await ensureStructuralTaxType(client);
  const regime = await ensureDemoRegime(client, tenantId);
  return {
    taxTypeId: type.ok ? type.data.id : null,
    regimeId: regime.ok ? regime.data.id : null,
    typeError: type.ok ? null : type.message,
    regimeError: regime.ok ? null : regime.message,
  };
}

export async function createTaxRuleDraftAction(input: {
  tenantId: string;
  userId: string;
  code: string;
  name: string;
  sourceReference: string;
  validFrom: string;
  validTo?: string | null;
  priority?: number;
  state?: string | null;
  jurisdiction?: string;
}) {
  const { userId } = await guardTax(input.tenantId, "tax.criar_regra");
  const client = await createClient();
  const type = await ensureStructuralTaxType(client);
  const regime = await ensureDemoRegime(client, input.tenantId);
  if (!type.ok) {
    return { ok: false as const, message: type.message };
  }
  if (!regime.ok) {
    return { ok: false as const, message: regime.message };
  }
  const res = await createTaxRuleDraft(client, {
    tenantId: input.tenantId,
    createdBy: userId,
    code: input.code,
    name: input.name,
    regimeId: regime.data.id,
    taxTypeId: type.data.id,
    jurisdiction: input.jurisdiction ?? "BR",
    sourceReference: input.sourceReference,
    validFrom: input.validFrom,
    validTo: input.validTo ?? null,
    priority: input.priority,
    state: input.state ?? null,
    rateDefinition: {
      demo: true,
      label: "CENÁRIO DE TESTE — não é alíquota legal oficial",
      rateEffective: null,
    },
  });
  if (!res.ok) return { ok: false as const, message: res.message };
  return { ok: true as const, id: res.data.id };
}

export async function updateTaxRuleDraftAction(input: {
  tenantId: string;
  userId: string;
  ruleId: string;
  name?: string;
  priority?: number;
  sourceReference?: string;
}) {
  const { userId } = await guardTax(input.tenantId, "tax.editar_draft");
  const client = await createClient();
  const res = await updateTaxRuleDraft(client, {
    tenantId: input.tenantId,
    ruleId: input.ruleId,
    actorId: userId,
    patch: {
      name: input.name,
      priority: input.priority,
      sourceReference: input.sourceReference,
    },
  });
  if (!res.ok) return { ok: false as const, message: res.message, code: res.code };
  return { ok: true as const, id: res.data.id };
}

export async function transitionTaxRuleAction(input: {
  tenantId: string;
  userId: string;
  ruleId: string;
  to: TaxRuleStatus;
}) {
  const { userId } = await guardTax(input.tenantId, [
    "tax.revisar",
    "tax.aprovar",
    "tax.publicar",
    "tax.suspender",
    "tax.configurar",
  ]);
  const client = await createClient();
  const res = await transitionTaxRule(client, {
    tenantId: input.tenantId,
    ruleId: input.ruleId,
    actorId: userId,
    to: input.to,
  });
  if (!res.ok) return { ok: false as const, message: res.message, code: res.code };
  return { ok: true as const, id: res.data.id, status: res.data.status };
}

export async function createTaxRuleVersionAction(input: {
  tenantId: string;
  userId: string;
  ruleId: string;
  changeReason: string;
}) {
  const { userId } = await guardTax(input.tenantId, "tax.versionar");
  const client = await createClient();
  const res = await createNewVersionFromPublished(client, {
    tenantId: input.tenantId,
    ruleId: input.ruleId,
    actorId: userId,
    changeReason: input.changeReason,
  });
  if (!res.ok) return { ok: false as const, message: res.message };
  return { ok: true as const, id: res.data.id };
}

export async function softDeleteTaxRuleAction(input: {
  tenantId: string;
  userId: string;
  ruleId: string;
}) {
  const { userId } = await guardTax(input.tenantId, [
    "tax.editar_draft",
    "tax.configurar",
  ]);
  const client = await createClient();
  return softDeleteTaxRule(client, input.tenantId, input.ruleId, userId);
}

export async function getTaxAuditAction(tenantId: string) {
  await guardTax(tenantId, ["tax.ver_auditoria", "tax.visualizar"]);
  const client = await createClient();
  const res = await listTaxAuditEvents(client, tenantId);
  if (!res.ok) return { ready: false as const, message: res.message, rows: [] };
  return { ready: true as const, message: "ok", rows: res.data };
}

export async function getTaxVersionsAction(tenantId: string, ruleId?: string) {
  await guardTax(tenantId, ["tax.visualizar", "tax.versionar"]);
  const client = await createClient();
  const res = await listTaxRuleVersions(client, tenantId, ruleId);
  if (!res.ok) return { ready: false as const, message: res.message, rows: [] };
  return { ready: true as const, message: "ok", rows: res.data };
}

export async function diagnoseTaxPrecedenceAction(input: {
  tenantId: string;
  asOf: string;
  state?: string | null;
}) {
  await guardTax(input.tenantId, ["tax.visualizar", "tax.simular"]);
  const client = await createClient();
  const list = await listTaxRules(client, input.tenantId);
  if (!list.ok) return { ready: false as const, message: list.message, result: null };
  const rules = list.data.map(mapRuleRow);
  const result = resolveTaxRulePrecedence(rules, {
    tenantId: input.tenantId,
    state: input.state ?? null,
    asOf: input.asOf,
    environment: "producao",
  });
  return { ready: true as const, message: "ok", result };
}

export async function diffTaxRulesAction(input: {
  tenantId: string;
  previousId: string;
  currentId: string;
}) {
  await guardTax(input.tenantId, ["tax.visualizar", "tax.versionar"]);
  const client = await createClient();
  const prev = await getTaxRule(client, input.tenantId, input.previousId);
  const curr = await getTaxRule(client, input.tenantId, input.currentId);
  if (!prev.ok || !curr.ok || !curr.data) {
    return { ok: false as const, message: "Regras não encontradas" };
  }
  const diff = diffTaxRules(
    prev.data ? mapRuleRow(prev.data) : null,
    mapRuleRow(curr.data),
    "comparação homologação",
    "system",
  );
  return { ok: true as const, diff };
}

export async function runTaxSimulationAction(input: {
  tenantId: string;
  userId: string;
  baselineRevenue: number | null;
  scenarios: Array<{
    type: "baseline" | "expected" | "optimistic";
    growthPct: number;
    rateEffective: number | null;
  }>;
  ruleVersionIds: string[];
}) {
  const { userId } = await guardTax(input.tenantId, "tax.simular");
  const shell = createSimulationShell({
    tenantId: input.tenantId,
    createdBy: userId,
    name: "[TESTE] Simulação homologação 26.10.1",
    baselinePeriod: "2026-01",
    targetPeriod: "2026-12",
    assumptions: [
      "CENÁRIO DE TESTE — valores demonstrativos",
      "Não altera DRE/contas/estoque oficiais",
      "rateEffective somente se informado explicitamente",
    ],
    ruleVersions: input.ruleVersionIds,
  });

  const results = input.scenarios.map((s) => {
    const scn = buildScenario(
      shell.id,
      s.type,
      s.type,
      {
        revenueGrowthPct: s.growthPct,
        rateEffective: s.rateEffective,
        cashFlowDelta: null,
        ebitdaDelta: null,
        marginDelta: null,
      },
      shell.assumptions,
      input.ruleVersionIds,
    );
    const result = runScenarioCalculation({
      scenario: scn,
      baselineRevenue: input.baselineRevenue,
    });
    return { ...scn, result };
  });

  const client = await createClient();
  const persisted = await createTaxSimulation(client, {
    tenantId: input.tenantId,
    createdBy: userId,
    name: shell.name,
    baselinePeriod: shell.baselinePeriod,
    targetPeriod: shell.targetPeriod,
    assumptions: shell.assumptions,
    variables: { scenarios: input.scenarios },
    results: { scenarios: results.map((r) => r.result) },
    confidence: results[0]?.result.confidence ?? "indisponivel",
    ruleVersions: input.ruleVersionIds,
  });

  return {
    mutatesOfficial: false as const,
    comparisonLanguage: compareRegimesLanguage(
      results.sort(
        (a, b) => (a.result.totalTaxes ?? 1e18) - (b.result.totalTaxes ?? 1e18),
      )[0]?.name ?? "n/d",
    ),
    scenarios: results,
    persisted: persisted.ok,
    simulationId: persisted.ok ? persisted.data.id : null,
    persistMessage: persisted.ok ? "ok" : persisted.message,
  };
}

export async function getTaxExecutiveBundleAction(input: {
  tenantId: string;
  tenantSlug: string;
}) {
  const { tenant } = await requireTenantMutationPermission(input.tenantSlug, [
    "tax.executivo",
    "tax.visualizar",
  ]);
  if (tenant.id !== input.tenantId) {
    throw new Error("PERMISSION_DENIED");
  }
  const client = await createClient();
  const rulesRes = await listTaxRules(client, tenant.id);
  const rules = rulesRes.ok ? rulesRes.data.map(mapRuleRow) : [];
  const asOf = new Date().toISOString();
  const cockpit = buildExecutiveCockpitSkeleton({
    period: asOf.slice(0, 7),
    coveragePct: rules.length ? Math.min(100, rules.length * 20) : null,
    lastUpdate: asOf,
  });
  const alerts = detectTaxAlerts({
    rules,
    asOf,
    tenantSlug: input.tenantSlug,
  });
  const calendar = buildTaxCalendar({
    obligations: [],
    asOf,
    tenantSlug: input.tenantSlug,
  });
  const projections = ([30, 60, 90, 365] as const).map((h) =>
    projectTax({
      horizonDays: h === 365 ? 365 : h,
      historicalMonthly: null,
      assumptions: ["Sem série histórica configurada"],
    }),
  );
  return { cockpit, alerts, calendar, projections, rulesCount: rules.length };
}

export async function askTaxIntelligenceAction(input: {
  tenantSlug: string;
  intent: TaxIntelligenceIntent;
  evidence: string[];
  burdenDeltaPct?: number | null;
  ruleId?: string;
  version?: number;
}) {
  await requireTenantMutationPermission(input.tenantSlug, [
    "tax.visualizar",
    "tax.executivo",
  ]);
  return answerTaxIntelligence({
    intent: input.intent,
    evidence: input.evidence,
    periodComparable: input.burdenDeltaPct != null,
    calcValid: input.evidence.length > 0,
    burdenDeltaPct: input.burdenDeltaPct ?? null,
    ruleId: input.ruleId,
    version: input.version,
    tenantSlug: input.tenantSlug,
  });
}

export async function createTaxActionPlanAction(input: {
  objective: string;
  risk: string;
  evidence: string[];
  steps: string[];
}) {
  // Sem tenant no contrato legado — exige sessão autenticada via getUserTenants indireto:
  // caller deve estar autenticado; plano é só texto local.
  const { getCurrentProfile } = await import("@/lib/auth/session");
  const profile = await getCurrentProfile();
  if (!profile?.id) {
    throw new Error("PERMISSION_DENIED");
  }
  return draftTaxActionPlan(input);
}
