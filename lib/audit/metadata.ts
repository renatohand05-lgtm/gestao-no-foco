/**
 * Sprint 21.2 — Normalização de metadata de auditoria.
 */

import type { AuditMetadata, AuditMetadataValue } from "./types.ts";

const MAX_DEPTH = 4;
const MAX_KEYS = 50;
const MAX_STRING = 2000;

function sanitizeValue(
  value: unknown,
  depth: number,
): AuditMetadataValue | undefined {
  if (depth > MAX_DEPTH) return null;
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string") {
    return value.length > MAX_STRING ? value.slice(0, MAX_STRING) : value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    const out: AuditMetadataValue[] = [];
    for (const item of value.slice(0, MAX_KEYS)) {
      const v = sanitizeValue(item, depth + 1);
      if (v !== undefined) out.push(v);
    }
    return out;
  }
  if (typeof value === "object") {
    return normalizeMetadata(value as Record<string, unknown>, depth + 1);
  }
  return String(value).slice(0, MAX_STRING);
}

/**
 * Remove undefined, limita profundidade/tamanho, produz objeto serializável.
 */
export function normalizeMetadata(
  input: unknown,
  depth = 0,
): AuditMetadata {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  const out: AuditMetadata = {};
  const entries = Object.entries(input as Record<string, unknown>).slice(
    0,
    MAX_KEYS,
  );

  for (const [rawKey, rawValue] of entries) {
    if (typeof rawKey !== "string") continue;
    const key = rawKey.trim().slice(0, 64);
    if (!key) continue;
    const value = sanitizeValue(rawValue, depth);
    if (value === undefined) continue;
    out[key] = value;
  }

  return out;
}

export function isEmptyMetadata(metadata: AuditMetadata | null | undefined): boolean {
  if (!metadata) return true;
  return Object.keys(metadata).length === 0;
}

export function mergeMetadata(
  base: AuditMetadata | null | undefined,
  extra: AuditMetadata | null | undefined,
): AuditMetadata {
  return normalizeMetadata({
    ...(base ?? {}),
    ...(extra ?? {}),
  });
}
