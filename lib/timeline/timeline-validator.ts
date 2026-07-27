/**
 * Sprint 21.8 — Validação RBAC / tenant da Timeline.
 */

import type { EnterpriseContext } from "../enterprise/types.ts";
import {
  hasTimelineReadPermission,
  type TimelineAuthorizationSnapshot,
} from "./timeline-context.ts";
import { TIMELINE_ERROR_CODES, TimelineError } from "./timeline-errors.ts";

export function assertTimelineTenant(
  context: EnterpriseContext,
  expectedTenantId?: string | null,
): void {
  if (!context.tenantId?.trim()) {
    throw new TimelineError(
      "tenantId obrigatório.",
      TIMELINE_ERROR_CODES.TENANT_REQUIRED,
    );
  }
  if (expectedTenantId && expectedTenantId !== context.tenantId) {
    throw new TimelineError(
      "Isolamento multi-tenant violado.",
      TIMELINE_ERROR_CODES.PERMISSION_DENIED,
    );
  }
}

export function assertTimelineReadPermission(
  snapshot: TimelineAuthorizationSnapshot | null | undefined,
  context: EnterpriseContext,
): void {
  if (!hasTimelineReadPermission(snapshot, context)) {
    throw new TimelineError(
      "Permissão insuficiente para visualizar a timeline.",
      TIMELINE_ERROR_CODES.PERMISSION_DENIED,
    );
  }
}

export function assertTimelineActor(context: EnterpriseContext): void {
  if (context.actorType === "user" && !context.userId) {
    throw new TimelineError(
      "Sessão ausente.",
      TIMELINE_ERROR_CODES.PERMISSION_DENIED,
    );
  }
}
