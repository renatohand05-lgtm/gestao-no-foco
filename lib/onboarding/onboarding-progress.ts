import "server-only";

import { createClient } from "@/lib/supabase/server";
import { mapProgressRow } from "@/lib/onboarding/onboarding-mappers";
import type {
  OnboardingProgressRecord,
  OnboardingStepId,
} from "@/lib/onboarding/onboarding-types";

type ProgressUpdate = {
  currentStep?: OnboardingStepId;
  skippedSteps?: OnboardingStepId[];
  preferredPresetKey?: string | null;
  tourDismissedAt?: string | null;
  checklistDismissedAt?: string | null;
  completedAt?: string | null;
};

/**
 * Persistência de progresso UI. Checklist continua derivado de dados reais.
 * Se a tabela ainda não existir no projeto remoto, retorna null sem quebrar.
 */
export async function loadOnboardingProgress(
  tenantId: string,
  userId: string,
): Promise<OnboardingProgressRecord | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("user_onboarding_progress" as never)
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !data) return null;
    return mapProgressRow(data as never);
  } catch {
    return null;
  }
}

export async function upsertOnboardingProgress(params: {
  tenantId: string;
  userId: string;
  patch: ProgressUpdate;
}): Promise<OnboardingProgressRecord | null> {
  try {
    const supabase = await createClient();
    const existing = await loadOnboardingProgress(
      params.tenantId,
      params.userId,
    );

    if (!existing) {
      const { data, error } = await supabase
        .from("user_onboarding_progress" as never)
        .insert({
          tenant_id: params.tenantId,
          user_id: params.userId,
          current_step: params.patch.currentStep ?? "welcome",
          skipped_steps: params.patch.skippedSteps ?? [],
          preferred_preset_key: params.patch.preferredPresetKey ?? null,
          tour_dismissed_at: params.patch.tourDismissedAt ?? null,
          checklist_dismissed_at: params.patch.checklistDismissedAt ?? null,
          completed_at: params.patch.completedAt ?? null,
        } as never)
        .select("*")
        .single();

      if (error || !data) return null;
      return mapProgressRow(data as never);
    }

    const { data, error } = await supabase
      .from("user_onboarding_progress" as never)
      .update({
        current_step: params.patch.currentStep ?? existing.currentStep,
        skipped_steps: params.patch.skippedSteps ?? existing.skippedSteps,
        preferred_preset_key:
          params.patch.preferredPresetKey === undefined
            ? existing.preferredPresetKey
            : params.patch.preferredPresetKey,
        tour_dismissed_at:
          params.patch.tourDismissedAt === undefined
            ? existing.tourDismissedAt
            : params.patch.tourDismissedAt,
        checklist_dismissed_at:
          params.patch.checklistDismissedAt === undefined
            ? existing.checklistDismissedAt
            : params.patch.checklistDismissedAt,
        completed_at:
          params.patch.completedAt === undefined
            ? existing.completedAt
            : params.patch.completedAt,
        version: existing.version + 1,
      } as never)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error || !data) return null;
    return mapProgressRow(data as never);
  } catch {
    return null;
  }
}
