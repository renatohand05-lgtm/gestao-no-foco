/**
 * Sprint 21.6 RC1 — Catálogo de actors Enterprise (sem profiles fictícios).
 */

export const ENTERPRISE_ACTOR_TYPES = [
  "user",
  "system",
  "service",
  "integration",
] as const;

export type EnterpriseActorTypeId = (typeof ENTERPRISE_ACTOR_TYPES)[number];

export const SYSTEM_ACTOR_KEYS = [
  "system",
  "workflow-engine",
  "approval-engine",
  "notification-platform",
  "integration-runner",
  "outbox-processor",
] as const;

export type SystemActorKey = (typeof SYSTEM_ACTOR_KEYS)[number] | string;

export type EnterpriseActorRef = {
  actorType: EnterpriseActorTypeId;
  /** UUID de profile quando actorType = user */
  userId: string | null;
  /** Chave lógica estável quando actor não-humano */
  systemActorKey: string | null;
};

export function isKnownActorType(value: string): value is EnterpriseActorTypeId {
  return (ENTERPRISE_ACTOR_TYPES as readonly string[]).includes(value);
}

export function createUserActor(userId: string): EnterpriseActorRef {
  const id = userId?.trim();
  if (!id) throw new Error("userId obrigatório para actor user.");
  return { actorType: "user", userId: id, systemActorKey: null };
}

export function createSystemActor(
  key: SystemActorKey,
  actorType: Exclude<EnterpriseActorTypeId, "user"> = "system",
): EnterpriseActorRef {
  const k = String(key).trim();
  if (!k) throw new Error("systemActorKey obrigatório para actor não-humano.");
  return { actorType, userId: null, systemActorKey: k };
}

export function validateActorRef(
  actor: EnterpriseActorRef | null | undefined,
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!actor || typeof actor !== "object") {
    return { valid: false, issues: ["Actor ausente."] };
  }
  if (!isKnownActorType(actor.actorType)) {
    issues.push(`actor_type inválido: ${actor.actorType}`);
  }
  if (actor.actorType === "user") {
    if (!actor.userId?.trim()) issues.push("user exige userId/profile.");
    if (actor.systemActorKey) issues.push("user não pode ter systemActorKey.");
  } else if (isKnownActorType(actor.actorType)) {
    if (actor.userId) issues.push("actor não-humano deve ter userId null.");
    if (!actor.systemActorKey?.trim()) {
      issues.push("actor não-humano exige systemActorKey.");
    }
  }
  return { valid: issues.length === 0, issues };
}

export function assertActorRef(actor: EnterpriseActorRef): void {
  const r = validateActorRef(actor);
  if (!r.valid) throw new Error(r.issues.join(" "));
}

export function actorFromEnterpriseContext(input: {
  actorType?: string | null;
  userId?: string | null;
  systemActorKey?: string | null;
  allowSystemActor?: boolean;
}): EnterpriseActorRef {
  const type = (input.actorType as EnterpriseActorTypeId) || "user";
  if (type === "user") {
    return createUserActor(input.userId ?? "");
  }
  return createSystemActor(
    input.systemActorKey ?? "system",
    type === "service" || type === "integration" ? type : "system",
  );
}
