"use server";

/**
 * Sprint 30.7.1 — Server actions Automações (RBAC + tenant + persistência).
 */

import {
  createRuleFromTemplate,
  decideAutomationApproval,
  dryRunRule,
  duplicateRule,
  loadAutomationCentral,
  markNotificationRead,
  requestExecutionApproval,
  updateRuleStatus,
} from "./service.ts";
import { probeAutomationSchema, clearAutomationSchemaProbeCache } from "./schema-probe.ts";
import { hasAutomationPermission } from "./guards.ts";
import { requireAutomacoesAccess } from "./page-auth.ts";
import { AUTOMATION_TEMPLATES, templatesForSegment } from "./templates.ts";
import { TRIGGER_CATALOG } from "./triggers.ts";
import { ALLOWED_ACTIONS, BLOCKED_EXTERNAL_ACTIONS } from "./actions-catalog.ts";
import { dbDeleteQaRules, dbGetRule, dbListRules, dbUpsertRule } from "./repository.ts";
import type { AutomationRuleStatus } from "./types.ts";

const QA_PREFIX = "QA3071-";

function sampleCtx(tenantId: string, triggerType: string) {
  return {
    tenantId,
    fields: {
      entityId: `demo-${triggerType}`,
      label: triggerType,
      diasAtraso: 2,
      diasSemContato: 5,
      diasParada: 7,
      diasParaValidade: 2,
      saldoProjetado: -1000,
      percentual: 70,
      abaixoMinimo: true,
      level: "critico",
      eventoIds: ["e1", "e2"],
      saldo: 1,
      minimo: 5,
    } as Record<string, unknown>,
  };
}

function elevated(auth: Awaited<ReturnType<typeof requireAutomacoesAccess>>) {
  return (
    auth.tenant.role === "owner" ||
    auth.tenant.role === "admin" ||
    auth.roles.includes("proprietario") ||
    auth.roles.includes("diretor")
  );
}

async function withProbe(auth: Awaited<ReturnType<typeof requireAutomacoesAccess>>) {
  const probe = await probeAutomationSchema(auth.client);
  return {
    schemaReady: probe.ready,
    client: auth.client,
    probe,
  };
}

export async function getAutomacoesCentralAction(tenantSlug: string) {
  try {
    const auth = await requireAutomacoesAccess(tenantSlug);
    const probe = await probeAutomationSchema(auth.client);
    let schemaReady = probe.ready;
    let snapshot;
    let persistErrorMessage: string | null = null;
    try {
      snapshot = await loadAutomationCentral({
        tenantId: auth.tenant.id,
        userId: auth.profile.id,
        schemaReady,
        client: auth.client,
      });
    } catch (persistError) {
      persistErrorMessage =
        persistError instanceof Error
          ? persistError.message.slice(0, 200)
          : "leitura falhou";
      clearAutomationSchemaProbeCache();
      schemaReady = false;
      snapshot = await loadAutomationCentral({
        tenantId: auth.tenant.id,
        userId: auth.profile.id,
        schemaReady: false,
        client: null,
      });
      snapshot = {
        ...snapshot,
        schemaReady: false,
      };
    }
    const segment =
      (auth.tenant as { segment?: string | null }).segment ?? null;
    return {
      success: true as const,
      snapshot,
      probe: schemaReady
        ? probe
        : {
            ...probe,
            ready: false,
            message:
              probe.ready && persistErrorMessage
                ? `Schema detectado, mas leitura falhou: ${persistErrorMessage}`
                : probe.message,
          },
      templates: templatesForSegment(segment),
      triggers: TRIGGER_CATALOG,
      allowedActions: ALLOWED_ACTIONS,
      blockedActions: BLOCKED_EXTERNAL_ACTIONS,
      permissions: auth.permissions,
      persistErrorMessage,
    };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Falha ao carregar Automações.",
    };
  }
}

export async function createAutomationFromTemplateAction(
  tenantSlug: string,
  templateId: string,
  name?: string,
) {
  try {
    const auth = await requireAutomacoesAccess(tenantSlug);
    if (
      !elevated(auth) &&
      !hasAutomationPermission(auth.permissions, [
        "automacoes.criar",
        "automacoes.administrar",
      ])
    ) {
      throw new Error("Sem permissão: automacoes.criar");
    }
    const { schemaReady, client } = await withProbe(auth);
    const rule = await createRuleFromTemplate({
      tenantId: auth.tenant.id,
      templateId,
      userId: auth.profile.id,
      name,
      schemaReady,
      client,
    });
    return { success: true as const, rule, schemaReady };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Falha ao criar regra.",
    };
  }
}

