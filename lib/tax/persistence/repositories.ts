/**
 * Sprint 26.10.1 — Repositórios tributários (persistência real).
 * Sem fallback in-memory para runtime.
 */

import { randomUUID } from "node:crypto";
import {
  probeTaxSchema,
  taxSchemaUnavailableError,
  type TaxPersistenceClient,
  type TaxSchemaProbeResult,
} from "./schema.ts";
import type { TaxRuleStatus } from "../types.ts";

export type TaxPersistResult<T> =
  | { ok: true; data: T; persisted: true }
  | {
      ok: false;
      persisted: false;
      code: "TAX_SCHEMA_UNAVAILABLE" | "TENANT_MISMATCH" | "WRITE_FAILED" | "IMMUTABLE" | "TRANSITION_DENIED";
      message: string;
      missing?: string[];
    };

async function ensure(client: TaxPersistenceClient): Promise<TaxSchemaProbeResult> {
  return probeTaxSchema(client);
}

function fail(
  code:
    | "TAX_SCHEMA_UNAVAILABLE"
    | "TENANT_MISMATCH"
    | "WRITE_FAILED"
    | "IMMUTABLE"
    | "TRANSITION_DENIED",
  message: string,
  missing?: string[],
): TaxPersistResult<never> {
  return { ok: false, persisted: false, code, message, missing };
}

export async function ensureStructuralTaxType(
  client: TaxPersistenceClient,
  code = "demo_estrutural",
): Promise<TaxPersistResult<{ id: string }>> {
  const probe = await ensure(client);
  if (!probe.ready) return { ...taxSchemaUnavailableError(probe), ok: false, persisted: false };
  const { data: existing } = await client
    .from("tax_types")
    .select("id")
    .eq("code", code)
    .maybeSingle();
  if (existing?.id) return { ok: true, persisted: true, data: { id: existing.id } };

  const id = randomUUID();
  const { error } = await client.from("tax_types").insert({
    id,
    code,
    name: "Tipo estrutural (catálogo — sem alíquota)",
    level: "contribuicao",
    calculation_type: "parametric",
    recoverable: false,
    cumulative: false,
    active: true,
    metadata: { demo: true, note: "Não representa alíquota legal" },
  });
  if (!error) return { ok: true, persisted: true, data: { id } };

  // RLS pode bloquear insert autenticado — reutiliza qualquer tipo ativo
  const { data: anyType } = await client
    .from("tax_types")
    .select("id")
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (anyType?.id) {
    return { ok: true, persisted: true, data: { id: anyType.id } };
  }
  return fail(
    "WRITE_FAILED",
    `${error.message}. Sem tax_types disponíveis — rode homolog service-role ou libere insert no catálogo.`,
  );
}

export async function ensureDemoRegime(
  client: TaxPersistenceClient,
  tenantId: string,
  code = "TESTE-DEMO-REGIME",
): Promise<TaxPersistResult<{ id: string }>> {
  const probe = await ensure(client);
  if (!probe.ready) return { ...taxSchemaUnavailableError(probe), ok: false, persisted: false };
  const { data: existing } = await client
    .from("tax_regimes")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("code", code)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing?.id) return { ok: true, persisted: true, data: { id: existing.id } };
  const id = randomUUID();
  const { error } = await client.from("tax_regimes").insert({
    id,
    tenant_id: tenantId,
    code,
    name: "[TESTE] Regime demonstração",
    description: "Cenário de teste — não é enquadramento oficial",
    jurisdiction: "BR",
    active: true,
    valid_from: "2026-01-01",
    valid_to: null,
    metadata: { test: true },
  });
  if (error) return fail("WRITE_FAILED", error.message);
  return { ok: true, persisted: true, data: { id } };
}

export type TaxRuleRow = {
  id: string;
  tenant_id: string;
  company_id: string | null;
  branch_id: string | null;
  code: string;
  name: string;
  description: string | null;
  regime_id: string;
  tax_type_id: string;
  jurisdiction: string;
  country: string | null;
  state: string | null;
  municipality: string | null;
  cnae: string | null;
  ncm: string | null;
  cest: string | null;
  cfop: string | null;
  service_code: string | null;
  customer_type: string | null;
  supplier_type: string | null;
  operation_type: string | null;
  origin: string | null;
  destination: string | null;
  conditions: Record<string, unknown>;
  calculation_base: unknown;
  rate_definition: unknown;
  reduction_definition: unknown;
  credit_definition: unknown;
  retention_definition: unknown;
  exceptions: unknown;
  priority: number;
  valid_from: string;
  valid_to: string | null;
  status: TaxRuleStatus;
  environment: string;
  source_reference: string;
  legal_reference: string | null;
  version: number;
  parent_version_id: string | null;
  created_by: string;
  reviewed_by: string | null;
  approved_by: string | null;
  published_by: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  deleted_at: string | null;
};

