"use server";

/**
 * Sprint 22.6.2 — Server actions Cash Intelligence + Conciliação.
 * Leitura: financeiro.visualizar · Simulação: financeiro.criar · Conciliação: financeiro.conciliar (ou criar).
 */

import { getCurrentProfile } from "@/lib/auth/session";
import { createRbacSupabaseAdapter } from "@/lib/enterprise";
import {
  assertFinanceAccess,
  assertFinancePermission,
  createSupabaseFinanceCore,
  resolveFinanceEffectivePermissions,
  type FinancePermission,
} from "@/lib/finance";
import {
  buildExecutiveCashDashboard,
  cashIntelligenceDrillDown,
  cashIntelligenceRecommendations,
  cashIntelligenceSimulate,
  type CashIntelligenceSnapshot,
  type OpenTitleSnapshot,
  type ScenarioInput,
} from "@/lib/finance/cash-intelligence";
import {
  createProductionReconciliationService,
  type BankStatementLine,
  type InternalCandidate,
} from "@/lib/finance/reconciliation";
import {
  createAuditSupabaseAdapter,
  createOutboxSupabaseAdapter,
  createEnterpriseContext,
} from "@/lib/enterprise";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";
import { revalidatePath } from "next/cache";

async function resolveCashAuth(
  tenantSlug: string,
  required: FinancePermission | FinancePermission[],
) {
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

  const audit = createAuditSupabaseAdapter(client);
  const kit = createSupabaseFinanceCore(client, {
    audit,
    outbox: createOutboxSupabaseAdapter(client),
    tenantSlug,
  });

  return { tenant, profile, client, kit, context, audit, tenantSlug, effective };
}

async function loadOpenTitles(
  client: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
): Promise<OpenTitleSnapshot[]> {
  const titles: OpenTitleSnapshot[] = [];
  const today = new Date().toISOString().slice(0, 10);

  try {
    const { data: payables } = await client
      .from("contas_pagar")
      .select(
        "id, descricao, data_vencimento, valor_original, desconto, juros, multa, valor_pago, status, conta_bancaria_id, categoria_financeira_id, centro_custo_id, fornecedor_id",
      )
      .eq("tenant_id", tenantId)
      .in("status", ["aberto", "parcial"])
      .is("deleted_at", null)
      .limit(500);

    for (const row of payables ?? []) {
      const pending = Math.max(
        0,
        Number(row.valor_original) +
          Number(row.juros ?? 0) +
          Number(row.multa ?? 0) -
          Number(row.desconto ?? 0) -
          Number(row.valor_pago ?? 0),
      );
      titles.push({
        id: row.id,
        tenantId,
        kind: "payable",
        description: row.descricao ?? "Conta a pagar",
        dueDate: String(row.data_vencimento).slice(0, 10),
        amountPending: pending,
        status: row.status,
        bankAccountId: row.conta_bancaria_id,
        categoryId: row.categoria_financeira_id,
        costCenterId: row.centro_custo_id,
        dreGroup: null,
        counterparty: row.fornecedor_id,
        installmentLabel: null,
        linkedMovementId: null,
        overdue: String(row.data_vencimento).slice(0, 10) < today,
      });
    }
  } catch {
    /* tabelas podem não estar acessíveis em ambientes de teste */
  }

  try {
    const { data: receivables } = await client
      .from("contas_receber")
      .select(
        "id, descricao, data_vencimento, valor_original, desconto, juros, multa, valor_recebido, status, conta_bancaria_id, categoria_financeira_id, centro_custo_id, cliente_id",
      )
      .eq("tenant_id", tenantId)
      .in("status", ["aberto", "parcial"])
      .is("deleted_at", null)
      .limit(500);

    for (const row of receivables ?? []) {
      const pending = Math.max(
        0,
        Number(row.valor_original) +
          Number(row.juros ?? 0) +
          Number(row.multa ?? 0) -
          Number(row.desconto ?? 0) -
          Number(row.valor_recebido ?? 0),
      );
      titles.push({
        id: row.id,
        tenantId,
        kind: "receivable",
        description: row.descricao ?? "Conta a receber",
        dueDate: String(row.data_vencimento).slice(0, 10),
        amountPending: pending,
        status: row.status,
        bankAccountId: row.conta_bancaria_id,
        categoryId: row.categoria_financeira_id,
        costCenterId: row.centro_custo_id,
        dreGroup: null,
        counterparty: row.cliente_id,
        installmentLabel: null,
        linkedMovementId: null,
        overdue: String(row.data_vencimento).slice(0, 10) < today,
      });
    }
  } catch {
    /* ignore */
  }

  return titles;
}

