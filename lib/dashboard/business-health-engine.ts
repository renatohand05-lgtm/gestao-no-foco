/**
 * Business Health Engine — Gate 20.2
 *
 * Interpreta indicadores já calculados pelo Decision Engine / IA Executiva (18.5).
 * Não cria métricas · não altera fórmulas · sem I/O · sem LLM · sem mocks.
 */

import { EXECUTIVE_AI_MODULE_LABEL } from "../ai/executive-ai-summary.ts";
import { EXECUTIVE_AI_MODULE_WEIGHTS } from "../ai/executive-ai-types.ts";
import type {
  ExecutiveAiDiagnostic,
  ExecutiveAiModule,
  ExecutiveAiModuleScore,
  ExecutiveAiRecommendation,
  ExecutiveAiResult,
} from "../ai/executive-ai-types.ts";

/** Status oficial Business Health (faixas Gate 20.2). */
export type BusinessHealthStatus =
  | "excelente"
  | "saudavel"
  | "atencao"
  | "critico"
  | "indisponivel";

export type BusinessHealthConfidenceLevel = "alta" | "media" | "baixa";

export type BusinessHealthModuleKey =
  | "finance"
  | "commercial"
  | "operation"
  | "crm"
  | "inventory";

export type BusinessHealthEvidenceItem = {
  id: string;
  text: string;
  source: string;
};

export type BusinessHealthModuleResult = {
  key: BusinessHealthModuleKey;
  module: ExecutiveAiModule;
  label: string;
  score: number | null;
  status: BusinessHealthStatus;
  statusLabel: string;
  motivos: BusinessHealthEvidenceItem[];
  riscos: BusinessHealthEvidenceItem[];
  oportunidades: BusinessHealthEvidenceItem[];
  coverage: "available" | "partial" | "unavailable";
};

export type BusinessHealthPriorityItem = {
  rank: number;
  id: string;
  title: string;
  reason: string;
  module: ExecutiveAiModule | null;
  moduleLabel: string;
  href?: string;
};

export type BusinessHealthResult = {
  overallScore: number | null;
  overallStatus: BusinessHealthStatus;
  overallStatusLabel: string;
  finance: BusinessHealthModuleResult;
  commercial: BusinessHealthModuleResult;
  operation: BusinessHealthModuleResult;
  crm: BusinessHealthModuleResult;
  inventory: BusinessHealthModuleResult;
  priorities: BusinessHealthPriorityItem[];
  confidence: BusinessHealthConfidenceLevel;
  confidenceLabel: string;
  /** Cobertura numérica herdada do Decision Engine (0–100). */
  coveragePct: number;
  modulesAvailable: number;
  generatedAt: string;
  engineVersion: string;
};

export const BUSINESS_HEALTH_ENGINE_VERSION = "20.2.0";

export const BUSINESS_HEALTH_STATUS_LABEL: Record<BusinessHealthStatus, string> =
  {
    excelente: "Excelente",
    saudavel: "Saudável",
    atencao: "Atenção",
    critico: "Crítico",
    indisponivel: "Indisponível",
  };

export const BUSINESS_HEALTH_CONFIDENCE_LABEL: Record<
  BusinessHealthConfidenceLevel,
  string
> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

/** Faixas oficiais: 90–100 / 80–89 / 65–79 / 0–64. */
export function classifyBusinessHealthStatus(
  score: number | null,
): BusinessHealthStatus {
  if (score == null || !Number.isFinite(score)) return "indisponivel";
  const n = Math.round(score);
  if (n >= 90) return "excelente";
  if (n >= 80) return "saudavel";
  if (n >= 65) return "atencao";
  return "critico";
}

const MODULE_TO_KEY: Record<ExecutiveAiModule, BusinessHealthModuleKey> = {
  financeiro: "finance",
  comercial: "commercial",
  operacao: "operation",
  crm: "crm",
  estoque: "inventory",
};

const KEY_TO_MODULE: Record<BusinessHealthModuleKey, ExecutiveAiModule> = {
  finance: "financeiro",
  commercial: "comercial",
  operation: "operacao",
  crm: "crm",
  inventory: "estoque",
};

