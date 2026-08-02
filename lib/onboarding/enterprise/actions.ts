"use server";

import { revalidatePath } from "next/cache";

import type { CompanyProfile } from "@/config/onboarding/company-fields";
import type { EnterpriseOnboardingStepId } from "@/config/onboarding/flow";
import {
  getEnterpriseSegment,
  toNavSegmentId,
  type EnterpriseSegmentId,
} from "@/config/onboarding/segments";
import type { ImportChannelId } from "@/config/onboarding/import-channels";
import type { ImplantationItemId } from "@/config/onboarding/implantation-checklist";
import {
  emptyEnterpriseMeta,
  mergeEnterpriseMetaIntoRow,
  parseEnterpriseMeta,
} from "@/lib/onboarding/enterprise/meta";
import type {
  EnterpriseOnboardingMeta,
  EnterpriseSessionView,
} from "@/lib/onboarding/enterprise/types";
import {
  loadOnboardingProgress,
  upsertOnboardingProgress,
} from "@/lib/onboarding/onboarding-progress";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireTenant } from "@/lib/tenants";
import type { TenantSegment } from "@/types";

async function persistEnterpriseMeta(params: {
  tenantId: string;
  userId: string;
  meta: EnterpriseOnboardingMeta;
  existingRowMeta: Record<string, unknown>;
  markComplete?: boolean;
}) {
  const enterprise: EnterpriseOnboardingMeta = {
    ...params.meta,
    updatedAt: new Date().toISOString(),
    completedAt: params.markComplete
      ? new Date().toISOString()
      : params.meta.completedAt,
  };

  await upsertOnboardingProgress({
    tenantId: params.tenantId,
    userId: params.userId,
    patch: {
      meta: mergeEnterpriseMetaIntoRow(params.existingRowMeta, enterprise),
      preferredPresetKey: enterprise.segmentId
        ? `enterprise:${enterprise.segmentId}`
        : undefined,
      completedAt: params.markComplete
        ? new Date().toISOString()
        : undefined,
      currentStep: params.markComplete ? "dashboard" : undefined,
    },
  });

  return enterprise;
}

export async function getEnterpriseOnboardingSession(
  tenantSlug: string,
): Promise<EnterpriseSessionView | null> {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant(tenantSlug);
    const progress = await loadOnboardingProgress(tenant.id, user.id);
    const meta = parseEnterpriseMeta(progress?.meta ?? {});

    // Prefill trade name from tenant when empty
    if (!meta.company.tradeName && tenant.name) {
      meta.company.tradeName = tenant.name;
    }
    if (!meta.segmentId && tenant.segment) {
      const mapped = getEnterpriseSegment(tenant.segment);
      meta.segmentId = mapped.id;
    }

    return {
      meta,
      tenantName: tenant.name,
      tenantSegment: tenant.segment,
      logoUrl: tenant.logo_url,
    };
  } catch (err) {
    console.error("[getEnterpriseOnboardingSession]", err);
    return null;
  }
}

export async function saveEnterpriseOnboardingAction(input: {
  tenantSlug: string;
  step: EnterpriseOnboardingStepId;
  segmentId?: EnterpriseSegmentId | null;
  company?: Partial<CompanyProfile>;
  templatesAcknowledged?: boolean;
  checklistMarked?: ImplantationItemId[];
  importChannelsInterest?: ImportChannelId[];
  complete?: boolean;
}) {
  const user = await requireAuth();
  const tenant = await requireTenant(input.tenantSlug);
  const existing = await loadOnboardingProgress(tenant.id, user.id);
  const current = parseEnterpriseMeta(existing?.meta ?? emptyEnterpriseMeta());

  const next: EnterpriseOnboardingMeta = {
    ...current,
    step: input.step,
    segmentId:
      input.segmentId === undefined ? current.segmentId : input.segmentId,
    company: {
      ...current.company,
      ...(input.company ?? {}),
    },
    templatesAcknowledged:
      input.templatesAcknowledged === undefined
        ? current.templatesAcknowledged
        : input.templatesAcknowledged,
    checklistMarked:
      input.checklistMarked === undefined
        ? current.checklistMarked
        : input.checklistMarked,
    importChannelsInterest:
      input.importChannelsInterest === undefined
        ? current.importChannelsInterest
        : input.importChannelsInterest,
  };

  // Atualiza segmento canônico do tenant (nav) sem tocar módulos de negócio
  if (next.segmentId) {
    const navSegment = toNavSegmentId(next.segmentId) as TenantSegment;
    const supabase = await createClient();
    const patch: {
      segment: TenantSegment;
      name?: string;
      logo_url?: string | null;
    } = { segment: navSegment };

    const displayName =
      next.company.tradeName.trim() || next.company.legalName.trim();
    if (displayName && displayName !== tenant.name) {
      patch.name = displayName;
    }
    if (next.company.logoUrl.trim()) {
      patch.logo_url = next.company.logoUrl.trim();
    }

    await supabase.from("tenants").update(patch).eq("id", tenant.id);
  }

  const saved = await persistEnterpriseMeta({
    tenantId: tenant.id,
    userId: user.id,
    meta: next,
    existingRowMeta: existing?.meta ?? {},
    markComplete: Boolean(input.complete) || input.step === "complete",
  });

  revalidatePath(`/${input.tenantSlug}/primeiro-acesso`);
  revalidatePath(`/${input.tenantSlug}/dashboard`);
  revalidatePath(`/${input.tenantSlug}/configuracoes`);

  return { ok: true as const, meta: saved };
}

export async function resetEnterpriseOnboardingAction(tenantSlug: string) {
  const user = await requireAuth();
  const tenant = await requireTenant(tenantSlug);
  const existing = await loadOnboardingProgress(tenant.id, user.id);
  const blank = emptyEnterpriseMeta("welcome");

  await upsertOnboardingProgress({
    tenantId: tenant.id,
    userId: user.id,
    patch: {
      meta: mergeEnterpriseMetaIntoRow(existing?.meta ?? {}, blank),
      completedAt: null,
      currentStep: "welcome",
    },
  });

  revalidatePath(`/${tenantSlug}/primeiro-acesso`);
  return { ok: true as const };
}