async function buildSnapshot(
  tenantSlug: string,
  required: FinancePermission | FinancePermission[] = "financeiro.visualizar",
): Promise<{ snap: CashIntelligenceSnapshot; profileId: string }> {
  const { tenant, profile, client, kit, context } = await resolveCashAuth(
    tenantSlug,
    required,
  );
  const [accounts, movements, openTitles] = await Promise.all([
    kit.bankAccounts.list(context),
    kit.movements.list(context),
    loadOpenTitles(client, tenant.id),
  ]);

  return {
    profileId: profile.id,
    snap: {
      tenantId: tenant.id,
      tenantSlug,
      accounts,
      movements,
      openTitles,
    },
  };
}

export async function getCashIntelligenceDashboard(
  tenantSlug: string,
  options?: {
    horizonDays?: number;
    view?: "consolidated" | "account" | "cost_center" | "category" | "dre_group";
    viewId?: string | null;
  },
) {
  try {
    const { snap } = await buildSnapshot(tenantSlug);
    const dashboard = buildExecutiveCashDashboard(snap, {
      horizonDays: options?.horizonDays ?? 30,
      view: options?.view,
      viewId: options?.viewId,
    });
    return { success: true as const, dashboard };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Erro ao carregar caixa.",
    };
  }
}

export async function getCashDrillDown(
  tenantSlug: string,
  input: {
    indicatorKey: string;
    indicatorLabel: string;
    from: string;
    to: string;
  },
) {
  try {
    const { snap } = await buildSnapshot(tenantSlug);
    const tree = cashIntelligenceDrillDown(
      snap,
      input.indicatorKey,
      input.indicatorLabel,
      input.from,
      input.to,
    );
    return { success: true as const, tree };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Erro no drill-down.",
    };
  }
}

export async function getCashRecommendations(tenantSlug: string, horizonDays = 30) {
  try {
    const { snap } = await buildSnapshot(tenantSlug);
    const recommendations = cashIntelligenceRecommendations(snap, horizonDays);
    return { success: true as const, recommendations };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Erro nas recomendações.",
    };
  }
}

export async function simulateCashScenario(
  tenantSlug: string,
  scenario: ScenarioInput,
) {
  try {
    const { snap } = await buildSnapshot(tenantSlug, "financeiro.criar");
    const result = cashIntelligenceSimulate(snap, scenario);
    return { success: true as const, result };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Erro na simulação.",
    };
  }
}

export async function listBankStatementLines(
  tenantSlug: string,
  options?: { bankAccountId?: string },
) {
  try {
    const { tenant, client } = await resolveCashAuth(
      tenantSlug,
      "financeiro.visualizar",
    );
    const svc = createProductionReconciliationService(client);
    const lines = await svc.listStatementLines(tenant.id, {
      bankAccountId: options?.bankAccountId,
    });
    return { success: true as const, lines };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao listar linhas de extrato.",
    };
  }
}

