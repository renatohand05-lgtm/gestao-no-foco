import type {
  OnboardingProgressRecord,
  OnboardingStepId,
} from "@/lib/onboarding/onboarding-types";

type Row = {
  id: string;
  tenant_id: string;
  user_id: string;
  current_step: string;
  skipped_steps: string[] | null;
  preferred_preset_key: string | null;
  tour_dismissed_at: string | null;
  checklist_dismissed_at: string | null;
  completed_at: string | null;
  version: number;
};

export function mapProgressRow(row: Row): OnboardingProgressRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    currentStep: (row.current_step || "welcome") as OnboardingStepId,
    skippedSteps: (row.skipped_steps ?? []) as OnboardingStepId[],
    preferredPresetKey: row.preferred_preset_key,
    tourDismissedAt: row.tour_dismissed_at,
    checklistDismissedAt: row.checklist_dismissed_at,
    completedAt: row.completed_at,
    version: row.version,
  };
}
