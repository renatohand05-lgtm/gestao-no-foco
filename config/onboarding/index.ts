export {
  ENTERPRISE_SEGMENTS,
  getEnterpriseSegment,
  isEnterpriseSegmentId,
  searchEnterpriseSegments,
  toNavSegmentId,
  listProductOnboardingSegments,
  PRODUCT_ONBOARDING_SEGMENT_IDS,
  type EnterpriseSegmentDef,
  type EnterpriseSegmentId,
  type NavSegmentId,
} from "./segments.ts";

export {
  getSegmentSetup,
  type SegmentModuleKey,
  type SegmentSetup,
} from "./segment-setup.ts";

export {
  getSegmentTemplatePack,
  listTemplateCategories,
  type OnboardingTemplateItem,
  type SegmentTemplatePack,
  type TemplateCategory,
} from "./templates.ts";

export {
  IMPLANTATION_CHECKLIST,
  implantationProgressPct,
  type ImplantationChecklistItem,
  type ImplantationItemId,
} from "./implantation-checklist.ts";

export {
  IMPORT_CHANNELS,
  getImportChannel,
  type ImportChannelDef,
  type ImportChannelId,
} from "./import-channels.ts";

export {
  ENTERPRISE_AVG_MINUTES,
  ENTERPRISE_ONBOARDING_FLOW,
  enterpriseProgressPct,
  enterpriseStepIndex,
  nextEnterpriseStep,
  prevEnterpriseStep,
  type EnterpriseFlowStep,
  type EnterpriseOnboardingStepId,
} from "./flow.ts";

export {
  COMPANY_FIELDS,
  EMPTY_COMPANY_PROFILE,
  mergeCompanyProfile,
  type CompanyFieldDef,
  type CompanyProfile,
  type TaxRegime,
} from "./company-fields.ts";
