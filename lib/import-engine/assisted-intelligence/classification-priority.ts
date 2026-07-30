/**
 * Sprint 22.7 — Prioridade obrigatória de classificação.
 *
 * 1. regra confirmada pelo tenant
 * 2. perfil de importação
 * 3. regra determinística
 * 4. correspondência histórica
 * 5. provider inteligente
 * 6. revisão humana
 *
 * Provider nunca sobrescreve silenciosamente regra confirmada do tenant.
 */

import { stripDiacritics, normalizeText } from "../parsers/normalize.ts";
import { confidenceBand, clampConfidence, requiresHumanReview } from "./confidence.ts";
import { assessDuplicate, type DuplicateCandidate } from "./duplicates.ts";
import {
  canAutoApplyLearnedRule,
  resolveLearningMaturity,
} from "./learning-maturity.ts";
import type {
  ClassificationDecision,
  ClassifyContext,
  ClassifyRowInput,
  ExplainedSuggestion,
  SuggestionOrigin,
} from "./types.ts";

const ATTRIBUTION =
  "Sugestão baseada em regras e histórico do tenant.";

function norm(s: string): string {
  return stripDiacritics(normalizeText(s)).toLowerCase();
}

function emptySuggestion(origin: SuggestionOrigin): ExplainedSuggestion {
  return {
    value: null,
    confidence: 0,
    band: "unrecognized",
    origin,
    reason: "Sem sugestão nesta camada.",
    signals: [],
    alternatives: [],
    attribution: ATTRIBUTION,
  };
}

function suggestion(
  value: string | null,
  confidence: number,
  origin: SuggestionOrigin,
  reason: string,
  signals: string[],
  alternatives: ExplainedSuggestion["alternatives"] = [],
): ExplainedSuggestion {
  return {
    value,
    confidence: clampConfidence(confidence),
    band: confidenceBand(confidence),
    origin,
    reason,
    signals,
    alternatives,
    attribution: ATTRIBUTION,
  };
}

const DETERMINISTIC_PATTERNS: Array<{
  pattern: string;
  category: string;
  dreGroup: string;
  confidence: number;
}> = [
  { pattern: "aluguel", category: "Ocupação", dreGroup: "Despesas Operacionais", confidence: 0.9 },
  { pattern: "energia", category: "Utilidades", dreGroup: "Despesas Operacionais", confidence: 0.88 },
  { pattern: "salario", category: "Pessoal", dreGroup: "Despesas com Pessoal", confidence: 0.9 },
  { pattern: "inss", category: "Encargos", dreGroup: "Despesas com Pessoal", confidence: 0.87 },
  { pattern: "transferencia", category: "Transferência", dreGroup: "Não operacional", confidence: 0.86 },
  { pattern: "ted ", category: "Transferência", dreGroup: "Não operacional", confidence: 0.84 },
  { pattern: "pix ", category: "Transferência", dreGroup: "Não operacional", confidence: 0.8 },
];

export type ProviderClassifyHint = {
  category?: string | null;
  subcategory?: string | null;
  costCenter?: string | null;
  dreGroup?: string | null;
  counterparty?: string | null;
  isTransfer?: boolean;
  isRecurring?: boolean;
  confidence?: number;
  reason?: string;
  signals?: string[];
};

/**
 * Orquestra a prioridade. `providerHint` só entra se camadas 1–4 não vencerem.
 */
