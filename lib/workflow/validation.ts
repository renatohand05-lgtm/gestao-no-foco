/**
 * Sprint 21.3 — Validação estrutural de definições.
 */

import { findState } from "./states.ts";
import type {
  WorkflowDefinition,
  WorkflowValidationIssue,
  WorkflowValidationResult,
} from "./types.ts";

function issue(
  code: string,
  message: string,
  path?: string,
): WorkflowValidationIssue {
  return { code, message, path };
}

export function validateWorkflowDefinition(
  definition: WorkflowDefinition | null | undefined,
): WorkflowValidationResult {
  const issues: WorkflowValidationIssue[] = [];

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

  if (!definition.states || definition.states.length === 0) {
    issues.push(issue("NO_STATES", "É necessário ao menos um estado.", "states"));
  }

  if (!definition.initialState?.trim()) {
    issues.push(
      issue("MISSING_INITIAL", "Estado inicial ausente.", "initialState"),
    );
  } else if (
    definition.states &&
    !findState(definition.states, definition.initialState)
  ) {
    issues.push(
      issue(
        "INITIAL_NOT_FOUND",
        "Estado inicial não existe na lista de estados.",
        "initialState",
      ),
    );
  }

  if (!definition.finalStates || definition.finalStates.length === 0) {
    issues.push(
      issue("MISSING_FINALS", "Estado final ausente.", "finalStates"),
    );
  } else if (definition.states) {
    for (const fid of definition.finalStates) {
      if (!findState(definition.states, fid)) {
        issues.push(
          issue(
            "FINAL_NOT_FOUND",
            `Estado final "${fid}" não existe.`,
            "finalStates",
          ),
        );
      }
    }
  }

  if (definition.tenantScope === "tenant" && !definition.tenantId?.trim()) {
    issues.push(
      issue(
        "MISSING_TENANT",
        "Definição tenant-scoped exige tenantId.",
        "tenantId",
      ),
    );
  }

  // IDs duplicados
  if (definition.states) {
    const seen = new Set<string>();
    for (const s of definition.states) {
      if (seen.has(s.id)) {
        issues.push(
          issue("DUPLICATE_STATE", `Estado duplicado: ${s.id}`, "states"),
        );
      }
      seen.add(s.id);
    }

    const initials = definition.states.filter((s) => s.isInitial);
    if (initials.length > 1) {
      issues.push(
        issue("MULTIPLE_INITIAL", "Múltiplos estados iniciais.", "states"),
      );
    }
  }

  if (definition.transitions) {
    const seenT = new Set<string>();
    for (const t of definition.transitions) {
      if (seenT.has(t.id)) {
        issues.push(
          issue(
            "DUPLICATE_TRANSITION",
            `Transição duplicada: ${t.id}`,
            "transitions",
          ),
        );
      }
      seenT.add(t.id);

      if (!t.event?.trim()) {
        issues.push(
          issue("MISSING_EVENT", `Evento ausente em ${t.id}`, "transitions"),
        );
      }
      if (definition.states && !findState(definition.states, t.from)) {
        issues.push(
          issue(
            "INVALID_FROM",
            `from "${t.from}" inexistente (${t.id})`,
            "transitions",
          ),
        );
      }
      if (definition.states && !findState(definition.states, t.to)) {
        issues.push(
          issue(
            "INVALID_TO",
            `to "${t.to}" inexistente (${t.id})`,
            "transitions",
          ),
        );
      }
    }

    // Eventos duplicados no mesmo from (aviso estrutural — prioridade resolve em runtime)
    const eventKeys = new Map<string, number>();
    for (const t of definition.transitions) {
      const key = `${t.from}::${t.event}`;
      eventKeys.set(key, (eventKeys.get(key) ?? 0) + 1);
    }
    // not an error — engine uses priority; tracked for detectability in tests via issues optional
  }

  // Estados órfãos (nunca alcançáveis a partir do inicial, exceto o próprio inicial)
  if (definition.states && definition.transitions && definition.initialState) {
    const reachable = new Set<string>([definition.initialState]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const t of definition.transitions) {
        if (reachable.has(t.from) && !reachable.has(t.to)) {
          reachable.add(t.to);
          changed = true;
        }
      }
    }
    for (const s of definition.states) {
      if (!reachable.has(s.id)) {
        issues.push(
          issue("ORPHAN_STATE", `Estado órfão: ${s.id}`, "states"),
        );
      }
    }
  }

  // Transições impossíveis: from terminal
  if (definition.states && definition.transitions) {
    for (const t of definition.transitions) {
      const from = findState(definition.states, t.from);
      if (from?.isTerminal) {
        issues.push(
          issue(
            "TRANSITION_FROM_TERMINAL",
            `Transição ${t.id} parte de estado terminal.`,
            "transitions",
          ),
        );
      }
    }
  }

  return { valid: issues.length === 0, issues };
}
