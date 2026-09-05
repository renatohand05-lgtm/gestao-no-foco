"use server";

/**
 * Sprint 26.7 — Server actions Tax Intelligence.
 */

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/session";
import {
  createAuditSupabaseAdapter,
  createEnterpriseContext,
  createOutboxSupabaseAdapter,
  createRbacSupabaseAdapter,
} from "@/lib/enterprise";
import { assertFinancePermission } from "@/lib/finance/shared/rbac";
import {
  assertFinanceAccess,
  resolveFinanceEffectivePermissions,
} from "@/lib/finance/shared/rbac-compat";
import type { FinancePermission } from "@/lib/finance/shared/types";
import {
  buildTaxIntelligenceBundle,
  buildUniversalTaxReform2027Templates,
  describeRegimeSpecificNote2027,
  isTaxIntelligenceEnabled,
  listRequiredKeysHint,
  taxIntelligenceDrillDown,
  taxIntelligenceSimulate,
  validateRuleVersionShape,
  type TaxDrillDownRequest,
  type TaxIntelligenceSnapshot,
  type TaxParameterMap,
  type TaxRegimeCode,
  type TaxRuleVersion,
  type TaxSimulationInput,
} from "@/lib/finance/tax-intelligence";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

async function resolveTaxAuth(
  tenantSlug: string,
  required: FinancePermission | FinancePermission[],
) {
  if (!isTaxIntelligenceEnabled()) {
    throw new Error("Módulo Tax Intelligence desabilitado por feature flag.");
  }

  const tenant = await requireTenant(tenantSlug);
  const profile = await getCurrentProfile();
  if (!profile?.id) throw new Error("Sessão ausente.");

  const client = await createClient();
  const rbac = createRbacSupabaseAdapter(client);
  const snap = await rbac.resolveAuthorizationSnapshot(tenant.id, profile.id);
  const effective = resolveFinanceEffectivePermissions({
    membershipRole: tenant.role,
    snapshotRoles: snap.roles,
    snapshotPermissions: snap.permissions,
  });
  assertFinanceAccess(effective.permissions);
  assertFinancePermission(effective.permissions, required);

  const context = createEnterpriseContext({
    tenantId: tenant.id,
    userId: profile.id,
    roles: effective.roles,
    permissions: effective.permissions,
    source: "server_action",
  });

  return {
    tenant,
    profile,
    client,
    context,
    audit: createAuditSupabaseAdapter(client),
    outbox: createOutboxSupabaseAdapter(client),
    tenantSlug,
    effective,
  };
}

function mapRuleRow(row: Record<string, unknown>, tenantId: string): TaxRuleVersion {
  const params = row.parameters;
  return {
    id: String(row.id),
    tenantId,
    regimeCode: row.regime_code as TaxRuleVersion["regimeCode"],
    versionLabel: String(row.version_label ?? ""),
    effectiveFrom: String(row.effective_from).slice(0, 10),
    effectiveTo: row.effective_to
      ? String(row.effective_to).slice(0, 10)
      : null,
    status: row.status as TaxRuleVersion["status"],
    parameters:
      params && typeof params === "object" && !Array.isArray(params)
        ? (params as TaxRuleVersion["parameters"])
        : {},
    jurisdiction: row.jurisdiction ? String(row.jurisdiction) : null,
    notes: row.notes ? String(row.notes) : null,
  };
}

