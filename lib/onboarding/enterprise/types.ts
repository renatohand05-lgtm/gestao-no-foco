import type { CompanyProfile } from "@/config/onboarding/company-fields";
import type { EnterpriseOnboardingStepId } from "@/config/onboarding/flow";
import type { EnterpriseSegmentId } from "@/config/onboarding/segments";
import type { ImportChannelId } from "@/config/onboarding/import-channels";
import type { ImplantationItemId } from "@/config/onboarding/implantation-checklist";

export const ENTERPRISE_META_KEY = "enterprise30_3" as const;
export const ENTERPRISE_META_VERSION = 1 as const;

export type EnterpriseOnboardingMeta = {
  version: typeof ENTERPRISE_META_VERSION;
  step: EnterpriseOnboardingStepId;
  segmentId: EnterpriseSegmentId | null;
  company: CompanyProfile;
  templatesAcknowledged: boolean;
  checklistMarked: ImplantationItemId[];
  importChannelsInterest: ImportChannelId[];
  completedAt: string | null;
  updatedAt: string | null;
};

export type EnterpriseSessionView = {
  meta: EnterpriseOnboardingMeta;
  tenantName: string;
  tenantSegment: string | null;
  logoUrl: string | null;
};
