/**
 * Sprint 22.5.1 — Sessão de assistente de importação, genérica por módulo.
 * Mesmo padrão do `lib/finance/import/finance-import-session.ts` (Sprint 22.5),
 * reaproveitado pelos adapters Vendas / Ordens de Serviço para não duplicar
 * a lógica de sessão em memória.
 */
import type {
  ImportColumnMapping,
  ImportModuleId,
  ImportParseResult,
  ImportPreview,
  ImportReviewRow,
} from "../types/index.ts";

export type ImportWizardSession = {
  id: string;
  tenantId: string;
  userId: string;
  module: ImportModuleId;
  fileName: string;
  parsed: ImportParseResult;
  preview: ImportPreview | null;
  mapping: ImportColumnMapping;
  review: ImportReviewRow[] | null;
  createdAt: string;
};

const sessionsByModule = new Map<ImportModuleId, Map<string, ImportWizardSession>>();

function bucket(module: ImportModuleId) {
  let map = sessionsByModule.get(module);
  if (!map) {
    map = new Map();
    sessionsByModule.set(module, map);
  }
  return map;
}

export function putImportWizardSession(session: ImportWizardSession) {
  const map = bucket(session.module);
  map.set(session.id, session);
  if (map.size > 100) {
    const oldest = [...map.entries()].sort((a, b) =>
      a[1].createdAt.localeCompare(b[1].createdAt),
    )[0];
    if (oldest) map.delete(oldest[0]);
  }
}

export function getImportWizardSession(
  module: ImportModuleId,
  id: string,
  tenantId: string,
): ImportWizardSession | null {
  const s = bucket(module).get(id);
  if (!s || s.tenantId !== tenantId) return null;
  return s;
}

export function newImportWizardSessionId(module: ImportModuleId) {
  return `iws_${module}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
