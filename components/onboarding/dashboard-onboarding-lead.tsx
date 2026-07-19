import { OnboardingResumeCard } from "@/components/onboarding/onboarding-resume-card";
import { getOnboardingSession } from "@/lib/onboarding/actions";

/**
 * Banner soft no Dashboard — Design Freeze preservado (sem tocar Hero/KPIs).
 */
export async function DashboardOnboardingLead({
  tenantSlug,
}: {
  tenantSlug: string;
}) {
  const session = await getOnboardingSession(tenantSlug);
  if (!session) return null;
  if (session.progress?.checklistDismissedAt) return null;
  if (session.progress?.completedAt && session.checklist.dashboardReady) {
    return null;
  }
  if (session.checklist.dashboardReady && session.checklist.progressPct >= 100) {
    return null;
  }

  return (
    <OnboardingResumeCard
      tenantSlug={tenantSlug}
      checklist={session.checklist}
      message={session.message}
    />
  );
}
