"use server";

import {
  runExecutiveCopilot,
  submitIntelligenceFeedback,
  getIntelligenceFeatureFlags,
  providerGatewayHealth,
  type IntelligenceFeedback,
  type IntelligenceResponse,
} from "./index.ts";
import { newCorrelationId } from "./provider/gateway.ts";
import { loadLiveIntelligenceContext } from "./adapters/live-context.ts";
import { probeIntelligenceSchema } from "./persistence/schema.ts";
import {
  createIntelligenceSession,
  insertIntelligenceAuditEvent,
  insertIntelligenceEvidenceRows,
  insertIntelligenceFeedbackRow,
  insertIntelligenceMessage,
  listIntelligenceAuditEvents,
  listIntelligenceSessions,
  listIntelligenceMessages,
  listEvidenceForMessage,
  archiveIntelligenceSession,
  softDeleteIntelligenceSession,
  insertActionPlanRow,
  insertAutomationDraftRow,
} from "./persistence/repositories.ts";
import { createClient } from "@/lib/supabase/server";
import { recordIntelligenceAudit } from "./audit/recorder.ts";

export type AskIntelligenceResult = IntelligenceResponse & {
  persistence: {
    ready: boolean;
    message: string;
    sessionId?: string | null;
    messageId?: string | null;
  };
};

export async function askIntelligenceAction(input: {
  tenantId: string;
  tenantSlug: string;
  userId: string;
  permissions: string[];
  question: string;
  sessionId?: string | null;
}): Promise<AskIntelligenceResult> {
  const correlationId = newCorrelationId(input.userId);
  const live = await loadLiveIntelligenceContext({
    tenantId: input.tenantId,
    tenantSlug: input.tenantSlug,
    permissions: input.permissions,
  });

  const response = await runExecutiveCopilot({
    request: {
      tenantId: input.tenantId,
      userId: input.userId,
      permissions: input.permissions,
      module: "inteligencia",
      intent: "natural_language_query",
      question: input.question,
      correlationId,
      requestedMode: "deterministic",
    },
    metrics: live.metrics,
    slug: input.tenantSlug,
    extraMissingSources: live.missingSources,
    coverageNotes: live.coverageNotes,
  });

  // Audit in-process (test memory only unless env); always try persist
  const auditEvent = recordIntelligenceAudit({
    correlationId,
    userId: input.userId,
    tenantId: input.tenantId,
    module: "inteligencia",
    intent: "natural_language_query",
    mode: response.mode,
    providerId: response.provider.id,
    model: response.model,
    confidenceLevel: response.confidence.level,
    limitations: response.limitations,
    sources: live.sourcesUsed,
    answer: response.answer,
    recommendationCount: response.recommendations.length,
    latencyMs: response.latencyMs,
    status: response.status,
  });

  const persistence = {
    ready: false,
    message: "Persistência não verificada",
    sessionId: null as string | null,
    messageId: null as string | null,
  };

  try {
    const client = await createClient();
    const probe = await probeIntelligenceSchema(client);
    persistence.ready = probe.ready;
    persistence.message = probe.message;

    if (probe.ready) {
      let sessionId = input.sessionId ?? null;
      if (!sessionId) {
        const session = await createIntelligenceSession(client, {
          tenantId: input.tenantId,
          userId: input.userId,
          mode: response.mode,
          provider: response.provider.id,
          model: response.model,
          title: input.question.slice(0, 120),
          context: {
            sourcesUsed: live.sourcesUsed,
            missingSources: live.missingSources,
          },
        });
        if (session.ok) sessionId = session.data.id;
      }
      if (sessionId) {
        await insertIntelligenceMessage(client, {
          sessionId,
          tenantId: input.tenantId,
          userId: input.userId,
          role: "user",
          content: input.question,
          intent: "natural_language_query",
          mode: response.mode,
          correlationId,
        });
        const assistant = await insertIntelligenceMessage(client, {
          id: response.id,
          sessionId,
          tenantId: input.tenantId,
          userId: input.userId,
          role: "assistant",
          content: response.answer,
          intent: "natural_language_query",
          mode: response.mode,
          provider: response.provider.id,
          model: response.model,
          confidenceLevel: response.confidence.level,
          confidenceScore: response.confidence.score,
          correlationId,
          latencyMs: response.latencyMs,
          structuredOutput: {
            summary: response.summary,
            limitations: response.limitations,
            status: response.status,
          },
        });
        if (assistant.ok) {
          persistence.messageId = assistant.data.id;
          await insertIntelligenceEvidenceRows(
            client,
            input.tenantId,
            assistant.data.id,
            response.evidence.map((e) => ({
              id: e.id,
              source: e.source,
              sourceType: e.sourceType,
              module: e.module,
              entity: e.entity ?? null,
              entityId: e.entityId ?? null,
              metric: e.metric ?? null,
              value: e.value ?? null,
              unit: e.unit ?? null,
              reliability: e.reliability ?? null,
              freshness: e.freshness ?? null,
              calculatedAt: e.calculatedAt ?? null,
              deepLink: e.deepLink ?? null,
              companyId: e.companyId ?? null,
              branchId: e.branchId ?? null,
            })),
          );
        }
        persistence.sessionId = sessionId;
        await insertIntelligenceAuditEvent(client, {
          tenantId: input.tenantId,
          userId: input.userId,
          sessionId,
          messageId: persistence.messageId,
          correlationId,
          eventType: "copilot.ask",
          module: "inteligencia",
          intent: "natural_language_query",
          mode: response.mode,
          provider: response.provider.id,
          model: response.model,
          status: response.status,
          latencyMs: response.latencyMs,
          confidence: response.confidence,
          limitations: response.limitations,
          metadata: {
            auditId: auditEvent.auditId,
            sourcesUsed: live.sourcesUsed,
          },
        });
        if (response.actions.length > 0 && persistence.messageId) {
          const plan = response.actions[0];
          await insertActionPlanRow(client, {
            tenantId: input.tenantId,
            createdBy: input.userId,
            objective: plan.objective,
            steps: plan.steps,
            priority: plan.priority,
            status: plan.status ?? "draft",
            sessionId,
            messageId: persistence.messageId,
            confidence: plan.confidence,
            expectedImpact: plan.expectedImpact,
          });
        }
      }
    } else {
      response.limitations = [
        ...response.limitations,
        probe.message,
        "Histórico/auditoria não foram gravados (schema ausente).",
      ];
    }
  } catch (e) {
    persistence.message =
      e instanceof Error
        ? `Persistência falhou: ${e.message}`
        : "Persistência falhou";
    response.limitations = [
      ...response.limitations,
      persistence.message,
    ];
  }

  return { ...response, auditId: auditEvent.auditId, persistence };
}