async function loadTaxSnapshot(
  client: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  tenantSlug: string,
): Promise<TaxIntelligenceSnapshot> {
  const asOf = new Date().toISOString().slice(0, 10);
  const entities: TaxIntelligenceSnapshot["entities"] = [];
  const ruleVersions: TaxRuleVersion[] = [];
  const bases: TaxIntelligenceSnapshot["bases"] = [];
  const suppliers: TaxIntelligenceSnapshot["suppliers"] = [];

  // Tabelas tax_* tipadas após aplicar migration 20260811 — acesso loose até regenerar Database.
  const db = client as unknown as {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          limit: (n: number) => Promise<{ data: Record<string, unknown>[] | null }>;
          is: (
            col: string,
            val: null,
          ) => {
            limit: (n: number) => Promise<{ data: Record<string, unknown>[] | null }>;
          };
        };
      };
    };
  };

  try {
    const { data: ruleRows } = await db
      .from("tax_rule_versions")
      .select(
        "id, regime_code, version_label, effective_from, effective_to, status, parameters, jurisdiction, notes",
      )
      .eq("tenant_id", tenantId)
      .limit(200);
    for (const row of ruleRows ?? []) {
      ruleVersions.push(mapRuleRow(row, tenantId));
    }
  } catch {
    /* tabela ainda não aplicada — snapshot vazio */
  }

  try {
    const { data: entityRows } = await db
      .from("tax_entities")
      .select(
        "id, kind, name, document, parent_id, regime_code, active, metadata",
      )
      .eq("tenant_id", tenantId)
      .limit(200);
    for (const row of entityRows ?? []) {
      entities.push({
        id: String(row.id),
        tenantId,
        kind: row.kind as TaxIntelligenceSnapshot["entities"][number]["kind"],
        name: String(row.name),
        document: row.document ? String(row.document) : null,
        parentId: row.parent_id ? String(row.parent_id) : null,
        regimeCode:
          row.regime_code as TaxIntelligenceSnapshot["entities"][number]["regimeCode"],
        active: Boolean(row.active),
        metadata:
          (row.metadata as Record<string, string | number | boolean>) ?? {},
      });
    }
  } catch {
    /* ignore */
  }

  try {
    const { data: baseRows } = await db
      .from("tax_base_lines")
      .select(
        "id, entity_id, period, kind, amount, product_mix_share, service_mix_share, region_code, cost_center_id, category_id, label",
      )
      .eq("tenant_id", tenantId)
      .limit(1000);
    for (const row of baseRows ?? []) {
      bases.push({
        id: String(row.id),
        tenantId,
        entityId: String(row.entity_id),
        period: String(row.period),
        kind: row.kind as TaxIntelligenceSnapshot["bases"][number]["kind"],
        amount: Number(row.amount),
        productMixShare:
          row.product_mix_share != null
            ? Number(row.product_mix_share)
            : undefined,
        serviceMixShare:
          row.service_mix_share != null
            ? Number(row.service_mix_share)
            : undefined,
        regionCode: row.region_code ? String(row.region_code) : null,
        costCenterId: row.cost_center_id ? String(row.cost_center_id) : null,
        categoryId: row.category_id ? String(row.category_id) : null,
        label: row.label ? String(row.label) : undefined,
      });
    }
  } catch {
    /* ignore */
  }

  try {
    const { data: fornecedores } = await client
      .from("fornecedores")
      .select("id, nome, documento")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .limit(100);
    for (const row of fornecedores ?? []) {
      suppliers.push({
        id: row.id,
        name: row.nome ?? "Fornecedor",
        document: row.documento,
        unitCost: 0,
        historicalReliability: 0.5,
        operationalScore: 0.5,
      });
    }
  } catch {
    /* ignore */
  }

  return {
    tenantId,
    tenantSlug,
    asOf,
    entities,
    ruleVersions,
    bases,
    suppliers,
  };
}

export async function getTaxIntelligenceDashboard(tenantSlug: string) {
  try {
    const auth = await resolveTaxAuth(tenantSlug, [
      "financeiro.visualizar",
      "financeiro.tributos.visualizar",
    ]);
    const snap = await loadTaxSnapshot(
      auth.client,
      auth.tenant.id,
      tenantSlug,
    );
    const bundle = buildTaxIntelligenceBundle(snap);

    try {
      await auth.audit.append({
        tenantId: auth.tenant.id,
        userId: auth.profile.id,
        actorType: auth.context.actorType,
        systemActorKey: auth.context.systemActorKey,
        event: "tax.intelligence.dashboard_view",
        category: "finance",
        severity: "info",
        targetType: "tax_intelligence",
        targetId: auth.tenant.id,
        resource: "tax_rule_versions",
        module: "financeiro",
        description: "Dashboard tributário Enterprise visualizado",
        metadata: {
          assessments: bundle.assessments.length,
          alerts: bundle.alerts.length,
        },
        origin: auth.context.source,
        correlationId: auth.context.correlationId,
        requestId: auth.context.requestId,
        sessionId: auth.context.sessionId,
        ipAddress: null,
        device: null,
      });
    } catch {
      /* auditoria não bloqueia */
    }

    return { success: true as const, ...bundle, snapshotEmpty: snap.ruleVersions.length === 0 && snap.bases.length === 0 };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Falha ao carregar tributos.",
    };
  }
}

