"use server";

/**
 * Sprint 26.7 — Server actions Tax Intelligence.
 */

import { getCurrentProfile } from "@/lib/auth/session";
import {
  createAuditSupabaseAdapter,
  createEnterpriseContext,
  createOutboxSupabaseAdapter,
  createRbacSupabaseAdapter,
} from "@/lib/enterprise";
import {
  assertFinanceAccess,
  assertFinancePermission,
  resolveFinanceEffectivePermissions,
  type FinancePermission,
} from "@/lib/finance";
import {
  buildTaxIntelligenceBundle,
  isTaxIntelligenceEnabled,
  taxIntelligenceDrillDown,
  taxIntelligenceSimulate,
  type TaxDrillDownRequest,
  type TaxIntelligenceSnapshot,
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
