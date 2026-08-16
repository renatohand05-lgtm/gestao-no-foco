/**
 * Sprint 35.2.2 — SERVICE_READY só com capability work_orders.
 */

import { hasCapability } from "../segments/resolve.ts";
import type { ResolvedSegmentContext } from "../segments/types.ts";

export function serviceReadyAllowed(ctx: ResolvedSegmentContext): boolean {
  if (!ctx.usesCapabilityEngine) return true;
  return hasCapability(ctx, "work_orders");
}
