/**
 * Versionamento de layout_data — Sprint 13.6
 */

import type { PersistedLayoutData } from "@/lib/dashboard-layout/persistence/types";
import { validateAndNormalizeLayoutData } from "@/lib/dashboard-layout/persistence/layout-validation";

/**
 * Converte payloads antigos/parciais para a forma canônica atual.
 * Nunca lança — retorna null se irrecuperável (caller usa fallback).
 */
export function migrateLayoutData(raw: unknown): PersistedLayoutData | null {
  try {
    return validateAndNormalizeLayoutData(raw);
  } catch {
    return null;
  }
}

export function bumpRecordVersion(current: number): number {
  return Math.max(1, current) + 1;
}