export function classifyWithPriority(
  row: ClassifyRowInput,
  ctx: ClassifyContext = {},
  providerHint?: ProviderClassifyHint | null,
): ClassificationDecision {
  const hay = norm(row.description);
  let winningOrigin: SuggestionOrigin = "human_review";
  let category = emptySuggestion("human_review");
  let subcategory = emptySuggestion("human_review");
  let costCenter = emptySuggestion("human_review");
  let dreGroup = emptySuggestion("human_review");
  let counterparty = emptySuggestion("human_review");
  let isTransfer: ExplainedSuggestion<boolean> = {
    value: false,
    confidence: 0.2,
    band: "unrecognized",
    origin: "human_review",
    reason: "Indeterminado",
    signals: [],
    alternatives: [],
    attribution: ATTRIBUTION,
  };

  // 1. Tenant confirmed rules
  for (const rule of ctx.tenantConfirmedRules ?? []) {
    if (!rule.isActive) continue;
    const hit = rule.patterns.some((p) => hay.includes(norm(p)));
    if (!hit) continue;
    const maturity = rule.maturity ?? resolveLearningMaturity({ hitCount: 1 });
    const apply = canAutoApplyLearnedRule(maturity, rule.confidence) || maturity === "provisional";
    // Mesmo provisória: usa como sugestão com origem tenant (não silenciosa se baixa)
    if (hit) {
      category = suggestion(
        rule.category,
        rule.confidence,
        "tenant_confirmed_rule",
        `Regra confirmada do tenant (maturidade: ${maturity}).`,
        rule.patterns.map((p) => `pattern:${p}`),
      );
      if (rule.subcategory) {
        subcategory = suggestion(rule.subcategory, rule.confidence, "tenant_confirmed_rule", "Da regra do tenant", []);
      }
      if (rule.costCenter) {
        costCenter = suggestion(rule.costCenter, rule.confidence, "tenant_confirmed_rule", "Da regra do tenant", []);
      }
      if (rule.dreGroup) {
        dreGroup = suggestion(rule.dreGroup, rule.confidence, "tenant_confirmed_rule", "Da regra do tenant", []);
      }
      if (rule.counterparty) {
        counterparty = suggestion(rule.counterparty, rule.confidence, "tenant_confirmed_rule", "Da regra do tenant", []);
      }
      winningOrigin = "tenant_confirmed_rule";
      void apply;
      break;
    }
  }

  // 2. Import profile (only if tenant rule did not win)
  if (winningOrigin !== "tenant_confirmed_rule" && ctx.profileHints) {
    const ph = ctx.profileHints;
    if (ph.defaultCategory) {
      category = suggestion(
        ph.defaultCategory,
        0.78,
        "import_profile",
        "Sugestão do perfil de importação do tenant.",
        ["profile:defaultCategory"],
      );
      winningOrigin = "import_profile";
    }
    if (ph.defaultCostCenter) {
      costCenter = suggestion(ph.defaultCostCenter, 0.78, "import_profile", "Perfil de importação", ["profile:cc"]);
    }
    if (ph.defaultDreGroup) {
      dreGroup = suggestion(ph.defaultDreGroup, 0.78, "import_profile", "Perfil de importação", ["profile:dre"]);
    }
  }

  // 3. Deterministic rules
  if (
    winningOrigin !== "tenant_confirmed_rule" &&
    winningOrigin !== "import_profile"
  ) {
    for (const p of DETERMINISTIC_PATTERNS) {
      if (hay.includes(p.pattern)) {
        category = suggestion(
          p.category,
          p.confidence,
          "deterministic_rule",
          `Regra determinística: padrão "${p.pattern}".`,
          [`deterministic:${p.pattern}`],
        );
        dreGroup = suggestion(p.dreGroup, p.confidence, "deterministic_rule", "Regra determinística DRE", [
          `deterministic:${p.pattern}`,
        ]);
        winningOrigin = "deterministic_rule";
        if (p.category === "Transferência") {
          isTransfer = {
            value: true,
            confidence: p.confidence,
            band: confidenceBand(p.confidence),
            origin: "deterministic_rule",
            reason: "Padrão de transferência identificado.",
            signals: [`deterministic:${p.pattern}`],
            alternatives: [],
            attribution: ATTRIBUTION,
          };
        }
        break;
      }
    }
  }

  // 4. Historical match
  if (
    winningOrigin !== "tenant_confirmed_rule" &&
    winningOrigin !== "import_profile" &&
    winningOrigin !== "deterministic_rule"
  ) {
    for (const h of ctx.historicalMatches ?? []) {
      if (hay.includes(norm(h.description).slice(0, 24)) || norm(h.description).includes(hay.slice(0, 24))) {
        category = suggestion(
          h.category,
          h.confidence,
          "historical_match",
          "Correspondência com classificação histórica do tenant.",
          ["historical"],
        );
        winningOrigin = "historical_match";
        break;
      }
    }
  }

  // 5. Intelligent provider — NEVER overrides tenant confirmed
  if (winningOrigin === "human_review" && providerHint?.category) {
    category = suggestion(
      providerHint.category,
      providerHint.confidence ?? 0.7,
      "intelligent_provider",
      providerHint.reason ?? "Sugestão do provider inteligente.",
      providerHint.signals ?? ["provider"],
    );
    if (providerHint.dreGroup) {
      dreGroup = suggestion(
        providerHint.dreGroup,
        providerHint.confidence ?? 0.7,
        "intelligent_provider",
        "Provider — grupo DRE",
        [],
      );
    }
    if (providerHint.costCenter) {
      costCenter = suggestion(
        providerHint.costCenter,
        providerHint.confidence ?? 0.7,
        "intelligent_provider",
        "Provider — centro de custo",
        [],
      );
    }
    if (providerHint.counterparty) {
      counterparty = suggestion(
        providerHint.counterparty,
        providerHint.confidence ?? 0.7,
        "intelligent_provider",
        "Provider — contraparte",
        [],
      );
    }
    if (providerHint.isTransfer != null) {
      isTransfer = {
        value: providerHint.isTransfer,
        confidence: providerHint.confidence ?? 0.7,
        band: confidenceBand(providerHint.confidence ?? 0.7),
        origin: "intelligent_provider",
        reason: "Provider — transferência",
        signals: [],
        alternatives: [],
        attribution: ATTRIBUTION,
      };
    }
    winningOrigin = "intelligent_provider";
  } else if (winningOrigin === "tenant_confirmed_rule" && providerHint?.category) {
    // Provider hint vira alternativa, não sobrescreve
    if (providerHint.category !== category.value) {
      category = {
        ...category,
        alternatives: [
          ...category.alternatives,
          {
            value: providerHint.category,
            confidence: providerHint.confidence ?? 0.6,
            reason: "Alternativa do provider (não aplicada — regra do tenant prevalece).",
          },
        ],
      };
    }
  }

  const existing: DuplicateCandidate[] = (ctx.existingFingerprints ?? []).map((fp) => {
    const [tenantId, account, date, amount, description] = fp.split("|");
    return {
      tenantId: tenantId || row.tenantId,
      account,
      date,
      amount: amount ? Number(amount) : null,
      description,
    };
  });
  const dup = assessDuplicate(
    {
      tenantId: row.tenantId,
      date: row.date,
      amount: row.amount,
      description: row.description,
    },
    existing,
  );

  const overallConfidence = clampConfidence(category.confidence);
  const needsReview =
    requiresHumanReview(overallConfidence) ||
    winningOrigin === "human_review" ||
    winningOrigin === "intelligent_provider" ||
    dup.verdict === "probable_duplicate" ||
    dup.verdict === "possible_repeat" ||
    !category.value;

  return {
    rowNumber: row.rowNumber,
    category,
    subcategory,
    costCenter,
    dreGroup,
    counterparty,
    isTransfer,
    isRecurring: {
      value: providerHint?.isRecurring ?? false,
      confidence: providerHint?.isRecurring ? (providerHint.confidence ?? 0.6) : 0.3,
      band: confidenceBand(providerHint?.isRecurring ? 0.6 : 0.3),
      origin: providerHint?.isRecurring ? "intelligent_provider" : "human_review",
      reason: providerHint?.isRecurring
        ? "Provider sugeriu recorrência."
        : "Recorrência não determinada — revisão humana.",
      signals: [],
      alternatives: [],
      attribution: ATTRIBUTION,
    },
    duplicate: {
      verdict: dup.verdict,
      confidence: dup.confidence,
      signals: dup.signals,
      reason: dup.reason,
    },
    overallConfidence,
    overallBand: confidenceBand(overallConfidence),
    winningOrigin,
    requiresHumanReview: needsReview,
  };
}
