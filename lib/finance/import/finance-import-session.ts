/**
 * Sessões de importação em memória (Fase 1).
 * Persistência durável (Supabase) fica para fase seguinte.
 */

import type {
  ImportColumnMapping,
  ImportParseResult,
  ImportPreview,
  ImportReviewRow,
} from "@/lib/import-engine";

export type FinanceImportSession = {
  id: string;
  tenantId: string;
  userId: string;
  fileName: string;
  parsed: ImportParseResult;
  preview: ImportPreview | null;
  mapping: ImportColumnMapping;
  review: ImportReviewRow[] | null;
  createdAt: string;
};

const sessions = new Map<string, FinanceImportSession>();

export function putFinanceImportSession(session: FinanceImportSession) {
  sessions.set(session.id, session);
  // GC simples
  if (sessions.size > 100) {
    const oldest = [...sessions.entries()].sort((a, b) =>
      a[1].createdAt.localeCompare(b[1].createdAt),
    )[0];
    if (oldest) sessions.delete(oldest[0]);
  }
}

export function getFinanceImportSession(
  id: string,
  tenantId: string,
): FinanceImportSession | null {
  const s = sessions.get(id);
  if (!s || s.tenantId !== tenantId) return null;
  return s;
}

export function newSessionId() {
  return `fis_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
