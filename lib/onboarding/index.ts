export type {
  OnboardingStepId,
  OnboardingChecklistId,
  OnboardingStepDefinition,
  OnboardingChecklistItem,
  OnboardingChecklistResult,
  OnboardingProgressRecord,
  OnboardingSessionView,
} from "@/lib/onboarding/onboarding-types";

export {
  ONBOARDING_STEPS,
  getStepDefinition,
  orderedStepIds,
  segmentCopy,
  personaCopy,
  suggestedPresetForSegment,
} from "@/lib/onboarding/onboarding-steps";

export {
  computeNextStep,
  buildProgressMessage,
  isOnboardingComplete,
  estimatedMinutesRemaining,
} from "@/lib/onboarding/onboarding-engine";

export {
  createTenantWithOwner,
  slugifyTenantName,
  getTenantSlugConflictMessage,
} from "@/lib/onboarding/create-tenant";

export {
  humanizeOnboardingError,
  progressCorruptedMessage,
  validateStepNavigation,
} from "@/lib/onboarding/onboarding-validation";

export { ONBOARDING_SCHEMA_VERSION } from "@/lib/onboarding/onboarding-types";