export async function submitIntelligenceFeedbackAction(input: {
  tenantId: string;
  userId: string;
  responseId: string;
  rating: IntelligenceFeedback["rating"];
  correlationId: string;
  comment?: string | null;
}) {
  const local = submitIntelligenceFeedback({
    tenantId: input.tenantId,
    userId: input.userId,
    responseId: input.responseId,
    rating: input.rating,
    correlationId: input.correlationId,
    comment: input.comment ?? undefined,
  });

  try {
    const client = await createClient();
    const probe = await probeIntelligenceSchema(client);
    if (!probe.ready) {
      return {
        ...local,
        persisted: false as const,
        message: probe.message,
      };
    }
    const mapRating: Record<string, string> = {
      util: "util",
      nao_util: "nao_util",
      incorreto: "incorreto",
      incompleto: "incompleto",
      desatualizado: "dado_desatualizado",
      irrelevante: "acao_irrelevante",
    };
    const saved = await insertIntelligenceFeedbackRow(client, {
      tenantId: input.tenantId,
      userId: input.userId,
      messageId: input.responseId,
      feedbackType: mapRating[input.rating] ?? "util",
      comment: input.comment ?? null,
      metadata: { correlationId: input.correlationId },
    });
    return {
      ...local,
      persisted: saved.ok,
      message: saved.ok ? "Feedback persistido" : saved.message,
    };
  } catch (e) {
    return {
      ...local,
      persisted: false as const,
      message: e instanceof Error ? e.message : "Falha ao persistir feedback",
    };
  }
}

export async function getIntelligenceConfigAction() {
  const flags = getIntelligenceFeatureFlags();
  const health = await providerGatewayHealth();
  let persistence = {
    ready: false,
    message: "Não verificado",
    missing: [] as string[],
  };
  try {
    const client = await createClient();
    const probe = await probeIntelligenceSchema(client);
    persistence = {
      ready: probe.ready,
      message: probe.message,
      missing: probe.missing,
    };
  } catch (e) {
    persistence.message =
      e instanceof Error ? e.message : "Falha ao sondar schema";
  }
  return {
    flags,
    health,
    persistence,
    providerExternalConfigured: flags.externalProvider === true,
    modeLabel: "Determinístico",
    modeDescription:
      "Análise baseada em dados, regras, métricas e histórico da sua empresa.",
    externalProviderLabel: "Provider externo não configurado",
  };
}

