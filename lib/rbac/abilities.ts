/**
 * Sprint 21.1 — Abilities: agregação efetiva de permissões.
 */

import { getPermissionsForRoles } from "./role-permissions.ts";
import type { Ability, UserAuthorizationContext } from "./types.ts";

function normalizeList(
  values: ReadonlyArray<string> | undefined | null,
): string[] {
  if (!values || !Array.isArray(values)) return [];
  const out: string[] = [];
  for (const v of values) {
    if (typeof v !== "string") continue;
    const trimmed = v.trim();
    if (!trimmed) continue;
    out.push(trimmed);
  }
  return out;
}

/**
 * Constrói o conjunto de capacidades do usuário.
 * Não aplica políticas contextuais — isso fica em authorize().
 */
export function createAbility(
  context: UserAuthorizationContext | null | undefined,
): Ability {
  if (!context || typeof context !== "object") {
    return {
      userId: "",
      tenantId: null,
      roles: [],
      granted: new Set(),
      denied: new Set(),
      platformScope: false,
    };
  }

  const roles = [...new Set(normalizeList(context.roles))];
  const additional = normalizeList(context.additionalPermissions);
  const deniedList = normalizeList(context.deniedPermissions);

  const granted = new Set<string>(getPermissionsForRoles(roles));
  for (const p of additional) {
    granted.add(p);
  }

  const denied = new Set<string>(deniedList);

  return {
    userId: typeof context.userId === "string" ? context.userId : "",
    tenantId:
      typeof context.tenantId === "string" && context.tenantId.trim()
        ? context.tenantId.trim()
        : null,
    roles,
    granted,
    denied,
    platformScope: context.platformScope === true,
  };
}

export function abilityAllows(ability: Ability, permission: string): boolean {
  if (ability.denied.has(permission)) return false;
  return ability.granted.has(permission);
}

export function mergeAbilities(abilities: readonly Ability[]): Ability {
  const granted = new Set<string>();
  const denied = new Set<string>();
  const roles = new Set<string>();
  let userId = "";
  let tenantId: string | null = null;
  let platformScope = false;

  for (const a of abilities) {
    if (a.userId) userId = a.userId;
    if (a.tenantId) tenantId = a.tenantId;
    if (a.platformScope) platformScope = true;
    for (const r of a.roles) roles.add(r);
    for (const p of a.granted) granted.add(p);
    for (const p of a.denied) denied.add(p);
  }

  return {
    userId,
    tenantId,
    roles: [...roles],
    granted,
    denied,
    platformScope,
  };
}
