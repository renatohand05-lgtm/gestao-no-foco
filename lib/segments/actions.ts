"use server";

import { revalidatePath } from "next/cache";

import {
  canonicalizeCapability,
  isProductCapability,
} from "@/lib/segments/capabilities.ts";
import {
  canEnableCapability,
  configAfterSegmentChange,
  resetSegmentConfig,
  setCapabilityOverride,
} from "@/lib/segments/overrides.ts";
import { resolveSegmentContext } from "@/lib/segments/resolve.ts";
import {
  isProductSegmentId,
  parseSegmentConfig,
  SEGMENT_ENGINE_VERSION,
  type ProductSegmentId,
} from "@/lib/segments/types.ts";
import type { Database, Json } from "@/types/database";
import {
  isMutationAuthError,
  requireTenantMutationPermission,
} from "@/lib/rbac/mutation-auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action-result";
import { actionFail, actionOk } from "@/types/action-result";

const MODULE_PERMS = [
  "configuracoes.editar",
  "configuracoes.tenant",
] as const;

function fail(err: unknown): ActionResult {
  if (isMutationAuthError(err)) {
    return actionFail(err.message);
  }
  return actionFail(
    err instanceof Error ? err.message : "Não foi possível salvar.",
  );
}

function revalidateTenant(slug: string) {
  revalidatePath(`/${slug}`);
  revalidatePath(`/${slug}/configuracoes`);
  revalidatePath(`/${slug}/configuracoes/modulos`);
}

type TenantUpdate = Database["public"]["Tables"]["tenants"]["Update"];

function asJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

async function persistConfig(tenantId: string, patch: TenantUpdate) {
  const supabase = await createClient();
  const { error } = await supabase.from("tenants").update(patch).eq("id", tenantId);
  if (!error) return;
  const legacy: TenantUpdate = {};
  if (typeof patch.segment === "string") legacy.segment = patch.segment;
  if (typeof patch.name === "string") legacy.name = patch.name;
  if (Object.keys(legacy).length) {
    await supabase.from("tenants").update(legacy).eq("id", tenantId);
  }
}

export async function toggleTenantCapabilityAction(input: {
  tenantSlug: string;
  capability: string;
  enabled: boolean;
}): Promise<ActionResult> {
  try {
    const { tenant } = await requireTenantMutationPermission(
      input.tenantSlug,
      MODULE_PERMS,
    );
    const cap = canonicalizeCapability(input.capability);
    if (!cap || !isProductCapability(cap)) {
      return actionFail("Capability inválida.");
    }
    if (input.enabled && !canEnableCapability(cap)) {
      return actionFail("Esta funcionalidade ainda não está disponível.");
    }
    const ctx = resolveSegmentContext({
      segment: tenant.segment,
      segmentVersion: tenant.segment_version,
      segmentConfig: tenant.segment_config,
    });
    const preset = ctx.profile?.capabilities ?? [];
    const next = setCapabilityOverride(
      preset,
      ctx.config,
      cap,
      input.enabled,
    );
    await persistConfig(tenant.id, { segment_config: asJson(next) });
    revalidateTenant(tenant.slug);
    return actionOk();
  } catch (err) {
    return fail(err);
  }
}

export async function resetTenantSegmentPresetAction(input: {
  tenantSlug: string;
}): Promise<ActionResult> {
  try {
    const { tenant } = await requireTenantMutationPermission(
      input.tenantSlug,
      MODULE_PERMS,
    );
    await persistConfig(tenant.id, {
      segment_config: asJson(resetSegmentConfig()),
    });
    revalidateTenant(tenant.slug);
    return actionOk();
  } catch (err) {
    return fail(err);
  }
}

export async function changeTenantSegmentAction(input: {
  tenantSlug: string;
  segment: string;
  resetOverrides?: boolean;
}): Promise<ActionResult> {
  try {
    const { tenant } = await requireTenantMutationPermission(
      input.tenantSlug,
      MODULE_PERMS,
    );
    if (!isProductSegmentId(input.segment)) {
      return actionFail("Tipo de negócio inválido.");
    }
    const nextSegment = input.segment as ProductSegmentId;
    const previous = parseSegmentConfig(tenant.segment_config);
    const config = configAfterSegmentChange(
      previous,
      input.resetOverrides === false ? "preserve" : "reset",
    );
    await persistConfig(tenant.id, {
      segment: nextSegment,
      segment_version: SEGMENT_ENGINE_VERSION,
      segment_config: asJson(config),
    });
    revalidateTenant(tenant.slug);
    return actionOk();
  } catch (err) {
    return fail(err);
  }
}

