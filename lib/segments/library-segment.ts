import type { ProductSegmentId, ResolvedSegmentContext } from "./types.ts";

/** Tenants sem motor 35.x continuam com a biblioteca da oficina (legado). */
export function librarySegmentForContext(
  ctx: Pick<ResolvedSegmentContext, "usesCapabilityEngine" | "productSegment">,
): ProductSegmentId {
  if (!ctx.usesCapabilityEngine) return "oficina";
  return ctx.productSegment ?? "oficina";
}