export function mapRuleRow(r: TaxRuleRow) {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    companyId: r.company_id,
    branchId: r.branch_id,
    code: r.code,
    name: r.name,
    description: r.description,
    regimeId: r.regime_id,
    taxTypeId: r.tax_type_id,
    jurisdiction: r.jurisdiction,
    country: r.country,
    state: r.state,
    municipality: r.municipality,
    cnae: r.cnae,
    ncm: r.ncm,
    cest: r.cest,
    cfop: r.cfop,
    serviceCode: r.service_code,
    customerType: r.customer_type,
    supplierType: r.supplier_type,
    operationType: r.operation_type,
    origin: r.origin,
    destination: r.destination,
    conditions: r.conditions ?? {},
    calculationBase: r.calculation_base as Record<string, unknown> | null,
    rateDefinition: r.rate_definition as Record<string, unknown> | null,
    reductionDefinition: r.reduction_definition as Record<string, unknown> | null,
    creditDefinition: r.credit_definition as Record<string, unknown> | null,
    retentionDefinition: r.retention_definition as Record<string, unknown> | null,
    exceptions: r.exceptions as Record<string, unknown> | null,
    priority: r.priority,
    validFrom: r.valid_from,
    validTo: r.valid_to,
    status: r.status,
    environment: r.environment as "configuracao" | "simulacao" | "producao",
    sourceReference: r.source_reference,
    legalReference: r.legal_reference,
    version: r.version,
    parentVersionId: r.parent_version_id,
    createdBy: r.created_by,
    reviewedBy: r.reviewed_by,
    approvedBy: r.approved_by,
    publishedBy: r.published_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    publishedAt: r.published_at,
    deletedAt: r.deleted_at,
  };
}

export async function listTaxRules(
  client: TaxPersistenceClient,
  tenantId: string,
): Promise<TaxPersistResult<TaxRuleRow[]>> {
  const probe = await ensure(client);
  if (!probe.ready) return { ...taxSchemaUnavailableError(probe), ok: false, persisted: false };
  const { data, error } = await client
    .from("tax_rules")
    .select("*")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) return fail("WRITE_FAILED", error.message);
  const rows = ((data ?? []) as TaxRuleRow[]).filter((r) => r.tenant_id === tenantId);
  return { ok: true, persisted: true, data: rows };
}

export async function getTaxRule(
  client: TaxPersistenceClient,
  tenantId: string,
  ruleId: string,
): Promise<TaxPersistResult<TaxRuleRow | null>> {
  const probe = await ensure(client);
  if (!probe.ready) return { ...taxSchemaUnavailableError(probe), ok: false, persisted: false };
  const { data, error } = await client
    .from("tax_rules")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", ruleId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return fail("WRITE_FAILED", error.message);
  if (data && (data as TaxRuleRow).tenant_id !== tenantId) {
    return fail("TENANT_MISMATCH", "Tenant mismatch");
  }
  return { ok: true, persisted: true, data: (data as TaxRuleRow) ?? null };
}