export async function getTaxDrillDown(
  tenantSlug: string,
  request: TaxDrillDownRequest,
) {
  try {
    const auth = await resolveTaxAuth(tenantSlug, [
      "financeiro.visualizar",
      "financeiro.tributos.visualizar",
    ]);
    const snap = await loadTaxSnapshot(
      auth.client,
      auth.tenant.id,
      tenantSlug,
    );
    return {
      success: true as const,
      drillDown: taxIntelligenceDrillDown(snap, request),
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Falha no drill-down.",
    };
  }
}

export async function runTaxSimulation(
  tenantSlug: string,
  input: Omit<TaxSimulationInput, "baselineResults"> & {
    baselineResults?: TaxSimulationInput["baselineResults"];
  },
) {
  try {
    const auth = await resolveTaxAuth(tenantSlug, [
      "financeiro.criar",
      "financeiro.tributos.simular",
    ]);
    const snap = await loadTaxSnapshot(
      auth.client,
      auth.tenant.id,
      tenantSlug,
    );
    const result = taxIntelligenceSimulate(snap, {
      ...input,
      baselineResults: input.baselineResults ?? [],
    });

    try {
      await auth.audit.append({
        tenantId: auth.tenant.id,
        userId: auth.profile.id,
        actorType: auth.context.actorType,
        systemActorKey: auth.context.systemActorKey,
        event: "tax.intelligence.simulate",
        category: "finance",
        severity: "info",
        targetType: "tax_simulation",
        targetId: input.kind,
        resource: "tax_simulations",
        module: "financeiro",
        description: `Simulação tributária ${input.kind}`,
        metadata: { kind: input.kind, delta: result.delta },
        origin: auth.context.source,
        correlationId: auth.context.correlationId,
        requestId: auth.context.requestId,
        sessionId: auth.context.sessionId,
        ipAddress: null,
        device: null,
      });
    } catch {
      /* auditoria não bloqueia */
    }

    return { success: true as const, result };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Falha na simulação.",
    };
  }
}

type TaxLooseChain = {
  eq: (col: string, val: string) => TaxLooseChain;
  limit: (
    n: number,
  ) => Promise<{
    data: Record<string, unknown>[] | null;
    error: { message: string } | null;
  }>;
  maybeSingle: () => Promise<{
    data: Record<string, unknown> | null;
    error: { message: string } | null;
  }>;
};

