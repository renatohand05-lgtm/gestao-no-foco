/**
 * Sprint 22.6 — Adapter Supabase do aprendizado por tenant (`import_learning_rules`).
 */
import { mapKeysCamelToSnake, mapKeysSnakeToCamel, nowIso } from "../../enterprise/mappers.ts";
import {
  enterpriseFrom,
  throwIfError,
  type EnterpriseSupabaseClient,
} from "../../enterprise/adapters/supabase-helpers.ts";
import {
  buildLearningPatterns,
  fingerprintDescription,
  matchLearningRules,
  type ImportLearningStore,
  type UpsertLearningRuleInput,
} from "../learning/learning-store.ts";
import type { ImportLearningRule } from "../types/index.ts";

export function createSupabaseLearningStore(
  client: EnterpriseSupabaseClient,
): ImportLearningStore {
  return {
    async list(tenantId, module) {
      const { data, error } = await enterpriseFrom(client, "import_learning_rules")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("module", module)
        .eq("is_active", true)
        .order("confidence", { ascending: false });
      throwIfError(error, "import.learning.list");
      return (data ?? []).map((r: Record<string, unknown>) =>
        mapKeysSnakeToCamel<ImportLearningRule>(r),
      );
    },

    async upsertFromConfirmation(input: UpsertLearningRuleInput) {
      const ruleKey = fingerprintDescription(input.description);
      const patterns = buildLearningPatterns(input.description);
      const now = nowIso();

      const { data: existing, error: findError } = await enterpriseFrom(
        client,
        "import_learning_rules",
      )
        .select("*")
        .eq("tenant_id", input.tenantId)
        .eq("module", input.module)
        .eq("rule_key", ruleKey)
        .maybeSingle();
      throwIfError(findError, "import.learning.upsert.find");

      if (existing) {
        const changed = existing.category_suggested !== input.category;
        const row = mapKeysCamelToSnake({
          patterns,
          categorySuggested: input.category,
          subcategorySuggested: input.subcategory ?? existing.subcategory_suggested ?? null,
          costCenterSuggested: input.costCenter ?? existing.cost_center_suggested ?? null,
          dreGroupSuggested: input.dreGroup ?? existing.dre_group_suggested ?? null,
          supplierSuggested: input.supplier ?? existing.supplier_suggested ?? null,
          confidence: Math.min(0.99, Number(existing.confidence ?? 0.9) + 0.01),
          reason: changed
            ? "Regra ajustada por edição do utilizador"
            : "Reforçada por confirmação do utilizador",
          source: changed ? "user_edit" : "user_confirm",
          hitCount: Number(existing.hit_count ?? 0) + 1,
          isActive: true,
          updatedBy: input.userId ?? null,
          updatedAt: now,
        });
        const { data, error } = await enterpriseFrom(client, "import_learning_rules")
          .update(row)
          .eq("tenant_id", input.tenantId)
          .eq("id", existing.id)
          .select("*")
          .single();
        throwIfError(error, "import.learning.upsert.update");
        return mapKeysSnakeToCamel<ImportLearningRule>(data);
      }

      const row = mapKeysCamelToSnake({
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
        createdBy: input.userId ?? null,
        updatedBy: input.userId ?? null,
      });
      const { data, error } = await enterpriseFrom(client, "import_learning_rules")
        .insert(row)
        .select("*")
        .single();
      throwIfError(error, "import.learning.upsert.insert");
      return mapKeysSnakeToCamel<ImportLearningRule>(data);
    },

    async findMatches(tenantId, module, description) {
      const rules = await this.list(tenantId, module);
      return matchLearningRules(rules, description);
    },
  };
}
