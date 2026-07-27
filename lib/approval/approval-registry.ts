/**
 * Sprint 21.4 — Registry de definições de aprovação.
 */

import { definitionKey } from "./approval-definition.ts";
import { ApprovalNotFoundError } from "./approval-errors.ts";
import { validateApprovalDefinition } from "./approval-validation.ts";
import type { ApprovalDefinition } from "./types.ts";

export class ApprovalRegistry {
  private readonly byKey = new Map<string, ApprovalDefinition>();
  private readonly activeVersion = new Map<string, string>();

  register(
    definition: ApprovalDefinition,
    options?: { setActive?: boolean },
  ): void {
    const validation = validateApprovalDefinition(definition);
    if (!validation.valid) {
      throw new Error(validation.issues[0]?.message ?? "Definição inválida.");
    }
    const key = definitionKey(definition.id, definition.version);
    if (this.byKey.has(key)) {
      throw new Error(`Aprovação já registrada: ${key}`);
    }
    this.byKey.set(key, definition);
    if (options?.setActive !== false) {
      this.activeVersion.set(definition.id, definition.version);
    } else if (!this.activeVersion.has(definition.id)) {
      this.activeVersion.set(definition.id, definition.version);
    }
  }

  get(id: string, version?: string): ApprovalDefinition | undefined {
    const ver = version ?? this.activeVersion.get(id);
    if (!ver) return undefined;
    return this.byKey.get(definitionKey(id, ver));
  }

  require(id: string, version?: string): ApprovalDefinition {
    const def = this.get(id, version);
    if (!def) {
      throw new ApprovalNotFoundError(
        `Aprovação não encontrada: ${id}${version ? `@${version}` : ""}`,
      );
    }
    return def;
  }

  list(): ApprovalDefinition[] {
    return [...this.byKey.values()].sort((a, b) =>
      definitionKey(a.id, a.version).localeCompare(
        definitionKey(b.id, b.version),
      ),
    );
  }

  setActiveVersion(id: string, version: string): void {
    if (!this.byKey.has(definitionKey(id, version))) {
      throw new ApprovalNotFoundError(`Versão não encontrada: ${id}@${version}`);
    }
    this.activeVersion.set(id, version);
  }

  clear(): void {
    this.byKey.clear();
    this.activeVersion.clear();
  }

  size(): number {
    return this.byKey.size;
  }
}

export const approvalRegistry = new ApprovalRegistry();
