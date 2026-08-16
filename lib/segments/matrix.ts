/**
 * Sprint 35.1 — Matriz módulo × capability × preset × override.
 */
import {
  CAPABILITY_DEFS,
  type CapabilityDef,
  type ModuleStatusReal,
} from "./capabilities.ts";
import { getSegmentUiCopy } from "./copy.ts";
import { originForCapability } from "./overrides.ts";
import {
  hasCapability,
  resolveSegmentContext,
  type ResolveSegmentInput,
} from "./resolve.ts";
import type { ResolvedSegmentContext } from "./types.ts";
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
  input: ResolveSegmentInput | ResolvedSegmentContext,
): SegmentModuleRow[] {
  const ctx =
    typeof input === "object" &&
    input !== null &&
    "usesCapabilityEngine" in input &&
    "terminology" in input
      ? (input as ResolvedSegmentContext)
      : resolveSegmentContext(input);
  const ui = getSegmentUiCopy(ctx);
  const preset = ctx.profile?.capabilities ?? [];
  const presetSet = new Set(preset);
  return CAPABILITY_DEFS.filter((d) => d.availability !== "future").map((d) => {
    const defaultOn = presetSet.has(d.id);
    const currentOn = ctx.usesCapabilityEngine
      ? hasCapability(ctx, d.id)
      : true;
    const presented = presentCapabilityRow(d.id, d.label, d.description, ui);
    return {
      capability: d.id,
      module: presented.module,
      description: presented.description,
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

function presentCapabilityRow(
  id: string,
  label: string,
  description: string,
  ui: ReturnType<typeof getSegmentUiCopy>,
): { module: string; description: string } {
  if (!ui.engine || ui.automotiveWorkflow) {
    return { module: label, description };
  }
  if (id === "work_orders") {
    return { module: ui.workOrders, description: ui.workOrdersHubDescription };
  }
  if (id === "workshop_mechanics" || id === "professionals") {
    return { module: ui.professionals, description: ui.professionalsDescription };
  }
  if (id === "service_checklist") {
    return {
      module: label,
      description: `Checklist vinculado aos ${ui.workOrders.toLowerCase()}`,
    };
  }
  if (id === "commissions") {
    return {
      module: label,
      description: `Comissão de ${ui.professionals.toLowerCase()}`,
    };
  }
  if (id === "vehicles") {
    return { module: label, description: "Cadastro de veículos" };
  }
  return { module: label, description };
}