export async function createQa3071RuleAction(
  tenantSlug: string,
  templateId: string,
) {
  const tpl = AUTOMATION_TEMPLATES.find((t) => t.id === templateId);
  const name = `${QA_PREFIX}${tpl?.name ?? templateId}`;
  return createAutomationFromTemplateAction(tenantSlug, templateId, name);
}

export async function setAutomationRuleStatusAction(
  tenantSlug: string,
  ruleId: string,
  status: AutomationRuleStatus,
) {
  try {
    const auth = await requireAutomacoesAccess(tenantSlug);
    const need =
      status === "active"
        ? "automacoes.ativar"
        : status === "paused"
          ? "automacoes.pausar"
          : status === "archived"
            ? "automacoes.arquivar"
            : "automacoes.editar";
    if (!elevated(auth) && !hasAutomationPermission(auth.permissions, need)) {
      throw new Error(`Sem permissão: ${need}`);
    }
    const { schemaReady, client } = await withProbe(auth);
    const rule = await updateRuleStatus({
      tenantId: auth.tenant.id,
      ruleId,
      status,
      userId: auth.profile.id,
      schemaReady,
      client,
    });
    return { success: true as const, rule };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Falha ao atualizar status.",
    };
  }
}

export async function dryRunAutomationAction(
  tenantSlug: string,
  ruleId: string,
) {
  try {
    const auth = await requireAutomacoesAccess(tenantSlug);
    if (
      !elevated(auth) &&
      !hasAutomationPermission(auth.permissions, "automacoes.simular")
    ) {
      throw new Error("Sem permissão: automacoes.simular");
    }
    const { schemaReady, client } = await withProbe(auth);
    let triggerType: string = "fin.conta_vencida";
    if (schemaReady) {
      const rule = await dbGetRule(client, auth.tenant.id, ruleId);
      if (!rule) throw new Error("Regra não encontrada.");
      triggerType = rule.triggerType;
    } else {
      const { memoryGetRule } = await import("./memory-store.ts");
      const rule = memoryGetRule(auth.tenant.id, ruleId);
      if (!rule) throw new Error("Regra não encontrada.");
      triggerType = rule.triggerType;
    }
    const result = await dryRunRule({
      tenantId: auth.tenant.id,
      ruleId,
      userId: auth.profile.id,
      ctx: sampleCtx(auth.tenant.id, triggerType),
      schemaReady,
      client,
    });
    return { success: true as const, ...result };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Falha no dry-run.",
    };
  }
}

export async function requestAutomationApprovalAction(
  tenantSlug: string,
  ruleId: string,
) {
  try {
    const auth = await requireAutomacoesAccess(tenantSlug);
    const { schemaReady, client } = await withProbe(auth);
    const rule = schemaReady
      ? await dbGetRule(client, auth.tenant.id, ruleId)
      : null;
    if (!rule && schemaReady) throw new Error("Regra não encontrada.");
    const approval = await requestExecutionApproval({
      tenantId: auth.tenant.id,
      ruleId,
      userId: auth.profile.id,
      ctx: sampleCtx(auth.tenant.id, rule?.triggerType ?? "fin.conta_vencida"),
      schemaReady,
      client,
      tenantSlug,
    });
    return { success: true as const, approval };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Falha na aprovação.",
    };
  }
}

export async function decideAutomationApprovalAction(
  tenantSlug: string,
  approvalId: string,
  decision: "approved" | "rejected" | "returned" | "cancelled",
  justification?: string,
) {
  try {
    const auth = await requireAutomacoesAccess(tenantSlug);
    if (
      !elevated(auth) &&
      !hasAutomationPermission(auth.permissions, "automacoes.aprovar")
    ) {
      throw new Error("Sem permissão: automacoes.aprovar");
    }
    const { schemaReady, client } = await withProbe(auth);
    const decided = await decideAutomationApproval({
      tenantId: auth.tenant.id,
      approvalId,
      actorUserId: auth.profile.id,
      decision,
      justification,
      allowSelfApproval: elevated(auth),
      ctx: sampleCtx(auth.tenant.id, "fin.conta_vencida"),
      schemaReady,
      client,
    });
    return { success: true as const, approval: decided };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Falha ao decidir.",
    };
  }
}

