/**
 * Sprint 21.3 — Registry de definições (por id + versão).
 */

import { definitionKey } from "./definitions.ts";
import { WorkflowNotFoundError } from "./errors.ts";
import { validateWorkflowDefinition } from "./validation.ts";
import type { WorkflowDefinition } from "./types.ts";

export class WorkflowRegistry {
  private readonly byKey = new Map<string, WorkflowDefinition>();
  private readonly activeVersion = new Map<string, string>();

  register(
    definition: WorkflowDefinition,
    options?: { setActive?: boolean },
  ): void {
    const validation = validateWorkflowDefinition(definition);
    if (!validation.valid) {
      throw new Error(validation.issues[0]?.message ?? "Definição inválida.");
    }

    const key = definitionKey(definition.id, definition.version);
    if (this.byKey.has(key)) {
      throw new Error(`Workflow já registrado: ${key}`);
    }

    this.byKey.set(key, definition);
    if (options?.setActive !== false) {
      this.activeVersion.set(definition.id, definition.version);
    } else if (!this.activeVersion.has(definition.id)) {
      this.activeVersion.set(definition.id, definition.version);
    }
  }

  get(id: string, version?: string): WorkflowDefinition | undefined {
    const ver = version ?? this.activeVersion.get(id);
    if (!ver) return undefined;
    return this.byKey.get(definitionKey(id, ver));
  }

  require(id: string, version?: string): WorkflowDefinition {
    const def = this.get(id, version);
    if (!def) {
      throw new WorkflowNotFoundError(
        `Workflow não encontrado: ${id}${version ? `@${version}` : ""}`,
      );
    }
    return def;
  }

  list(): WorkflowDefinition[] {
    return [...this.byKey.values()].sort((a, b) =>
      definitionKey(a.id, a.version).localeCompare(definitionKey(b.id, b.version)),
    );
  }

  listById(id: string): WorkflowDefinition[] {
    return this.list().filter((d) => d.id === id);
  }

  setActiveVersion(id: string, version: string): void {
    const def = this.byKey.get(definitionKey(id, version));
    if (!def) {
      throw new WorkflowNotFoundError(`Versão não encontrada: ${id}@${version}`);
    }
    this.activeVersion.set(id, version);
  }

  getActiveVersion(id: string): string | undefined {
    return this.activeVersion.get(id);
  }

  clear(): void {
    this.byKey.clear();
    this.activeVersion.clear();
  }

  size(): number {
    return this.byKey.size;
  }
}

/** Registry padrão em memória (sem persistência). */
export const workflowRegistry = new WorkflowRegistry();