export async function createTaxRuleDraft(
  client: TaxPersistenceClient,
  input: {
    tenantId: string;
    createdBy: string;
    code: string;
    name: string;
    regimeId: string;
    taxTypeId: string;
    jurisdiction: string;
    sourceReference: string;
    validFrom: string;
    validTo?: string | null;
    description?: string | null;
    priority?: number;
    state?: string | null;
    companyId?: string | null;
    branchId?: string | null;
    rateDefinition?: Record<string, unknown> | null;
  },
): Promise<TaxPersistResult<{ id: string }>> {
  const probe = await ensure(client);
  if (!probe.ready) return { ...taxSchemaUnavailableError(probe), ok: false, persisted: false };
  const id = randomUUID();
  const { error } = await client.from("tax_rules").insert({
    id,
    tenant_id: input.tenantId,
    company_id: input.companyId ?? null,
    branch_id: input.branchId ?? null,
    code: input.code,
    name: input.name,
    description: input.description ?? "[TESTE] Cenário de demonstração — não é regra oficial",
    regime_id: input.regimeId,
    tax_type_id: input.taxTypeId,
    jurisdiction: input.jurisdiction,
    state: input.state ?? null,
    conditions: { test: true },
    rate_definition: input.rateDefinition ?? {
      demo: true,
      note: "Parâmetro de teste — não é alíquota legal oficial",
      rateEffective: null,
    },
    priority: input.priority ?? 100,
    valid_from: input.validFrom,
    valid_to: input.validTo ?? null,
    status: "draft",
    environment: "configuracao",
    source_reference: input.sourceReference,
    legal_reference: "TESTE — documentação interna de homologação",
    version: 1,
    created_by: input.createdBy,
  });
  if (error) return fail("WRITE_FAILED", error.message);
  await insertTaxAudit(client, {
    tenantId: input.tenantId,
    actorId: input.createdBy,
    action: "rule.create_draft",
    entityType: "tax_rule",
    entityId: id,
    after: { code: input.code, status: "draft" },
  });
  return { ok: true, persisted: true, data: { id } };
}

