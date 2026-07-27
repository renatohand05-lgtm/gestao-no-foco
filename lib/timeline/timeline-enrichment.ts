/**
 * Sprint 21.8 RC1 — Enrichment opcional de atores (profiles).
 * Profile NÃO é obrigatório — fallback para actorId.
 */

import type { TimelineActor, TimelineEvent } from "./timeline-types.ts";

export type TimelineActorProfile = {
  id: string;
  name: string | null;
  avatar: string | null;
  role: string | null;
};

export type ResolveActorProfile = (
  userId: string,
) => Promise<TimelineActorProfile | null>;

function enrichActor(
  actor: TimelineActor,
  profile: TimelineActorProfile | null | undefined,
): TimelineActor {
  if (!profile) return actor;
  return {
    ...actor,
    name: profile.name ?? actor.name ?? actor.id,
    avatar: profile.avatar ?? actor.avatar,
    type: actor.type,
  };
}

/**
 * Enriquece eventos em lote, evitando N+1 (1 lookup por userId único).
 */
export async function enrichTimelineActors(
  events: readonly TimelineEvent[],
  resolveProfile?: ResolveActorProfile | null,
): Promise<TimelineEvent[]> {
  if (!resolveProfile || events.length === 0) return [...events];

  const ids = [
    ...new Set(
      events
        .map((e) => e.actor.id)
        .filter((id): id is string => Boolean(id && !id.includes(":"))),
    ),
  ];

  const cache = new Map<string, TimelineActorProfile | null>();
  await Promise.all(
    ids.map(async (id) => {
      try {
        cache.set(id, await resolveProfile(id));
      } catch {
        cache.set(id, null);
      }
    }),
  );

  return events.map((event) => {
    const id = event.actor.id;
    if (!id) return event;
    const profile = cache.get(id);
    if (!profile) return event;
    const actor = enrichActor(event.actor, profile);
    return {
      ...event,
      actor,
      actorName: actor.name,
      actorAvatar: actor.avatar,
      metadata: {
        ...event.metadata,
        actorRole: profile.role,
      },
    };
  });
}
