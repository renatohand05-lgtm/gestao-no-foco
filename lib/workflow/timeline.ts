/**
 * Sprint 21.3 — Timeline de histórico de workflow.
 */

import { listHistory } from "./history.ts";
import type { WorkflowHistoryEntry, WorkflowInstance } from "./types.ts";

export type WorkflowTimelineGroup = {
  key: string;
  label: string;
  count: number;
  entries: readonly WorkflowHistoryEntry[];
};

export function groupHistoryByState(
  instance: WorkflowInstance,
): WorkflowTimelineGroup[] {
  const map = new Map<string, WorkflowHistoryEntry[]>();
  for (const entry of listHistory(instance, "asc")) {
    const key = entry.toState;
    const list = map.get(key) ?? [];
    list.push(entry);
    map.set(key, list);
  }
  return [...map.entries()].map(([key, entries]) => ({
    key,
    label: key,
    count: entries.length,
    entries,
  }));
}

export function groupHistoryByActor(
  instance: WorkflowInstance,
): WorkflowTimelineGroup[] {
  const map = new Map<string, WorkflowHistoryEntry[]>();
  for (const entry of listHistory(instance, "asc")) {
    const key = entry.actor.userId ?? entry.actor.type ?? "system";
    const list = map.get(key) ?? [];
    list.push(entry);
    map.set(key, list);
  }
  return [...map.entries()].map(([key, entries]) => ({
    key,
    label: key,
    count: entries.length,
    entries,
  }));
}

export function historyByPeriod(
  instance: WorkflowInstance,
  from?: string | null,
  to?: string | null,
): WorkflowHistoryEntry[] {
  const fromT = from ? new Date(from).getTime() : null;
  const toT = to ? new Date(to).getTime() : null;
  return listHistory(instance, "asc").filter((e) => {
    const t = new Date(e.at).getTime();
    if (fromT != null && !Number.isNaN(fromT) && t < fromT) return false;
    if (toT != null && !Number.isNaN(toT) && t > toT) return false;
    return true;
  });
}

export function historyByTargetState(
  instance: WorkflowInstance,
  stateId: string,
): WorkflowHistoryEntry[] {
  return listHistory(instance, "asc").filter((e) => e.toState === stateId);
}

export function summarizeTimeline(instance: WorkflowInstance): {
  currentState: string;
  status: string;
  transitionCount: number;
  lastEvent: string | null;
  lastAt: string | null;
  steps: number;
} {
  const history = listHistory(instance, "asc");
  const last = history[history.length - 1] ?? null;
  return {
    currentState: instance.currentState,
    status: instance.status,
    transitionCount: instance.transitionCount,
    lastEvent: last?.event ?? null,
    lastAt: last?.at ?? null,
    steps: history.length,
  };
}