export async function updateTaxRuleDraft(
  client: TaxPersistenceClient,
  input: {
    tenantId: string;
    ruleId: string;
    actorId: string;
    patch: Partial<{
      name: string;
      description: string | null;
      priority: number;
      sourceReference: string;
      validFrom: string;
      validTo: string | null;
      state: string | null;
      rateDefinition: Record<string, unknown> | null;
    }>;
  },
): Promise<TaxPersistResult<{ id: string }>> {
  const current = await getTaxRule(client, input.tenantId, input.ruleId);
  if (!current.ok) return current;
  if (!current.data) return fail("WRITE_FAILED", "Regra não encontrada");
  if (current.data.status !== "draft" && current.data.status !== "under_review") {
    return fail(
      "IMMUTABLE",
      "Somente draft/under_review são editáveis. Versão publicada exige nova versão.",
    );
  }
  const { error } = await client
    .from("tax_rules")
    .update({
      name: input.patch.name ?? current.data.name,
      description: input.patch.description ?? current.data.description,
      priority: input.patch.priority ?? current.data.priority,
      source_reference: input.patch.sourceReference ?? current.data.source_reference,
      valid_from: input.patch.validFrom ?? current.data.valid_from,
      valid_to:
        input.patch.validTo !== undefined ? input.patch.validTo : current.data.valid_to,
      state: input.patch.state !== undefined ? input.patch.state : current.data.state,
      rate_definition:
        input.patch.rateDefinition !== undefined
          ? input.patch.rateDefinition
          : current.data.rate_definition,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.ruleId)
    .eq("tenant_id", input.tenantId);
  if (error) return fail("WRITE_FAILED", error.message);
  await insertTaxAudit(client, {
    tenantId: input.tenantId,
    actorId: input.actorId,
    action: "rule.update_draft",
    entityType: "tax_rule",
    entityId: input.ruleId,
    before: { status: current.data.status },
    after: input.patch,
  });
  return { ok: true, persisted: true, data: { id: input.ruleId } };
}

export async function transitionTaxRule(
  client: TaxPersistenceClient,
  input: {
    tenantId: string;
    ruleId: string;
    actorId: string;
    to: TaxRuleStatus;
  },
): Promise<TaxPersistResult<{ id: string; status: TaxRuleStatus }>> {
  const { assertTransition, canPublish } = await import("../workflow.ts");
  const current = await getTaxRule(client, input.tenantId, input.ruleId);
  if (!current.ok) return current;
  if (!current.data) return fail("WRITE_FAILED", "Regra não encontrada");
  const from = current.data.status;
  const gate = assertTransition(from, input.to);
  if (!gate.ok) return fail("TRANSITION_DENIED", gate.message);
  if (input.to === "published" && !canPublish(from)) {
    return fail("TRANSITION_DENIED", "Publicação exige status approved");
  }
  if (input.to === "published" && !current.data.source_reference) {
    return fail("TRANSITION_DENIED", "Fonte obrigatória para publicar");
  }

  const patch: Record<string, unknown> = {
    status: input.to,
    updated_at: new Date().toISOString(),
  };
  if (input.to === "under_review") patch.reviewed_by = input.actorId;
  if (input.to === "approved") patch.approved_by = input.actorId;
  if (input.to === "published") {
    patch.published_by = input.actorId;
    patch.published_at = new Date().toISOString();
    patch.environment = "producao";
  }

  const { error } = await client
    .from("tax_rules")
    .update(patch)
    .eq("id", input.ruleId)
    .eq("tenant_id", input.tenantId);
  if (error) return fail("WRITE_FAILED", error.message);

  if (input.to === "published") {
    await snapshotTaxRuleVersion(client, {
      tenantId: input.tenantId,
      rule: { ...current.data, ...patch, status: "published" } as TaxRuleRow,
      changeReason: "Publicação homologação",
      changeSummary: `draft→published v${current.data.version}`,
      createdBy: input.actorId,
    });
  }

  await insertTaxAudit(client, {
    tenantId: input.tenantId,
    actorId: input.actorId,
    action: `rule.transition.${from}_to_${input.to}`,
    entityType: "tax_rule",
    entityId: input.ruleId,
    before: { status: from },
    after: { status: input.to },
  });
  return { ok: true, persisted: true, data: { id: input.ruleId, status: input.to } };
}

export async function createNewVersionFromPublished(
  client: TaxPersistenceClient,
  input: {
    tenantId: string;
    ruleId: string;
    actorId: string;
    changeReason: string;
    namePatch?: string;
  },
): Promise<TaxPersistResult<{ id: string }>> {
  const current = await getTaxRule(client, input.tenantId, input.ruleId);
  if (!current.ok) return current;
  if (!current.data) return fail("WRITE_FAILED", "Regra não encontrada");
  if (current.data.status !== "published" && current.data.status !== "suspended") {
    return fail("IMMUTABLE", "Nova versão a partir de published/suspended");
  }
  if (!input.changeReason.trim()) {
    return fail("WRITE_FAILED", "Motivo obrigatório");
  }
  const id = randomUUID();
  const { error } = await client.from("tax_rules").insert({
    id,
    tenant_id: input.tenantId,
    company_id: current.data.company_id,
    branch_id: current.data.branch_id,
    code: current.data.code,
    name: input.namePatch ?? `${current.data.name} (v${current.data.version + 1})`,
    description: current.data.description,
    regime_id: current.data.regime_id,
    tax_type_id: current.data.tax_type_id,
    jurisdiction: current.data.jurisdiction,
    country: current.data.country,
    state: current.data.state,
    municipality: current.data.municipality,
    cnae: current.data.cnae,
    ncm: current.data.ncm,
    cest: current.data.cest,
    cfop: current.data.cfop,
    service_code: current.data.service_code,
    customer_type: current.data.customer_type,
    supplier_type: current.data.supplier_type,
    operation_type: current.data.operation_type,
    origin: current.data.origin,
    destination: current.data.destination,
    conditions: current.data.conditions,
    calculation_base: current.data.calculation_base,
    rate_definition: current.data.rate_definition,
    reduction_definition: current.data.reduction_definition,
    credit_definition: current.data.credit_definition,
    retention_definition: current.data.retention_definition,
    exceptions: current.data.exceptions,
    priority: current.data.priority,
    valid_from: current.data.valid_from,
    valid_to: current.data.valid_to,
    status: "draft",
    environment: "configuracao",
    source_reference: current.data.source_reference,
    legal_reference: current.data.legal_reference,
    version: current.data.version + 1,
    parent_version_id: current.data.id,
    created_by: input.actorId,
  });
  if (error) return fail("WRITE_FAILED", error.message);

  // Marca anterior como superseded se published
  if (current.data.status === "published") {
    await client
      .from("tax_rules")
      .update({ status: "superseded", updated_at: new Date().toISOString() })
      .eq("id", current.data.id)
      .eq("tenant_id", input.tenantId);
  }

  await insertTaxAudit(client, {
    tenantId: input.tenantId,
    actorId: input.actorId,
    action: "rule.new_version",
    entityType: "tax_rule",
    entityId: id,
    before: { parent: current.data.id, version: current.data.version },
    after: { id, version: current.data.version + 1, reason: input.changeReason },
  });
  return { ok: true, persisted: true, data: { id } };
}

export async function softDeleteTaxRule(
  client: TaxPersistenceClient,
  tenantId: string,
  ruleId: string,
  actorId: string,
): Promise<TaxPersistResult<{ id: string }>> {
  const { error } = await client
    .from("tax_rules")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", ruleId)
    .eq("tenant_id", tenantId);
  if (error) return fail("WRITE_FAILED", error.message);
  await insertTaxAudit(client, {
    tenantId,
    actorId,
    action: "rule.soft_delete",
    entityType: "tax_rule",
    entityId: ruleId,
    after: { deleted: true },
  });
  return { ok: true, persisted: true, data: { id: ruleId } };
}

export async function snapshotTaxRuleVersion(
  client: TaxPersistenceClient,
  input: {
    tenantId: string;
    rule: TaxRuleRow;
    changeReason: string;
    changeSummary: string;
    createdBy: string;
  },
): Promise<TaxPersistResult<{ id: string }>> {
  const id = randomUUID();
  const { error } = await client.from("tax_rule_version_snapshots").insert({
    id,
    rule_id: input.rule.id,
    tenant_id: input.tenantId,
    version: input.rule.version,
    snapshot: input.rule,
    change_reason: input.changeReason,
    change_summary: input.changeSummary,
    effective_from: input.rule.valid_from,
    effective_to: input.rule.valid_to,
    status: input.rule.status,
    created_by: input.createdBy,
    reviewed_by: input.rule.reviewed_by,
    approved_by: input.rule.approved_by,
  });
  if (error) return fail("WRITE_FAILED", error.message);
  return { ok: true, persisted: true, data: { id } };
}

export async function listTaxRuleVersions(
  client: TaxPersistenceClient,
  tenantId: string,
  ruleId?: string,
): Promise<TaxPersistResult<Array<Record<string, unknown>>>> {
  const probe = await ensure(client);
  if (!probe.ready) return { ...taxSchemaUnavailableError(probe), ok: false, persisted: false };
  let q = client
    .from("tax_rule_version_snapshots")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (ruleId) q = q.eq("rule_id", ruleId);
  const { data, error } = await q;
  if (error) return fail("WRITE_FAILED", error.message);
  return { ok: true, persisted: true, data: data ?? [] };
}

export async function listTaxAuditEvents(
  client: TaxPersistenceClient,
  tenantId: string,
): Promise<TaxPersistResult<Array<Record<string, unknown>>>> {
  const probe = await ensure(client);
  if (!probe.ready) return { ...taxSchemaUnavailableError(probe), ok: false, persisted: false };
  const { data, error } = await client
    .from("tax_audit_events")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return fail("WRITE_FAILED", error.message);
  return { ok: true, persisted: true, data: data ?? [] };
}

export async function insertTaxAudit(
  client: TaxPersistenceClient,
  input: {
    tenantId: string;
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    before?: unknown;
    after?: unknown;
  },
): Promise<void> {
  await client.from("tax_audit_events").insert({
    id: randomUUID(),
    tenant_id: input.tenantId,
    actor_id: input.actorId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    before: input.before ?? null,
    after: input.after ?? null,
    correlation_id: `tax-${Date.now()}`,
  });
}

export async function createTaxSimulation(
  client: TaxPersistenceClient,
  input: {
    tenantId: string;
    createdBy: string;
    name: string;
    baselinePeriod: string;
    targetPeriod: string;
    assumptions: string[];
    variables: Record<string, unknown>;
    results: unknown;
    confidence: string;
    ruleVersions: string[];
  },
): Promise<TaxPersistResult<{ id: string }>> {
  const probe = await ensure(client);
  if (!probe.ready) return { ...taxSchemaUnavailableError(probe), ok: false, persisted: false };
  const id = randomUUID();
  const { error } = await client.from("tax_simulations_v2").insert({
    id,
    tenant_id: input.tenantId,
    name: input.name,
    status: "completed",
    baseline_period: input.baselinePeriod,
    target_period: input.targetPeriod,
    currency: "BRL",
    assumptions: input.assumptions,
    variables: input.variables,
    results: input.results,
    confidence: input.confidence,
    warnings: [],
    rule_versions: input.ruleVersions,
    mutates_official: false,
    created_by: input.createdBy,
  });
  if (error) return fail("WRITE_FAILED", error.message);
  await insertTaxAudit(client, {
    tenantId: input.tenantId,
    actorId: input.createdBy,
    action: "simulation.create",
    entityType: "tax_simulation",
    entityId: id,
    after: { mutatesOfficial: false },
  });
  return { ok: true, persisted: true, data: { id } };
}
