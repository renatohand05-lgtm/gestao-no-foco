/**
 * Sprint 22.6 — Aprendizado por confirmação do utilizador (sem IA generativa).
 * Quando o utilizador confirma ou edita a classificação de uma linha, a regra
 * aprendida fica disponível para futuras importações do mesmo tenant/módulo,
 * com prioridade sobre o motor de regras estático (`classification/`).
 */
import { normalizeText, stripDiacritics } from "../parsers/normalize.ts";
import type { ImportLearningRule } from "../types/index.ts";

export type UpsertLearningRuleInput = {
  tenantId: string;
  module: string;
  description: string;
  category: string;
  subcategory?: string | null;
  costCenter?: string | null;
  dreGroup?: string | null;
  supplier?: string | null;
  userId?: string | null;
};

export interface ImportLearningStore {
  list(tenantId: string, module: string): Promise<ImportLearningRule[]>;
  upsertFromConfirmation(
    input: UpsertLearningRuleInput,
  ): Promise<ImportLearningRule>;
  findMatches(
    tenantId: string,
    module: string,
    description: string,
  ): Promise<ImportLearningRule[]>;
}

/** Normaliza para comparação (minúsculas, sem acentos, espaços colapsados). */
function normalizeForMatch(value: string): string {
  return stripDiacritics(normalizeText(value)).toLowerCase();
}

/**
 * Chave de deduplicação da regra: fingerprint da descrição confirmada
 * (sem acentos, minúsculas, primeiros 80 caracteres).
 */
export function fingerprintDescription(description: string): string {
  return normalizeForMatch(description).slice(0, 80);
}

/** Tokens relevantes da descrição (usados como padrões de correspondência parcial). */
function significantTokens(description: string): string[] {
  return normalizeForMatch(description)
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length >= 4);
}

export function buildLearningPatterns(description: string): string[] {
  const key = fingerprintDescription(description);
  const tokens = significantTokens(description);
  return Array.from(new Set([key, ...tokens])).slice(0, 8);
}

/** Usado tanto pela store em memória quanto pelo adapter Supabase. */
export function matchLearningRules(
  rules: ImportLearningRule[],
  description: string,
): ImportLearningRule[] {
  const hay = normalizeForMatch(description);
  if (!hay) return [];
  return rules
    .filter((rule) => rule.isActive)
    .filter((rule) => rule.patterns.some((p) => hay.includes(String(p).toLowerCase())))
    .sort((a, b) => b.confidence - a.confidence || b.hitCount - a.hitCount);
}

export class MemoryImportLearningStore implements ImportLearningStore {
  private rules: ImportLearningRule[] = [];

  async list(tenantId: string, module: string) {
    return this.rules
      .filter((r) => r.tenantId === tenantId && r.module === module && r.isActive)
      .sort((a, b) => b.confidence - a.confidence || b.hitCount - a.hitCount);
  }

  async upsertFromConfirmation(input: UpsertLearningRuleInput) {
    const ruleKey = fingerprintDescription(input.description);
    const patterns = buildLearningPatterns(input.description);
    const now = new Date().toISOString();
    const idx = this.rules.findIndex(
      (r) => r.tenantId === input.tenantId && r.module === input.module && r.ruleKey === ruleKey,
    );

    if (idx >= 0) {
      const existing = this.rules[idx];
      const changed = existing.categorySuggested !== input.category;
      const updated: ImportLearningRule = {
        ...existing,
        patterns,
        categorySuggested: input.category,
        subcategorySuggested: input.subcategory ?? existing.subcategorySuggested ?? null,
        costCenterSuggested: input.costCenter ?? existing.costCenterSuggested ?? null,
        dreGroupSuggested: input.dreGroup ?? existing.dreGroupSuggested ?? null,
        supplierSuggested: input.supplier ?? existing.supplierSuggested ?? null,
        confidence: Math.min(0.99, existing.confidence + 0.01),
        reason: changed
          ? "Regra ajustada por edição do utilizador"
          : "Reforçada por confirmação do utilizador",
        source: changed ? "user_edit" : "user_confirm",
        hitCount: existing.hitCount + 1,
        isActive: true,
        updatedAt: now,
      };
      this.rules[idx] = updated;
      return updated;
    }

    const created: ImportLearningRule = {
      id: `lrn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId: input.tenantId,
      module: input.module,
      ruleKey,
      patterns,
      categorySuggested: input.category,
      subcategorySuggested: input.subcategory ?? null,
      costCenterSuggested: input.costCenter ?? null,
      dreGroupSuggested: input.dreGroup ?? null,
      supplierSuggested: input.supplier ?? null,
      confidence: 0.97,
      reason: "Aprendido por confirmação do utilizador",
      source: "user_confirm",
      hitCount: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this.rules.push(created);
    return created;
  }

  async findMatches(tenantId: string, module: string, description: string) {
    const rules = await this.list(tenantId, module);
    return matchLearningRules(rules, description);
  }
}

let singleton: MemoryImportLearningStore | null = null;

export function getGlobalMemoryLearningStore() {
  if (!singleton) singleton = new MemoryImportLearningStore();
  return singleton;
}
