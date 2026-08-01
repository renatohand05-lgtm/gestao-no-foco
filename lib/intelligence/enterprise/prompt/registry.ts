/**
 * Fase 27 — Prompt Registry (templates versionados, server-side).
 */

import type {
  IntelligenceIntent,
  PromptTemplate,
} from "../types.ts";

const PROMPTS: PromptTemplate[] = [
  {
    id: "executive_summary",
    name: "Resumo executivo",
    version: "27.2.0",
    intent: "executive_summary",
    systemInstruction:
      "Você é um motor determinístico. Use apenas evidências fornecidas. Não invente números.",
    userTemplate: "Resuma a situação do tenant {{tenantId}} no período {{period}}.",
    requiredContext: ["snapshot", "evidence"],
    outputSchema: "IntelligenceResponse",
    allowedRoles: ["proprietario", "diretor", "admin", "financeiro"],
    providerCapabilities: ["generate", "summarize"],
    maxTokens: 1200,
    temperature: 0,
    active: true,
    changelog: "Fase 27.2 — registro inicial",
  },
  {
    id: "explain_dre",
    name: "Explicar DRE",
    version: "27.2.0",
    intent: "explain_dre",
    systemInstruction:
      "Explique DRE com fontes reais. Diferencie margens. Não invente lucro se indisponível.",
    userTemplate: "Explique o DRE do período {{period}}.",
    requiredContext: ["dre", "evidence"],
    outputSchema: "IntelligenceResponse",
    allowedRoles: ["proprietario", "diretor", "admin", "financeiro"],
    providerCapabilities: ["explain", "structured"],
    maxTokens: 1600,
    temperature: 0,
    active: true,
    changelog: "Fase 27.2",
  },
  {
    id: "analyze_cash_flow",
    name: "Analisar fluxo de caixa",
    version: "27.2.0",
    intent: "analyze_cash_flow",
    systemInstruction: "Analise caixa com projeções somente se houver base. Sem projeção falsa.",
    userTemplate: "Como está o caixa? Horizonte {{horizon}}.",
    requiredContext: ["cash", "evidence"],
    outputSchema: "IntelligenceResponse",
    allowedRoles: ["proprietario", "diretor", "admin", "financeiro"],
    providerCapabilities: ["explain", "structured"],
    maxTokens: 1400,
    temperature: 0,
    active: true,
    changelog: "Fase 27.2",
  },
  {
    id: "daily_brief",
    name: "Briefing diário",
    version: "27.2.0",
    intent: "daily_brief",
    systemInstruction: "Gere briefing com números reais do snapshot. Sem envio automático.",
    userTemplate: "Briefing diário para {{userName}}.",
    requiredContext: ["snapshot"],
    outputSchema: "IntelligenceResponse",
    allowedRoles: ["proprietario", "diretor", "admin"],
    providerCapabilities: ["summarize"],
    maxTokens: 1000,
    temperature: 0,
    active: true,
    changelog: "Fase 27.2",
  },
  {
    id: "natural_language_query",
    name: "Consulta em linguagem natural",
    version: "27.2.0",
    intent: "natural_language_query",
    systemInstruction:
      "Interprete intent. Nunca execute SQL do usuário. Apenas fontes canônicas e RBAC.",
    userTemplate: "{{question}}",
    requiredContext: ["snapshot", "permissions"],
    outputSchema: "IntelligenceResponse",
    allowedRoles: ["*"],
    providerCapabilities: ["classify", "generate"],
    maxTokens: 800,
    temperature: 0,
    active: true,
    changelog: "Fase 27.2",
  },
];

const EXTRA_INTENTS: IntelligenceIntent[] = [
  "identify_risks",
  "identify_opportunities",
  "create_action_plan",
  "compare_branches",
  "explain_metric",
  "summarize_crm",
  "analyze_inventory",
  "analyze_purchases",
  "analyze_sales",
  "analyze_operations",
  "diagnose_margin",
  "analyze_expenses",
];

for (const intent of EXTRA_INTENTS) {
  if (!PROMPTS.some((p) => p.intent === intent)) {
    PROMPTS.push({
      id: intent,
      name: intent,
      version: "27.2.0",
      intent,
      systemInstruction:
        "Use somente evidências. Não invente. Marque indisponível quando faltar fonte.",
      userTemplate: `Intent ${intent} · {{question}}`,
      requiredContext: ["snapshot", "evidence"],
      outputSchema: "IntelligenceResponse",
      allowedRoles: ["*"],
      providerCapabilities: ["generate"],
      maxTokens: 1000,
      temperature: 0,
      active: true,
      changelog: "Fase 27.2 auto-registered",
    });
  }
}

export function getPromptByIntent(intent: IntelligenceIntent): PromptTemplate | undefined {
  return PROMPTS.find((p) => p.intent === intent && p.active);
}

export function listActivePrompts(): PromptTemplate[] {
  return PROMPTS.filter((p) => p.active);
}

export function renderPromptUserTemplate(
  template: PromptTemplate,
  vars: Record<string, string>,
): string {
  return template.userTemplate.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}