export async function duplicateAutomationRuleAction(
  tenantSlug: string,
  ruleId: string,
) {
  try {
    const auth = await requireAutomacoesAccess(tenantSlug);
    const { schemaReady, client } = await withProbe(auth);
    const rule = await duplicateRule({
      tenantId: auth.tenant.id,
      ruleId,
      userId: auth.profile.id,
      schemaReady,
      client,
      namePrefix: QA_PREFIX,
    });
    return { success: true as const, rule };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Falha ao duplicar.",
    };
  }
}

export async function markAutomationNotificationReadAction(
  tenantSlug: string,
  notificationId: string,
) {
  try {
    const auth = await requireAutomacoesAccess(tenantSlug);
    const { schemaReady, client } = await withProbe(auth);
    await markNotificationRead(
      auth.tenant.id,
      notificationId,
      schemaReady,
      client,
    );
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Falha ao marcar lida.",
    };
  }
}

export async function dryRunMandatoryScenariosAction(tenantSlug: string) {
  try {
    const auth = await requireAutomacoesAccess(tenantSlug);
    const { schemaReady, client } = await withProbe(auth);
    const scenarios = [
      "fin.conta_vencida",
      "crm.lead_sem_retorno",
      "crm.oportunidade_parada",
      "ops.os_atrasada",
      "est.estoque_abaixo_minimo",
      "metas.meta_abaixo",
      "compras.compra_atrasada",
    ] as const;

    const results = [];
    for (const trigger of scenarios) {
      const rules = schemaReady
        ? await dbListRules(client, auth.tenant.id)
        : [];
      let rule = rules.find((r) => r.triggerType === trigger);
      if (!rule) {
        const tpl = AUTOMATION_TEMPLATES.find((t) => t.triggerType === trigger);
        if (tpl) {
          rule = await createRuleFromTemplate({
            tenantId: auth.tenant.id,
            templateId: tpl.id,
            userId: auth.profile.id,
            name: `${QA_PREFIX}${tpl.name}`,
            schemaReady,
            client,
          });
        }
      }
      if (!rule) continue;
      const dry = await dryRunRule({
        tenantId: auth.tenant.id,
        ruleId: rule.id,
        userId: auth.profile.id,
        ctx: sampleCtx(auth.tenant.id, trigger),
        schemaReady,
        client,
      });
      results.push({
        trigger,
        ruleId: rule.id,
        matched: dry.dryRun.matched,
        persistedFinalAction: dry.dryRun.persistedFinalAction,
        correlationId: dry.dryRun.correlationId,
        requiresApproval: dry.dryRun.requiresApproval,
      });
    }
    return { success: true as const, results, schemaReady };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Falha nos cenários.",
    };
  }
}

/** Limpa apenas regras QA3071-* do tenant atual. */
export async function cleanupQa3071Action(tenantSlug: string) {
  try {
    const auth = await requireAutomacoesAccess(tenantSlug);
    if (!elevated(auth)) {
      throw new Error("Somente Owner/Admin pode limpar dados QA.");
    }
    const { schemaReady, client } = await withProbe(auth);
    if (!schemaReady) {
      return { success: true as const, deleted: 0, note: "schema ausente" };
    }
    const deleted = await dbDeleteQaRules(client, auth.tenant.id, QA_PREFIX);
    return { success: true as const, deleted };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Falha na limpeza QA.",
    };
  }
}

export async function renameAutomationRuleAction(
  tenantSlug: string,
  ruleId: string,
  name: string,
) {
  try {
    const auth = await requireAutomacoesAccess(tenantSlug);
    if (
      !elevated(auth) &&
      !hasAutomationPermission(auth.permissions, "automacoes.editar")
    ) {
      throw new Error("Sem permissão: automacoes.editar");
    }
    const { schemaReady, client } = await withProbe(auth);
    if (!schemaReady) throw new Error("Schema indisponível para editar.");
    const rule = await dbGetRule(client, auth.tenant.id, ruleId);
    if (!rule) throw new Error("Regra não encontrada.");
    const saved = await dbUpsertRule(client, {
      ...rule,
      name,
      updatedBy: auth.profile.id,
      updatedAt: new Date().toISOString(),
    });
    return { success: true as const, rule: saved };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Falha ao editar.",
    };
  }
}

export async function getAutomationSchemaStatusAction(tenantSlug: string) {
  try {
    const auth = await requireAutomacoesAccess(tenantSlug);
    const probe = await probeAutomationSchema(auth.client);
    return { success: true as const, probe };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Falha no probe.",
    };
  }
}