type TaxLooseDb = {
  from: (table: string) => {
    select: (cols: string) => TaxLooseChain;
    insert: (row: Record<string, unknown>) => {
      select: (cols: string) => {
        single: () => Promise<{
          data: Record<string, unknown> | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

export type ApplyTaxReform2027RuleResult = {
  id: string;
  regimeCode: TaxRegimeCode;
  versionLabel: string;
  status: string;
  alreadyExisted: boolean;
  missingParameters: string[];
  notes: string | null;
};

/**
 * "Aplicar regras 2027": identifica o regime da empresa (ou cadastra a
 * entidade fiscal se ainda não existir) e cria — como rascunho — as
 * versões de regra CBS/IBS vigentes a partir de 2027. Nunca ativa sozinha:
 * o que já é fato legal vem parametrizado, o que ainda depende do Senado
 * fica marcado como pendente, e cabe ao contador revisar antes de ativar.
 */
export async function applyTaxReform2027(
  tenantSlug: string,
  regimeCode: TaxRegimeCode,
) {
  try {
    const auth = await resolveTaxAuth(tenantSlug, [
      "financeiro.criar",
      "financeiro.tributos.configurar",
    ]);

    const db = auth.client as unknown as TaxLooseDb;

    const { data: existingEntities, error: entityReadError } = await db
      .from("tax_entities")
      .select("id, regime_code")
      .eq("tenant_id", auth.tenant.id)
      .eq("kind", "company")
      .limit(1);
    if (entityReadError) throw new Error(entityReadError.message);

    let entityCreated = false;
    if (!existingEntities || existingEntities.length === 0) {
      const { error: entityInsertError } = await db
        .from("tax_entities")
        .insert({
          tenant_id: auth.tenant.id,
          kind: "company",
          name: auth.tenant.name,
          regime_code: regimeCode,
          active: true,
        })
        .select("id")
        .single();
      if (entityInsertError) throw new Error(entityInsertError.message);
      entityCreated = true;
    }

    const templates = buildUniversalTaxReform2027Templates();
    const rules: ApplyTaxReform2027RuleResult[] = [];

    for (const template of templates) {
      const { data: existingRule, error: ruleReadError } = await db
        .from("tax_rule_versions")
        .select("id, status, parameters, version_label")
        .eq("tenant_id", auth.tenant.id)
        .eq("regime_code", template.regimeCode)
        .eq("effective_from", template.effectiveFrom)
        .maybeSingle();
      if (ruleReadError) throw new Error(ruleReadError.message);

      if (existingRule) {
        const missing = validateRuleVersionShape({
          id: String(existingRule.id),
          tenantId: auth.tenant.id,
          regimeCode: template.regimeCode,
          versionLabel: String(existingRule.version_label ?? template.versionLabel),
          effectiveFrom: template.effectiveFrom,
          effectiveTo: template.effectiveTo,
          status: (existingRule.status as TaxRuleVersion["status"]) ?? "draft",
          parameters: (existingRule.parameters as TaxRuleVersion["parameters"]) ?? {},
        });
        rules.push({
          id: String(existingRule.id),
          regimeCode: template.regimeCode,
          versionLabel: String(existingRule.version_label ?? template.versionLabel),
          status: String(existingRule.status ?? "draft"),
          alreadyExisted: true,
          missingParameters: missing,
          notes: template.notes,
        });
        continue;
      }

      const { data: created, error: createError } = await db
        .from("tax_rule_versions")
        .insert({
          tenant_id: auth.tenant.id,
          regime_code: template.regimeCode,
          version_label: template.versionLabel,
          effective_from: template.effectiveFrom,
          effective_to: template.effectiveTo,
          status: "draft",
          parameters: template.parameters,
          jurisdiction: "BR",
          notes: template.notes,
          created_by: auth.profile.id,
        })
        .select("id")
        .single();
      if (createError || !created) {
        throw new Error(createError?.message ?? "Falha ao criar a regra 2027.");
      }

      rules.push({
        id: String(created.id),
        regimeCode: template.regimeCode,
        versionLabel: template.versionLabel,
        status: "draft",
        alreadyExisted: false,
        missingParameters: template.pendingParameters,
        notes: template.notes,
      });
    }

    try {
      await auth.audit.append({
        tenantId: auth.tenant.id,
        userId: auth.profile.id,
        actorType: auth.context.actorType,
        systemActorKey: auth.context.systemActorKey,
        event: "tax.reform_2027.applied",
        category: "finance",
        severity: "info",
        targetType: "tax_rule_versions",
        targetId: auth.tenant.id,
        resource: "tax_rule_versions",
        module: "financeiro",
        description: "Regras da Reforma Tributária 2027 aplicadas (rascunho)",
        metadata: {
          regimeCode,
          rulesCreated: rules.filter((r) => !r.alreadyExisted).length,
        },
        origin: auth.context.source,
        correlationId: auth.context.correlationId,
        requestId: auth.context.requestId,
        sessionId: auth.context.sessionId,
        ipAddress: null,
        device: null,
      });
    } catch {
      /* auditoria não bloqueia */
    }

    revalidatePath(`/${tenantSlug}/financeiro/tributos`);

    return {
      success: true as const,
      entityCreated,
      regimeCode,
      regimeNote: describeRegimeSpecificNote2027(regimeCode),
      rules,
    };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Falha ao aplicar as regras 2027.",
    };
  }
}

export type TaxRuleVersionForManagement = {
  id: string;
  regimeCode: TaxRegimeCode;
  versionLabel: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: TaxRuleVersion["status"];
  parameters: TaxParameterMap;
  requiredKeys: string[];
  missingParameters: string[];
  notes: string | null;
};

/** Lista todas as versões de regra do tenant, pra tela de revisão/ativação. */
export async function listTaxRuleVersionsForManagement(tenantSlug: string) {
  try {
    const auth = await resolveTaxAuth(tenantSlug, [
      "financeiro.tributos.visualizar",
      "financeiro.tributos.configurar",
    ]);
    const db = auth.client as unknown as TaxLooseDb;

    const { data, error } = await db
      .from("tax_rule_versions")
      .select(
        "id, regime_code, version_label, effective_from, effective_to, status, parameters, notes",
      )
      .eq("tenant_id", auth.tenant.id)
      .limit(200);
    if (error) throw new Error(error.message);

    const rows = ((data ?? []) as unknown as Array<{
      id: string;
      regime_code: string;
      version_label: string;
      effective_from: string;
      effective_to: string | null;
      status: string;
      parameters: Record<string, unknown> | null;
      notes: string | null;
    }>)
      .slice()
      .sort((a, b) => b.effective_from.localeCompare(a.effective_from));

    const result: TaxRuleVersionForManagement[] = rows.map((row) => {
      const regimeCode = row.regime_code as TaxRegimeCode;
      const parameters = (row.parameters ?? {}) as TaxParameterMap;
      const requiredKeys = listRequiredKeysHint(regimeCode);
      const missing = validateRuleVersionShape({
        id: row.id,
        tenantId: auth.tenant.id,
        regimeCode,
        versionLabel: row.version_label,
        effectiveFrom: row.effective_from.slice(0, 10),
        effectiveTo: row.effective_to ? row.effective_to.slice(0, 10) : null,
        status: row.status as TaxRuleVersion["status"],
        parameters,
      });

      return {
        id: row.id,
        regimeCode,
        versionLabel: row.version_label,
        effectiveFrom: row.effective_from.slice(0, 10),
        effectiveTo: row.effective_to ? row.effective_to.slice(0, 10) : null,
        status: row.status as TaxRuleVersion["status"],
        parameters,
        requiredKeys,
        missingParameters: missing,
        notes: row.notes,
      };
    });

    return { success: true as const, rules: result };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Falha ao carregar as regras tributárias.",
    };
  }
}

/** Atualiza os parâmetros de uma versão de regra (nunca muda status aqui). */
export async function updateTaxRuleVersionParameters(
  tenantSlug: string,
  ruleId: string,
  parameters: TaxParameterMap,
) {
  try {
    const auth = await resolveTaxAuth(tenantSlug, [
      "financeiro.tributos.configurar",
    ]);
    const db = auth.client as unknown as TaxLooseDb;

    const { data: existing, error: readError } = await db
      .from("tax_rule_versions")
      .select("id, parameters")
      .eq("tenant_id", auth.tenant.id)
      .eq("id", ruleId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!existing) throw new Error("Regra tributária não encontrada.");

    const merged: TaxParameterMap = {
      ...((existing.parameters as TaxParameterMap) ?? {}),
      ...parameters,
    };

    const updateClient = auth.client as unknown as {
      from: (table: string) => {
        update: (row: Record<string, unknown>) => {
          eq: (
            col: string,
            val: string,
          ) => {
            eq: (
              col: string,
              val: string,
            ) => Promise<{ error: { message: string } | null }>;
          };
        };
      };
    };

    const { error } = await updateClient
      .from("tax_rule_versions")
      .update({ parameters: merged, updated_at: new Date().toISOString() })
      .eq("tenant_id", auth.tenant.id)
      .eq("id", ruleId);
    if (error) throw new Error(error.message);

    revalidatePath(`/${tenantSlug}/financeiro/tributos`);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Falha ao salvar os parâmetros.",
    };
  }
}

/**
 * Ativa uma versão de regra — só se todos os parâmetros obrigatórios já
 * estiverem preenchidos. Ao ativar, supera (marca como 'superseded')
 * qualquer outra versão ativa do mesmo regime com vigência mais antiga,
 * pra não haver duas regras "active" competindo pela mesma data.
 */
export async function activateTaxRuleVersion(
  tenantSlug: string,
  ruleId: string,
) {
  try {
    const auth = await resolveTaxAuth(tenantSlug, [
      "financeiro.tributos.configurar",
    ]);
    const db = auth.client as unknown as TaxLooseDb;

    const { data: rule, error: readError } = await db
      .from("tax_rule_versions")
      .select(
        "id, regime_code, version_label, effective_from, effective_to, status, parameters",
      )
      .eq("tenant_id", auth.tenant.id)
      .eq("id", ruleId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!rule) throw new Error("Regra tributária não encontrada.");

    const regimeCode = rule.regime_code as TaxRegimeCode;
    const missing = validateRuleVersionShape({
      id: String(rule.id),
      tenantId: auth.tenant.id,
      regimeCode,
      versionLabel: String(rule.version_label),
      effectiveFrom: String(rule.effective_from).slice(0, 10),
      effectiveTo: rule.effective_to
        ? String(rule.effective_to).slice(0, 10)
        : null,
      status: rule.status as TaxRuleVersion["status"],
      parameters: (rule.parameters as TaxParameterMap) ?? {},
    });

    if (missing.length > 0) {
      throw new Error(
        `Não é possível ativar: faltam os parâmetros ${missing.join(", ")}.`,
      );
    }

    const updateClient = auth.client as unknown as {
      from: (table: string) => {
        update: (row: Record<string, unknown>) => {
          eq: (
            col: string,
            val: string,
          ) => {
            eq: (
              col: string,
              val: string,
            ) => {
              eq: (
                col: string,
                val: string,
              ) => Promise<{ error: { message: string } | null }>;
            } & Promise<{ error: { message: string } | null }>;
          };
        };
      };
    };

    // Supera outras versões ativas do mesmo regime com vigência anterior.
    const { error: supersedeError } = await updateClient
      .from("tax_rule_versions")
      .update({ status: "superseded", updated_at: new Date().toISOString() })
      .eq("tenant_id", auth.tenant.id)
      .eq("regime_code", regimeCode)
      .eq("status", "active");
    if (supersedeError) throw new Error(supersedeError.message);

    const { error: activateError } = await updateClient
      .from("tax_rule_versions")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("tenant_id", auth.tenant.id)
      .eq("id", ruleId);
    if (activateError) throw new Error(activateError.message);

    try {
      await auth.audit.append({
        tenantId: auth.tenant.id,
        userId: auth.profile.id,
        actorType: auth.context.actorType,
        systemActorKey: auth.context.systemActorKey,
        event: "tax.rule_version.activated",
        category: "finance",
        severity: "warning",
        targetType: "tax_rule_versions",
        targetId: ruleId,
        resource: "tax_rule_versions",
        module: "financeiro",
        description: `Regra tributária ativada: ${rule.version_label}`,
        metadata: { regimeCode, ruleId },
        origin: auth.context.source,
        correlationId: auth.context.correlationId,
        requestId: auth.context.requestId,
        sessionId: auth.context.sessionId,
        ipAddress: null,
        device: null,
      });
    } catch {
      /* auditoria não bloqueia */
    }

    revalidatePath(`/${tenantSlug}/financeiro/tributos`);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Falha ao ativar a regra.",
    };
  }
}

/** Arquiva uma versão de regra (sai de circulação, mas fica no histórico). */
export async function archiveTaxRuleVersion(
  tenantSlug: string,
  ruleId: string,
) {
  try {
    const auth = await resolveTaxAuth(tenantSlug, [
      "financeiro.tributos.configurar",
    ]);

    const updateClient = auth.client as unknown as {
      from: (table: string) => {
        update: (row: Record<string, unknown>) => {
          eq: (
            col: string,
            val: string,
          ) => {
            eq: (
              col: string,
              val: string,
            ) => Promise<{ error: { message: string } | null }>;
          };
        };
      };
    };

    const { error } = await updateClient
      .from("tax_rule_versions")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("tenant_id", auth.tenant.id)
      .eq("id", ruleId);
    if (error) throw new Error(error.message);

    revalidatePath(`/${tenantSlug}/financeiro/tributos`);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Falha ao arquivar a regra.",
    };
  }
}