const MAX_MOTIVOS = 3;
const MAX_RISCOS = 3;
const MAX_OPORTUNIDADES = 3;
const MAX_PRIORITIES = 5;

function findModuleScore(
  modules: ExecutiveAiModuleScore[],
  module: ExecutiveAiModule,
): ExecutiveAiModuleScore {
  const found = modules.find((m) => m.module === module);
  if (found) return found;
  return {
    module,
    score: null,
    status: "unavailable",
    weight: EXECUTIVE_AI_MODULE_WEIGHTS[module],
    effectiveWeight: 0,
    penalties: [],
    bonuses: [],
    notes: ["Módulo sem cobertura no Decision Engine."],
  };
}

function narrativeLead(
  label: string,
  status: BusinessHealthStatus,
  primaryEvidence: string | null,
): string {
  const statusLabel = BUSINESS_HEALTH_STATUS_LABEL[status];
  if (status === "indisponivel") {
    return `${label} indisponível por ausência de cobertura confiável.`;
  }
  if (primaryEvidence) {
    return `${label} em ${statusLabel.toLowerCase()} devido a ${primaryEvidence}`;
  }
  return `${label}: status ${statusLabel.toLowerCase()} com base nos indicadores disponíveis.`;
}

function stripTrailingDot(text: string): string {
  return text.replace(/\.+$/, "").trim();
}

function buildModuleResult(
  ms: ExecutiveAiModuleScore,
  diagnostics: ExecutiveAiDiagnostic[],
): BusinessHealthModuleResult {
  const key = MODULE_TO_KEY[ms.module];
  const label = EXECUTIVE_AI_MODULE_LABEL[ms.module];
  const status = classifyBusinessHealthStatus(ms.score);
  const statusLabel = BUSINESS_HEALTH_STATUS_LABEL[status];

  const moduleDiags = diagnostics.filter((d) => d.module === ms.module);

  const riscos: BusinessHealthEvidenceItem[] = [];
  for (const p of ms.penalties) {
    riscos.push({
      id: `pen:${p.ruleId}`,
      text: p.reason,
      source: p.ruleId,
    });
  }
  for (const d of moduleDiags) {
    if (
      d.severity === "critica" ||
      d.severity === "alta" ||
      d.severity === "media"
    ) {
      riscos.push({
        id: `diag:${d.id}`,
        text: d.title,
        source: d.source,
      });
    }
  }

  const oportunidades: BusinessHealthEvidenceItem[] = [];
  for (const b of ms.bonuses) {
    oportunidades.push({
      id: `bon:${b.ruleId}`,
      text: b.reason,
      source: b.ruleId,
    });
  }
  for (const d of moduleDiags) {
    if (d.severity === "oportunidade") {
      oportunidades.push({
        id: `diag:${d.id}`,
        text: d.title,
        source: d.source,
      });
    }
  }

  const primaryRisk = riscos[0]?.text ?? null;
  const primaryOpp = oportunidades[0]?.text ?? null;
  const primaryEvidence =
    status === "critico" || status === "atencao"
      ? primaryRisk
        ? `${stripTrailingDot(primaryRisk).toLowerCase()}.`
        : null
      : primaryOpp
        ? `${stripTrailingDot(primaryOpp).toLowerCase()}.`
        : primaryRisk
          ? `${stripTrailingDot(primaryRisk).toLowerCase()}.`
          : null;

  const motivos: BusinessHealthEvidenceItem[] = [
    {
      id: `motivo:${ms.module}:lead`,
      text: narrativeLead(label, status, primaryEvidence),
      source: "business-health-engine",
    },
  ];

  for (const note of ms.notes.slice(0, 2)) {
    motivos.push({
      id: `note:${ms.module}:${motivos.length}`,
      text: note,
      source: "module-notes",
    });
  }

  return {
    key,
    module: ms.module,
    label,
    score: ms.score == null ? null : Math.round(ms.score),
    status,
    statusLabel,
    motivos: motivos.slice(0, MAX_MOTIVOS),
    riscos: dedupeEvidence(riscos).slice(0, MAX_RISCOS),
    oportunidades: dedupeEvidence(oportunidades).slice(0, MAX_OPORTUNIDADES),
    coverage: ms.status,
  };
}

