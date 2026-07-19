"use server";

import { revalidatePath } from "next/cache";

import {
  buildFirstValueChecklist,
} from "@/lib/onboarding/onboarding-checklist";
import {
  buildProgressMessage,
  computeNextStep,
  isOnboardingComplete,
} from "@/lib/onboarding/onboarding-engine";
import {
  loadOnboardingProgress,
  upsertOnboardingProgress,
} from "@/lib/onboarding/onboarding-progress";
import { suggestedPresetForSegment } from "@/lib/onboarding/onboarding-steps";
import type {
  OnboardingSessionView,
  OnboardingStepId,
} from "@/lib/onboarding/onboarding-types";
import { requireAuth, requireTenant } from "@/lib/tenants";
import { createClient } from "@/lib/supabase/server";

export async function getOnboardingSession(
  tenantSlug: string,
): Promise<OnboardingSessionView | null> {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant(tenantSlug);
    const supabase = await createClient();

    const [checklist, progress] = await Promise.all([
      buildFirstValueChecklist({
        supabase,
        tenantId: tenant.id,
        tenantSlug,
        tenantName: tenant.name,
        segment: tenant.segment,
      }),
      loadOnboardingProgress(tenant.id, user.id),
    ]);

    const nextStep = computeNextStep({
      current: progress?.currentStep ?? "welcome",
      skipped: progress?.skippedSteps ?? [],
      checklist,
    });

    return {
      progress,
      checklist,
      nextStep,
      message: buildProgressMessage(checklist),
    };
  } catch (err) {
    console.error("[getOnboardingSession]", err);
    return null;
  }
}

export async function saveOnboardingStepAction(input: {
  tenantSlug: string;
  step: OnboardingStepId;
  skip?: boolean;
}) {
  const user = await requireAuth();
  const tenant = await requireTenant(input.tenantSlug);
  const existing = await loadOnboardingProgress(tenant.id, user.id);
  const skipped = new Set(existing?.skippedSteps ?? []);
  if (input.skip) skipped.add(input.step);

  const checklist = await buildFirstValueChecklist({
    supabase: await createClient(),
    tenantId: tenant.id,
    tenantSlug: input.tenantSlug,
    tenantName: tenant.name,
    segment: tenant.segment,
  });

  const next = computeNextStep({
    current: input.step,
    skipped: Array.from(skipped),
    checklist,
  });

  const completed =
    isOnboardingComplete(existing, checklist) || input.step === "dashboard"
      ? new Date().toISOString()
      : existing?.completedAt ?? null;

  await upsertOnboardingProgress({
    tenantId: tenant.id,
    userId: user.id,
    patch: {
      currentStep: next,
      skippedSteps: Array.from(skipped),
      preferredPresetKey:
        existing?.preferredPresetKey ??
        suggestedPresetForSegment(tenant.segment),
      completedAt: completed,
    },
  });

  revalidatePath(`/${input.tenantSlug}/primeiro-acesso`);
  revalidatePath(`/${input.tenantSlug}/dashboard`);
  return { ok: true as const, nextStep: next };
}

export async function dismissOnboardingChecklistAction(tenantSlug: string) {
  const user = await requireAuth();
  const tenant = await requireTenant(tenantSlug);
  await upsertOnboardingProgress({
    tenantId: tenant.id,
    userId: user.id,
    patch: {
      checklistDismissedAt: new Date().toISOString(),
    },
  });
  revalidatePath(`/${tenantSlug}/dashboard`);
  return { ok: true as const };
}

export async function dismissOnboardingTourAction(tenantSlug: string) {
  const user = await requireAuth();
  const tenant = await requireTenant(tenantSlug);
  await upsertOnboardingProgress({
    tenantId: tenant.id,
    userId: user.id,
    patch: {
      tourDismissedAt: new Date().toISOString(),
    },
  });
  revalidatePath(`/${tenantSlug}/primeiro-acesso`);
  return { ok: true as const };
}

export async function completeOnboardingAction(tenantSlug: string) {
  const user = await requireAuth();
  const tenant = await requireTenant(tenantSlug);
  await upsertOnboardingProgress({
    tenantId: tenant.id,
    userId: user.id,
    patch: {
      currentStep: "dashboard",
      completedAt: new Date().toISOString(),
    },
  });
  revalidatePath(`/${tenantSlug}/dashboard`);
  revalidatePath(`/${tenantSlug}/primeiro-acesso`);
  return { ok: true as const };
}

export async function resetOnboardingAction(tenantSlug: string) {
  const user = await requireAuth();
  const tenant = await requireTenant(tenantSlug);
  await upsertOnboardingProgress({
    tenantId: tenant.id,
    userId: user.id,
    patch: {
      currentStep: "welcome",
      skippedSteps: [],
      tourDismissedAt: null,
      checklistDismissedAt: null,
      completedAt: null,
    },
  });
  revalidatePath(`/${tenantSlug}/dashboard`);
  revalidatePath(`/${tenantSlug}/primeiro-acesso`);
  return { ok: true as const };
}
