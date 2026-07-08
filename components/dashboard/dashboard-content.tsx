import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity-feed";
import { SetupChecklist } from "@/components/dashboard/setup-checklist";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { WeeklyOverview } from "@/components/dashboard/weekly-overview";
import type { DashboardData } from "@/types/dashboard";

type DashboardContentProps = {
  data: DashboardData;
};

export function DashboardContent({ data }: DashboardContentProps) {
  return (
    <div className="space-y-6 lg:space-y-8">
      <DashboardHeader
        greeting={data.greeting}
        subtitle={data.subtitle}
        periodLabel={data.periodLabel}
      />

      <StatsGrid stats={data.stats} />

      <WeeklyOverview data={data.weeklyOverview} />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RecentActivityFeed activities={data.activities} />
        </div>
        <div className="space-y-6">
          <AlertsPanel alerts={data.alerts} />
          <SetupChecklist steps={data.setupSteps} />
        </div>
      </div>
    </div>
  );
}
