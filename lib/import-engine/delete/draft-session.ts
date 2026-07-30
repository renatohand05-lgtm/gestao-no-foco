/**
 * Sprint 25.4.2 — Limpeza de rascunho / sessão de importação (client).
 * Não toca dados persistidos, preferências legítimas nem regras aprendidas.
 */

export const IMPORT_DRAFT_STORAGE_PREFIXES = [
  "import-draft:",
  "import-wizard:",
  "import-preview:",
  "import-mapping-temp:",
  "catalog-import-draft:",
  "stock-import-draft:",
] as const;

export type ImportDraftState = {
  fileName: string | null;
  preview: unknown | null;
  mapping: unknown | null;
  rows: unknown[] | null;
  errors: unknown[] | null;
  duplicates: unknown[] | null;
  selection: unknown[] | null;
  wizardStep: string | null;
};

export function createEmptyImportDraft(): ImportDraftState {
  return {
    fileName: null,
    preview: null,
    mapping: null,
    rows: null,
    errors: null,
    duplicates: null,
    selection: null,
    wizardStep: null,
  };
}

/** Limpa chaves de session/localStorage relacionadas a rascunho de importação. */
export function clearImportDraftStorage(storage: Storage): number {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const k = storage.key(i);
    if (!k) continue;
    if (
      IMPORT_DRAFT_STORAGE_PREFIXES.some((p) => k.startsWith(p)) ||
      k.includes(":import-run-temp:")
    ) {
      keys.push(k);
    }
  }
  for (const k of keys) storage.removeItem(k);
  return keys.length;
}

export function clearImportDraftEverywhere(input?: {
  sessionStorage?: Storage | null;
  localStorage?: Storage | null;
}): { sessionCleared: number; localCleared: number } {
  const sessionCleared = input?.sessionStorage
    ? clearImportDraftStorage(input.sessionStorage)
    : 0;
  const localCleared = input?.localStorage
    ? clearImportDraftStorage(input.localStorage)
    : 0;
  return { sessionCleared, localCleared };
}

/** Store em memória do wizard — remove sessões do tenant/módulo. */
export function clearWizardSessionsInMemory(
  map: Map<string, unknown>,
  predicate: (key: string) => boolean,
): number {
  let n = 0;
  for (const key of [...map.keys()]) {
    if (predicate(key)) {
      map.delete(key);
      n += 1;
    }
  }
  return n;
}
