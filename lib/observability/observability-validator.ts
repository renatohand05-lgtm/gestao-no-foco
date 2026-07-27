/**
 * Sprint 21.9 — Validadores Observability.
 */

import type { EnterpriseContext } from "../enterprise/types.ts";
import {
  hasObservabilityReadPermission,
  type ObservabilityAuthorizationSnapshot,
} from "./observability-context.ts";
import {
  OBSERVABILITY_ERROR_CODES,
  ObservabilityError,
} from "./observability-errors.ts";

export function assertObservabilityTenant(context: EnterpriseContext) {
  if (!context.tenantId?.trim()) {
    throw new ObservabilityError(
      "Tenant obrigatório.",
      OBSERVABILITY_ERROR_CODES.TENANT_REQUIRED,
    );
  }
}

export function assertObservabilityActor(context: EnterpriseContext) {
  if (!context.userId?.trim()) {
    throw new ObservabilityError(
      "Ator obrigatório.",
      OBSERVABILITY_ERROR_CODES.ACTOR_REQUIRED,
    );
  }
}

export function assertObservabilityReadPermission(
  snapshot: ObservabilityAuthorizationSnapshot | null | undefined,
  context: EnterpriseContext,
) {
  if (!hasObservabilityReadPermission(snapshot, context)) {
    throw new ObservabilityError(
      "Sem permissão para observabilidade.",
      OBSERVABILITY_ERROR_CODES.PERMISSION_DENIED,
    );
  }
}
