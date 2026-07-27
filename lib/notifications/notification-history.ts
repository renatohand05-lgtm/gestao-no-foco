/**
 * Sprint 21.5 — Histórico imutável.
 */

import type { NotificationHistoryEntry } from "./types.ts";

let histSeq = 0;

export function createHistoryEntry(
  partial: Omit<NotificationHistoryEntry, "id"> & { id?: string },
): NotificationHistoryEntry {
  histSeq += 1;
  return {
    id: partial.id ?? `nh_${histSeq}_${Date.now()}`,
    at: partial.at,
    type: partial.type,
    channel: partial.channel ?? null,
    recipientId: partial.recipientId ?? null,
    message: partial.message ?? null,
    metadata: partial.metadata ?? {},
  };
}

export function freezeHistory(
  entries: readonly NotificationHistoryEntry[],
): readonly NotificationHistoryEntry[] {
  return Object.freeze(entries.map((e) => Object.freeze({ ...e })));
}

export function appendHistory(
  entries: readonly NotificationHistoryEntry[],
  entry: Omit<NotificationHistoryEntry, "id"> & { id?: string },
): readonly NotificationHistoryEntry[] {
  return freezeHistory([...entries, createHistoryEntry(entry)]);
}

export function __resetHistorySeqForTests(): void {
  histSeq = 0;
}