export async function getIntelligenceAuditAction(tenantId: string) {
  try {
    const client = await createClient();
    const result = await listIntelligenceAuditEvents(client, tenantId, 50);
    if (!result.ok) {
      return {
        ready: false as const,
        message: result.message,
        rows: [] as Array<Record<string, unknown>>,
      };
    }
    return {
      ready: true as const,
      message: "Auditoria persistida",
      rows: result.data,
    };
  } catch (e) {
    return {
      ready: false as const,
      message: e instanceof Error ? e.message : "Falha ao carregar auditoria",
      rows: [] as Array<Record<string, unknown>>,
    };
  }
}

export async function getIntelligenceHistoryAction(input: {
  tenantId: string;
  userId: string;
}) {
  try {
    const client = await createClient();
    const result = await listIntelligenceSessions(
      client,
      input.tenantId,
      input.userId,
      50,
    );
    if (!result.ok) {
      return {
        ready: false as const,
        message: result.message,
        sessions: [] as Array<Record<string, unknown>>,
      };
    }
    return {
      ready: true as const,
      message: "Histórico persistido",
      sessions: result.data,
    };
  } catch (e) {
    return {
      ready: false as const,
      message: e instanceof Error ? e.message : "Falha ao carregar histórico",
      sessions: [] as Array<Record<string, unknown>>,
    };
  }
}

export async function getIntelligenceSessionDetailAction(input: {
  tenantId: string;
  userId: string;
  sessionId: string;
}) {
  try {
    const client = await createClient();
    const sessions = await listIntelligenceSessions(
      client,
      input.tenantId,
      input.userId,
      200,
    );
    if (!sessions.ok) {
      return {
        ready: false as const,
        message: sessions.message,
        session: null,
        messages: [] as Array<Record<string, unknown>>,
        evidence: [] as Array<Record<string, unknown>>,
      };
    }
    const session =
      sessions.data.find((s) => String(s.id) === input.sessionId) ?? null;
    if (!session) {
      return {
        ready: true as const,
        message: "Sessão não encontrada neste tenant/usuário",
        session: null,
        messages: [],
        evidence: [],
      };
    }
    const messages = await listIntelligenceMessages(
      client,
      input.tenantId,
      input.sessionId,
    );
    if (!messages.ok) {
      return {
        ready: false as const,
        message: messages.message,
        session,
        messages: [],
        evidence: [],
      };
    }
    const assistantIds = messages.data
      .filter((m) => m.role === "assistant")
      .map((m) => String(m.id));
    const evidenceRows: Array<Record<string, unknown>> = [];
    for (const mid of assistantIds.slice(-5)) {
      const ev = await listEvidenceForMessage(client, input.tenantId, mid);
      if (ev.ok) evidenceRows.push(...ev.data);
    }
    return {
      ready: true as const,
      message: "Sessão reaberta",
      session,
      messages: messages.data,
      evidence: evidenceRows,
    };
  } catch (e) {
    return {
      ready: false as const,
      message: e instanceof Error ? e.message : "Falha ao abrir sessão",
      session: null,
      messages: [] as Array<Record<string, unknown>>,
      evidence: [] as Array<Record<string, unknown>>,
    };
  }
}

export async function archiveIntelligenceSessionAction(input: {
  tenantId: string;
  sessionId: string;
}) {
  const client = await createClient();
  return archiveIntelligenceSession(client, input.tenantId, input.sessionId);
}

export async function softDeleteIntelligenceSessionAction(input: {
  tenantId: string;
  sessionId: string;
}) {
  const client = await createClient();
  return softDeleteIntelligenceSession(client, input.tenantId, input.sessionId);
}

export async function persistIntelligenceActionPlanAction(input: {
  tenantId: string;
  userId: string;
  objective: string;
  steps: unknown;
  priority?: string;
  sessionId?: string | null;
  messageId?: string | null;
}) {
  const client = await createClient();
  return insertActionPlanRow(client, {
    tenantId: input.tenantId,
    createdBy: input.userId,
    objective: input.objective,
    steps: input.steps,
    priority: input.priority ?? "media",
    sessionId: input.sessionId,
    messageId: input.messageId,
    status: "draft",
  });
}

export async function persistIntelligenceAutomationDraftAction(input: {
  tenantId: string;
  userId: string;
  automationType: string;
  title: string;
  description?: string | null;
  triggerDefinition: unknown;
  actionDefinition: unknown;
}) {
  const client = await createClient();
  return insertAutomationDraftRow(client, {
    tenantId: input.tenantId,
    createdBy: input.userId,
    automationType: input.automationType,
    title: input.title,
    description: input.description,
    triggerDefinition: input.triggerDefinition,
    actionDefinition: input.actionDefinition,
  });
}