function dedupeEvidence(
  items: BusinessHealthEvidenceItem[],
): BusinessHealthEvidenceItem[] {
  const seen = new Set<string>();
  const out: BusinessHealthEvidenceItem[] = [];
  for (const item of items) {
    const key = item.text.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function classifyBusinessHealthConfidence(
  modulesAvailable: number,
  coveragePct: number,
): BusinessHealthConfidenceLevel {
  const cov = Number.isFinite(coveragePct) ? coveragePct : 0;
  if (modulesAvailable >= 4 && cov >= 80) return "alta";
  if (modulesAvailable >= 3 && cov >= 50) return "media";
  return "baixa";
}

function buildPriorities(
  recommendations: ExecutiveAiRecommendation[],
  fallback: ExecutiveAiResult["priority"],
): BusinessHealthPriorityItem[] {
  const sorted = [...recommendations].sort((a, b) => a.priority - b.priority);
  const items: BusinessHealthPriorityItem[] = sorted
    .slice(0, MAX_PRIORITIES)
    .map((r, idx) => ({
      rank: idx + 1,
      id: r.id,
      title: r.action || r.title,
      reason: r.reason,
      module: r.module,
      moduleLabel: EXECUTIVE_AI_MODULE_LABEL[r.module],
      href: r.href,
    }));

  if (items.length === 0 && fallback.title) {
    items.push({
      rank: 1,
      id: fallback.diagnosticId ?? "priority-fallback",
      title: fallback.title,
      reason: fallback.reason,
      module: fallback.module,
      moduleLabel: fallback.module
        ? EXECUTIVE_AI_MODULE_LABEL[fallback.module]
        : "Geral",
      href: fallback.href,
    });
  }

  return items;
}

/**
 * Interpreta `ExecutiveAiResult` → Business Health (determinístico).
 */
export function runBusinessHealthEngine(
  ai: ExecutiveAiResult,
): BusinessHealthResult {
  const modulesAvailable = ai.moduleScores.filter(
    (m) => m.score != null && m.status !== "unavailable",
  ).length;

  const finance = buildModuleResult(
    findModuleScore(ai.moduleScores, "financeiro"),
    ai.diagnostics,
  );
  const commercial = buildModuleResult(
    findModuleScore(ai.moduleScores, "comercial"),
    ai.diagnostics,
  );
  const operation = buildModuleResult(
    findModuleScore(ai.moduleScores, "operacao"),
    ai.diagnostics,
  );
  const crm = buildModuleResult(
    findModuleScore(ai.moduleScores, "crm"),
    ai.diagnostics,
  );
  const inventory = buildModuleResult(
    findModuleScore(ai.moduleScores, "estoque"),
    ai.diagnostics,
  );

  const overallScore =
    ai.executiveScore == null ? null : Math.round(ai.executiveScore);
  const overallStatus = classifyBusinessHealthStatus(overallScore);
  const confidence = classifyBusinessHealthConfidence(
    modulesAvailable,
    ai.confidence,
  );

  return {
    overallScore,
    overallStatus,
    overallStatusLabel: BUSINESS_HEALTH_STATUS_LABEL[overallStatus],
    finance,
    commercial,
    operation,
    crm,
    inventory,
    priorities: buildPriorities(ai.recommendations, ai.priority),
    confidence,
    confidenceLabel: BUSINESS_HEALTH_CONFIDENCE_LABEL[confidence],
    coveragePct: Number.isFinite(ai.confidence) ? Math.round(ai.confidence) : 0,
    modulesAvailable,
    generatedAt: ai.generatedAt,
    engineVersion: BUSINESS_HEALTH_ENGINE_VERSION,
  };
}

/** API nomeada Gate 20.2. */
export const BusinessHealthEngine = {
  version: BUSINESS_HEALTH_ENGINE_VERSION,
  run: runBusinessHealthEngine,
  classifyStatus: classifyBusinessHealthStatus,
  classifyConfidence: classifyBusinessHealthConfidence,
  moduleKey: MODULE_TO_KEY,
  keyToModule: KEY_TO_MODULE,
} as const;

export type { ExecutiveAiResult as BusinessHealthEngineInput };
