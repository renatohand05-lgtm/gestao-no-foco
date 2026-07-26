/**
 * Sprint 21.3 — Histórico imutável de workflow.
 */

import type { WorkflowHistoryEntry, WorkflowInstance } from "./types.ts";

export function appendHistory(
  instance: WorkflowInstance,
  entry: Omit<WorkflowHistoryEntry, "id"> & { id?: string },
): WorkflowInstance {
  const id =
    entry.id ??
    `wfh_${instance.id}_${instance.history.length + 1}_${Date.now()}`;

  const nextEntry: WorkflowHistoryEntry = {
    id,
    at: entry.at,
    fromState: entry.fromState,
    toState: entry.toState,
    event: entry.event,
    transitionId: entry.transitionId,
    actor: {
      userId: entry.actor.userId,
      roles: [...entry.actor.roles],
      permissions: [...entry.actor.permissions],
      type: entry.actor.type,
    },
    reason: entry.reason,
    metadata: { ...(entry.metadata ?? {}) },
  };

  return {
    ...instance,
    history: [...instance.history, nextEntry],
  };
}

export function listHistory(
  instance: WorkflowInstance,
  direction: "asc" | "desc" = "asc",
): WorkflowHistoryEntry[] {
  const list = [...instance.history];
  list.sort((a, b) => {
    const ta = new Date(a.at).getTime();
    const tb = new Date(b.at).getTime();
    if (ta !== tb) return ta - tb;
    return a.id.localeCompare(b.id);
  });
  return direction === "desc" ? list.reverse() : list;
}

/** Garante que o array de histórico não é mutado in-place pelo consumidor. */
export function freezeHistory(
  entries: readonly WorkflowHistoryEntry[],
): readonly WorkflowHistoryEntry[] {
  return Object.freeze(entries.map((e) => Object.freeze({ ...e })));
}