export async function openBankReconciliationSession(
  tenantSlug: string,
  input: {
    bankAccountId: string;
    /** Opcional: se omitido, carrega pendentes do Supabase. */
    statements?: BankStatementLine[];
    /** Opcional: se omitido, deriva candidatos das movimentações da conta. */
    candidates?: InternalCandidate[];
    dayMargin?: number;
  },
) {
  try {
    const { tenant, profile, client, kit, context, audit } =
      await resolveCashAuth(tenantSlug, [
        "financeiro.conciliar",
        "financeiro.criar",
        "financeiro.editar",
      ]);

    const svc = createProductionReconciliationService(client);

    let candidates = input.candidates ?? [];
    if (!candidates.length) {
      const movements = await kit.movements.list(context, {
        accountId: input.bankAccountId,
      });
      candidates = movements
        .filter((m) => m.tenantId === tenant.id)
        .map((m) => ({
          id: m.id,
          tenantId: tenant.id,
          bankAccountId: m.bankAccountId,
          date: m.movementDate.slice(0, 10),
          amount: m.amount,
          description: m.description,
          document: null,
          counterparty: null,
          externalId: null,
          source:
            m.kind === "transferencia"
              ? ("transfer" as const)
              : ("movement" as const),
        }));
    }

    const session = await svc.openSession({
      tenantId: tenant.id,
      bankAccountId: input.bankAccountId,
      userId: profile.id,
      statements: input.statements?.map((s) => ({
        ...s,
        tenantId: tenant.id,
        bankAccountId: input.bankAccountId,
      })),
      candidates: candidates.map((c) => ({ ...c, tenantId: tenant.id })),
      dayMargin: input.dayMargin,
      loadPendingFromStore: !input.statements?.length,
    });

    try {
      await audit.append({
        tenantId: tenant.id,
        userId: profile.id,
        actorType: context.actorType,
        systemActorKey: context.systemActorKey,
        event: "bank.reconciliation.session_opened",
        category: "finance",
        severity: "info",
        targetType: "bank_reconciliation_session",
        targetId: session.id,
        resource: "bank_reconciliation_sessions",
        module: "financeiro",
        description: `Sessão de conciliação aberta · conta ${input.bankAccountId}`,
        metadata: {
          bankAccountId: input.bankAccountId,
          matchCount: session.matches.length,
        },
        origin: context.source,
        correlationId: context.correlationId,
        requestId: context.requestId,
        sessionId: context.sessionId,
        ipAddress: null,
        device: null,
      });
    } catch {
      /* auditoria não bloqueia a operação principal */
    }

    revalidatePath(`/${tenantSlug}/financeiro/conciliacao`);
    return { success: true as const, session };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Erro ao abrir conciliação.",
    };
  }
}

export async function decideBankReconciliationMatch(
  tenantSlug: string,
  input: {
    sessionId: string;
    matchId: string;
    decision: "accepted" | "rejected" | "ignored";
    justification?: string | null;
  },
) {
  try {
    const { tenant, profile, client, context, audit } = await resolveCashAuth(
      tenantSlug,
      ["financeiro.conciliar", "financeiro.criar", "financeiro.editar"],
    );
    const svc = createProductionReconciliationService(client);
    const before = await svc.repository.getMatch(tenant.id, input.matchId);
    const match = await svc.decide({
      tenantId: tenant.id,
      sessionId: input.sessionId,
      matchId: input.matchId,
      decision: input.decision,
      userId: profile.id,
      justification: input.justification,
    });

    try {
      await audit.append({
        tenantId: tenant.id,
        userId: profile.id,
        actorType: context.actorType,
        systemActorKey: context.systemActorKey,
        event: "bank.reconciliation.decision",
        category: "finance",
        severity: "info",
        targetType: "bank_reconciliation_match",
        targetId: match.id,
        resource: "bank_reconciliation_matches",
        module: "financeiro",
        description: `Conciliação ${input.decision} · confiança ${match.confidence}`,
        metadata: {
          sessionId: input.sessionId,
          statementLineId: match.statementLineId,
          internalId: match.internalId,
          confidence: match.confidence,
          previousDecision: before?.decision ?? null,
          newDecision: match.decision,
          previousStatus: before?.status ?? null,
          newStatus: match.status,
          justification: input.justification ?? null,
        },
        origin: context.source,
        correlationId: context.correlationId,
        requestId: context.requestId,
        sessionId: context.sessionId,
        ipAddress: null,
        device: null,
      });
    } catch {
      /* auditoria best-effort */
    }

    revalidatePath(`/${tenantSlug}/financeiro/conciliacao`);
    return { success: true as const, match };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Erro ao decidir conciliação.",
    };
  }
}
