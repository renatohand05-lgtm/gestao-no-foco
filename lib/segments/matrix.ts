/**
 * Sprint 35.1 — Matriz módulo × capability × preset × override.
 */
import {
  CAPABILITY_DEFS,
  type CapabilityDef,
  type ModuleStatusReal,
} from "./capabilities.ts";
import { originForCapability } from "./overrides.ts";
import { hasCapability, resolveSegmentContext, type ResolveSegmentInput } from "./resolve.ts";
import type { ProductCapability } from "./capabilities.ts";

export type SegmentModuleRow = {
  capability: ProductCapability;
  module: string;
  description: string;
  defaultOn: boolean;
  currentOn: boolean;
  origin: "segment" | "custom";
  overridable: boolean;
  availability: CapabilityDef["availability"];
  statusReal: ModuleStatusReal;
  navIds: readonly string[];
};

export function listSegmentModuleRows(
  input: ResolveSegmentInput,
): SegmentModuleRow[] {
  const ctx = resolveSegmentContext(input);
  const preset = ctx.profile?.capabilities ?? [];
  const presetSet = new Set(preset);
  return CAPABILITY_DEFS.filter((d) => d.availability !== "future").map((d) => {
    const defaultOn = presetSet.has(d.id);
    const currentOn = ctx.usesCapabilityEngine
      ? hasCapability(ctx, d.id)
      : true;
    return {
      capability: d.id,
      module: d.label,
      description: d.description,
      defaultOn,
      currentOn,
      origin: ctx.usesCapabilityEngine
        ? originForCapability(presetSet, ctx.config, d.id)
        : "segment",
      overridable: d.overridable,
      availability: d.availability,
      statusReal: d.defaultStatus,
      navIds: d.navIds,
    };
  });
}
