import { DashboardActivities } from "@/components/dashboard/dashboard-activities";
import {
  DashboardAlertsPanel,
  DashboardPriorities,
} from "@/components/dashboard/dashboard-alerts-panel";
import { DashboardChecklist } from "@/components/dashboard/dashboard-checklist";
import { DashboardHealthScore } from "@/components/dashboard/dashboard-health-score";
import {
  dsElevation,
  dsGrid,
  dsSpace,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { DashboardIntelligenceResult } from "@/types/intelligence";

type DashboardIntelligenceSectionProps = {
  intelligence: DashboardIntelligenceResult;
};

export function DashboardIntelligenceSection({
  intelligence,
}: DashboardIntelligenceSectionProps) {
  return (
    <>
      <DashboardPriorities items={intelligence.priorities} />

      <div className={dsGrid.intelligence}>
        <DashboardHealthScore health={intelligence.healthScore} />
        <DashboardChecklist checklist={intelligence.checklist} />
      </div>

      <div className={dsGrid.twoCol}>
        <DashboardAlertsPanel alerts={intelligence.alerts} />
        <DashboardActivities activities={intelligence.activities} />
      </div>
    </>
  );
}

export function DashboardIntelligenceSectionSkeleton() {
  return (
    <div className={dsSpace.section} aria-busy="true">
      <div className={cn(dsElevation.skeleton, "h-28")} />
      <div className={dsGrid.intelligence}>
        <div className={cn(dsElevation.skeleton, "h-72")} />
        <div className={cn(dsElevation.skeleton, "h-72")} />
      </div>
    </div>
  );
}
