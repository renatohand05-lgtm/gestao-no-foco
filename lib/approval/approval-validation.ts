/**
 * Sprint 21.4 — Validação estrutural de definições.
 */

import { isKnownLevelMode } from "./approval-level.ts";
import type {
  ApprovalDefinition,
  ApprovalValidationIssue,
  ApprovalValidationResult,
} from "./types.ts";

function issue(
  code: string,
  message: string,
  path?: string,
): ApprovalValidationIssue {
  return { code, message, path };
}

export function validateApprovalDefinition(
  definition: ApprovalDefinition | null | undefined,
): ApprovalValidationResult {
  const issues: ApprovalValidationIssue[] = [];

  if (!definition || typeof definition !== "object") {
    return {
      valid: false,
      issues: [issue("INVALID_DEFINITION", "Definição ausente ou inválida.")],
    };
  }

  if (!definition.id?.trim()) {
    issues.push(issue("MISSING_ID", "id obrigatório.", "id"));
  }
  if (!definition.version?.trim()) {
    issues.push(issue("MISSING_VERSION", "version obrigatória.", "version"));
  }
  if (!definition.name?.trim()) {
    issues.push(issue("MISSING_NAME", "name obrigatório.", "name"));
  }
  if (!definition.levels || definition.levels.length === 0) {
    issues.push(issue("NO_LEVELS", "É necessário ao menos um nível.", "levels"));
  }

  if (definition.tenantScope === "tenant" && !definition.tenantId?.trim()) {
    issues.push(
      issue("MISSING_TENANT", "Definição tenant-scoped exige tenantId.", "tenantId"),
    );
  }

  if (definition.levels) {
    const seen = new Set<string>();
    for (const level of definition.levels) {
      if (seen.has(level.id)) {
        issues.push(
          issue("DUPLICATE_LEVEL", `Nível duplicado: ${level.id}`, "levels"),
        );
      }
      seen.add(level.id);
      if (!isKnownLevelMode(level.mode)) {
        issues.push(
          issue("INVALID_MODE", `Modo inválido: ${level.mode}`, "levels"),
        );
      }
      if (level.escalateToLevelId && !seen.has(level.escalateToLevelId)) {
        // may reference later — check after loop
      }
    }

    const ids = new Set(definition.levels.map((l) => l.id));
    for (const level of definition.levels) {
      if (
        level.escalateToLevelId &&
        !ids.has(level.escalateToLevelId)
      ) {
        issues.push(
          issue(
            "INVALID_ESCALATION",
            `Escalonamento inválido em ${level.id}`,
            "levels",
          ),
        );
      }
    }

    if (definition.policy?.brackets) {
      for (const b of definition.policy.brackets) {
        for (const lid of b.levelIds ?? []) {
          if (!ids.has(lid)) {
            issues.push(
              issue(
                "BRACKET_LEVEL_MISSING",
                `Alçada ${b.id} referencia nível inexistente ${lid}`,
                "policy",
              ),
            );
          }
        }
      }
    }
  }

  return { valid: issues.length === 0, issues };
}
