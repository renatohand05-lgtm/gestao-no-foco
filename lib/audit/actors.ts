/**
 * Sprint 21.2 — Atores de auditoria.
 */

import type { ActorType } from "./types.ts";

export const ACTOR_TYPES = [
  "user",
  "system",
  "service",
  "automation",
  "anonymous",
  "unknown",
] as const satisfies readonly ActorType[];

export type ActorMeta = {
  type: ActorType;
  label: string;
};

export const ACTOR_CATALOG: readonly ActorMeta[] = [
  { type: "user", label: "Usuário" },
  { type: "system", label: "Sistema" },
  { type: "service", label: "Serviço" },
  { type: "automation", label: "Automação" },
  { type: "anonymous", label: "Anônimo" },
  { type: "unknown", label: "Desconhecido" },
] as const;

export function isKnownActorType(value: string): value is ActorType {
  return (ACTOR_TYPES as readonly string[]).includes(value);
}

export function normalizeActorType(
  value: string | null | undefined,
  fallback: ActorType = "unknown",
): ActorType {
  if (value && isKnownActorType(value)) return value;
  return fallback;
}

export function resolveActorType(input: {
  userId?: string | null;
  actorType?: string | null;
}): ActorType {
  if (input.actorType && isKnownActorType(input.actorType)) {
    return input.actorType;
  }
  if (input.userId && input.userId.trim()) return "user";
  return "system";
}
