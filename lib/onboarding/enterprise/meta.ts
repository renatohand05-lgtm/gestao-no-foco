import { mergeCompanyProfile } from "@/config/onboarding/company-fields";
import type { EnterpriseOnboardingStepId } from "@/config/onboarding/flow";
import { isEnterpriseSegmentId } from "@/config/onboarding/segments";
import type { ImportChannelId } from "@/config/onboarding/import-channels";
import type { ImplantationItemId } from "@/config/onboarding/implantation-checklist";
import {
  ENTERPRISE_META_KEY,
  ENTERPRISE_META_VERSION,
  type EnterpriseOnboardingMeta,
} from "@/lib/onboarding/enterprise/types";

export function emptyEnterpriseMeta(
  step: EnterpriseOnboardingStepId = "welcome",
): EnterpriseOnboardingMeta {
  return {
    version: ENTERPRISE_META_VERSION,
    step,
    segmentId: null,
    company: mergeCompanyProfile(null),
    templatesAcknowledged: false,
    checklistMarked: [],
    importChannelsInterest: [],
    completedAt: null,
    updatedAt: null,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseChecklist(value: unknown): ImplantationItemId[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is ImplantationItemId => typeof v === "string");
}

function parseImportChannels(value: unknown): ImportChannelId[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is ImportChannelId => typeof v === "string");
}

export function parseEnterpriseMeta(
  meta: unknown,
): EnterpriseOnboardingMeta {
  const root = asRecord(meta) ?? {};
  const raw = asRecord(root[ENTERPRISE_META_KEY]) ?? asRecord(meta);
  if (!raw || raw.version !== ENTERPRISE_META_VERSION) {
    return emptyEnterpriseMeta();
  }

  const segmentRaw = typeof raw.segmentId === "string" ? raw.segmentId : null;
  const step =
    typeof raw.step === "string"
      ? (raw.step as EnterpriseOnboardingStepId)
      : "welcome";

  return {
    version: ENTERPRISE_META_VERSION,
    step,
    segmentId: isEnterpriseSegmentId(segmentRaw) ? segmentRaw : null,
    company: mergeCompanyProfile(
      asRecord(raw.company) as Parameters<typeof mergeCompanyProfile>[0],
    ),
    templatesAcknowledged: Boolean(raw.templatesAcknowledged),
    checklistMarked: parseChecklist(raw.checklistMarked),
    importChannelsInterest: parseImportChannels(raw.importChannelsInterest),
    completedAt: typeof raw.completedAt === "string" ? raw.completedAt : null,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
  };
}

export function mergeEnterpriseMetaIntoRow(
  existingMeta: unknown,
  enterprise: EnterpriseOnboardingMeta,
): Record<string, unknown> {
  const root = asRecord(existingMeta) ?? {};
  return {
    ...root,
    [ENTERPRISE_META_KEY]: {
      ...enterprise,
      updatedAt: new Date().toISOString(),
    },
  };
}
